import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  sendEmail,
  templateConfirmationAcheteur,
  templateNotificationVendeur,
} from "@/lib/email";
import { COMMISSION_RATE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  console.log("[stripe-webhook] ── incoming request ──");

  // Sanity check env vars (sans leak des valeurs)
  const envCheck = {
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SERVICE_ROLE_LOOKS_VALID:
      !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY.length > 100 &&
      process.env.SUPABASE_SERVICE_ROLE_KEY !== process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  console.log("[stripe-webhook] env check:", envCheck);
  if (!envCheck.STRIPE_SECRET_KEY || !envCheck.STRIPE_WEBHOOK_SECRET || !envCheck.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[stripe-webhook] missing required env vars", envCheck);
    return NextResponse.json({ error: "missing env vars" }, { status: 500 });
  }
  if (!envCheck.SERVICE_ROLE_LOOKS_VALID) {
    console.error(
      "[stripe-webhook] SUPABASE_SERVICE_ROLE_KEY looks invalid (empty, too short, or equals anon key)"
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Service role client — bypasse la RLS pour pouvoir insérer l'order côté serveur
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    console.error("[stripe-webhook] missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  // Body brut requis pour la vérification de signature Stripe
  const rawBody = await request.text();
  console.log("[stripe-webhook] raw body length:", rawBody.length);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log("[stripe-webhook] signature verified. event type:", event.type, "id:", event.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "signature invalide";
    console.error("[stripe-webhook] signature verification FAILED:", message);
    return NextResponse.json(
      { error: `Webhook error: ${message}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata ?? {};
    console.log("[stripe-webhook] session.id:", session.id);
    console.log("[stripe-webhook] session metadata:", metadata);
    console.log("[stripe-webhook] session amount_total:", session.amount_total);
    console.log("[stripe-webhook] session payment_status:", session.payment_status);

    const { listingId, buyerId, sellerId, shipping_mode } = metadata;

    if (!listingId || !buyerId || !sellerId) {
      console.error("[stripe-webhook] MISSING METADATA on session", session.id, metadata);
      return NextResponse.json(
        { error: "Metadata manquante dans la session" },
        { status: 400 }
      );
    }

    // Anti-doublon : si une order existe déjà avec ce stripe_session_id, ne rien faire
    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    if (existing) {
      console.log("[stripe-webhook] order already exists, skipping insert:", session.id);
      return NextResponse.json({ received: true, deduplicated: true });
    }

    const amount = (session.amount_total ?? 0) / 100;
    const commission_amount = Math.round(amount * COMMISSION_RATE * 100) / 100;
    const seller_amount = Math.round((amount - commission_amount) * 100) / 100;

    const insertPayload = {
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      amount,
      commission_amount,
      seller_amount,
      stripe_session_id: session.id,
      statut: "paid",
      shipping_mode: shipping_mode ?? null,
    };
    console.log("[stripe-webhook] inserting order with payload:", JSON.stringify(insertPayload));

    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from("orders")
      .insert(insertPayload)
      .select();

    if (insertError) {
      console.error("[stripe-webhook] INSERT ORDER ERROR", {
        code: (insertError as { code?: string }).code,
        message: insertError.message,
        details: (insertError as { details?: string }).details,
        hint: (insertError as { hint?: string }).hint,
      });
      return NextResponse.json({ error: insertError.message, details: (insertError as { details?: string }).details }, { status: 500 });
    }

    if (!insertedRows || insertedRows.length === 0) {
      console.error("[stripe-webhook] INSERT ORDER returned 0 rows (possible RLS block — service role misconfigured?)");
      return NextResponse.json({ error: "Insert retourna 0 rangée (vérifier SUPABASE_SERVICE_ROLE_KEY)" }, { status: 500 });
    }

    console.log("[stripe-webhook] order created successfully. id:", (insertedRows[0] as { id?: string }).id, "session:", session.id);

    // Marquer le listing comme vendu
    const { error: listingUpdateError } = await supabaseAdmin
      .from("listings")
      .update({ status: "sold", sold_at: new Date().toISOString() })
      .eq("id", listingId)
      .select();

    if (listingUpdateError) {
      console.error("[stripe-webhook] update listing as sold error:", listingUpdateError);
      // on continue — l'order est créée, c'est le plus important
    } else {
      console.log("[stripe-webhook] listing marked as sold:", listingId);
    }

    // Envoi des emails de notification (best-effort, on continue si erreur)
    try {
      const [buyerRes, sellerRes, listingRes] = await Promise.all([
        supabaseAdmin.from("users").select("email, prenom").eq("id", buyerId).maybeSingle(),
        supabaseAdmin.from("users").select("email, prenom").eq("id", sellerId).maybeSingle(),
        supabaseAdmin.from("listings").select("titre").eq("id", listingId).maybeSingle(),
      ]);

      if (buyerRes.error) console.error("[stripe-webhook] buyer fetch error:", buyerRes.error);
      if (sellerRes.error) console.error("[stripe-webhook] seller fetch error:", sellerRes.error);
      if (listingRes.error) console.error("[stripe-webhook] listing fetch error:", listingRes.error);

      const buyer = buyerRes.data;
      const seller = sellerRes.data;
      const listing = listingRes.data;

      const titreListing = (listing as { titre?: string } | null)?.titre ?? "votre lot";

      if (buyer && (buyer as { email?: string }).email) {
        const { subject, html } = templateConfirmationAcheteur({
          prenom: (buyer as { prenom?: string | null }).prenom ?? null,
          titreListing,
          montant: amount,
        });
        await sendEmail((buyer as { email: string }).email, subject, html);
      }

      if (seller && (seller as { email?: string }).email) {
        const createdOrderId = (insertedRows[0] as { id?: string | null })?.id ?? null;
        const { subject, html } = templateNotificationVendeur({
          prenom: (seller as { prenom?: string | null }).prenom ?? null,
          titreListing,
          montant: amount,
          acheteurPrenom: (buyer as { prenom?: string | null } | null)?.prenom ?? null,
          orderId: createdOrderId,
        });
        await sendEmail((seller as { email: string }).email, subject, html);
      }
    } catch (emailErr) {
      console.error("[stripe-webhook] email notification error:", emailErr);
    }
  }

  return NextResponse.json({ received: true });
}
