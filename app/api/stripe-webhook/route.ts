import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  sendEmail,
  escapeHtml,
  templateConfirmationAcheteur,
  templateNotificationVendeur,
} from "@/lib/email";
import { COMMISSION_RATE } from "@/lib/constants";

export const dynamic = "force-dynamic";

// ── Helpers ──

function getSupabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

const emailWrapper = (body: string) => `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #111827; padding: 24px;">
  ${body}
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;" />
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
    Cet email vous a été envoyé par <a href="https://www.quicklot.fr" style="color: #FF7D07; text-decoration: none;">Quicklot</a>.
  </p>
</div>
`;

// ── processCompletedCheckout ──
// Logique commune pour checkout.session.completed et async_payment_succeeded.

async function processCompletedCheckout(
  session: Stripe.Checkout.Session,
  supabaseAdmin: SupabaseClient
): Promise<{ ok: boolean; error?: string; deduplicated?: boolean }> {
  const metadata = session.metadata ?? {};
  console.log("[stripe-webhook] processCompletedCheckout session:", session.id, "metadata:", metadata);

  const { listingId, buyerId, sellerId, shipping_mode } = metadata;

  if (!listingId || !buyerId || !sellerId) {
    console.error("[stripe-webhook] MISSING METADATA on session", session.id, metadata);
    return { ok: false, error: "Metadata manquante dans la session" };
  }

  // Anti-doublon
  const { data: existing } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (existing) {
    console.log("[stripe-webhook] order already exists, skipping insert:", session.id);
    return { ok: true, deduplicated: true };
  }

  const amount = (session.amount_total ?? 0) / 100;
  const amountHt = parseFloat(metadata.prix_ht ?? "0");
  const commission_amount = Math.round(amountHt * COMMISSION_RATE * 100) / 100;
  const seller_amount = Math.round((amount - commission_amount) * 100) / 100;

  const insertPayload: Record<string, unknown> = {
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

  // Stocker le payment_intent si disponible
  if (session.payment_intent) {
    const pi = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent.id;
    insertPayload.stripe_payment_intent = pi;
  }

  console.log("[stripe-webhook] inserting order:", JSON.stringify(insertPayload));

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
    return { ok: false, error: insertError.message };
  }

  if (!insertedRows || insertedRows.length === 0) {
    console.error("[stripe-webhook] INSERT ORDER returned 0 rows");
    return { ok: false, error: "Insert retourna 0 rangée" };
  }

  console.log("[stripe-webhook] order created:", (insertedRows[0] as { id?: string }).id);

  // Marquer le listing comme vendu (pending_payment → sold ou active → sold)
  const { error: listingUpdateError } = await supabaseAdmin
    .from("listings")
    .update({ status: "sold", sold_at: new Date().toISOString(), pending_until: null })
    .eq("id", listingId)
    .in("status", ["active", "pending_payment"])
    .select();

  if (listingUpdateError) {
    console.error("[stripe-webhook] update listing as sold error:", listingUpdateError);
  } else {
    console.log("[stripe-webhook] listing marked as sold:", listingId);
  }

  // Emails (best-effort)
  try {
    const [buyerRes, sellerRes, listingRes] = await Promise.all([
      supabaseAdmin.from("users").select("email, prenom").eq("id", buyerId).maybeSingle(),
      supabaseAdmin.from("users").select("email, prenom").eq("id", sellerId).maybeSingle(),
      supabaseAdmin.from("listings").select("titre").eq("id", listingId).maybeSingle(),
    ]);

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

  return { ok: true };
}

// ── Main handler ──

export async function POST(request: NextRequest) {
  console.log("[stripe-webhook] ── incoming request ──");

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
    console.error("[stripe-webhook] SUPABASE_SERVICE_ROLE_KEY looks invalid");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabaseAdmin = getSupabaseAdmin();

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    console.error("[stripe-webhook] missing stripe-signature header");
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();
  console.log("[stripe-webhook] raw body length:", rawBody.length);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log("[stripe-webhook] event type:", event.type, "id:", event.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "signature invalide";
    console.error("[stripe-webhook] signature verification FAILED:", message);
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  // ── account.updated ──
  if (event.type === "account.updated") {
    try {
      const account = event.data.object as Stripe.Account;
      console.log("[stripe-webhook] account.updated:", {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      });

      const newStatus = account.charges_enabled && account.payouts_enabled ? "active" : "pending";
      const { error: updateErr } = await supabaseAdmin
        .from("users")
        .update({ stripe_account_status: newStatus })
        .eq("stripe_account_id", account.id)
        .select();

      if (updateErr) {
        console.error("[stripe-webhook] account.updated DB error:", updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      return NextResponse.json({ received: true, stripe_account_status: newStatus });
    } catch (err) {
      console.error("[stripe-webhook] account.updated exception:", err);
      return NextResponse.json({ received: true, error: "account.updated handler failed" });
    }
  }

  // ── checkout.session.completed ──
  if (event.type === "checkout.session.completed") {
    try {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") {
        console.log("[stripe-webhook] payment_status not paid, waiting for async payment:", session.id);
        return NextResponse.json({ received: true, ignored: "payment_pending" });
      }
      const result = await processCompletedCheckout(session, supabaseAdmin);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.error?.includes("Metadata") ? 400 : 500 });
      }
      return NextResponse.json({ received: true, deduplicated: result.deduplicated ?? false });
    } catch (err) {
      console.error("[stripe-webhook] checkout.session.completed exception:", err);
      return NextResponse.json({ received: true, error: "checkout.session.completed handler failed" });
    }
  }

  // ── checkout.session.async_payment_succeeded ──
  if (event.type === "checkout.session.async_payment_succeeded") {
    try {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("[stripe-webhook] async_payment_succeeded for session:", session.id);
      const result = await processCompletedCheckout(session, supabaseAdmin);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ received: true, deduplicated: result.deduplicated ?? false });
    } catch (err) {
      console.error("[stripe-webhook] async_payment_succeeded exception:", err);
      return NextResponse.json({ received: true, error: "async_payment_succeeded handler failed" });
    }
  }

  // ── checkout.session.async_payment_failed ──
  if (event.type === "checkout.session.async_payment_failed") {
    try {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("[stripe-webhook] async_payment_failed for session:", session.id);

      // Annuler l'order si elle existe
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, buyer_id, listing_id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      if (order) {
        await supabaseAdmin
          .from("orders")
          .update({ statut: "cancelled" })
          .eq("id", (order as { id: string }).id);

        // Remettre le listing en vente
        await supabaseAdmin
          .from("listings")
          .update({ status: "active", pending_until: null })
          .eq("id", (order as { listing_id: string }).listing_id)
          .in("status", ["pending_payment", "sold"]);
      } else {
        // Pas d'order mais peut-être un listing verrouillé
        const listingId = session.metadata?.listingId;
        if (listingId) {
          await supabaseAdmin
            .from("listings")
            .update({ status: "active", pending_until: null })
            .eq("id", listingId)
            .eq("status", "pending_payment");
        }
      }

      // Notifier l'acheteur
      const buyerId = order
        ? (order as { buyer_id: string }).buyer_id
        : session.metadata?.buyerId;

      if (buyerId) {
        const { data: buyer } = await supabaseAdmin
          .from("users")
          .select("email, prenom")
          .eq("id", buyerId)
          .maybeSingle();

        if (buyer && (buyer as { email?: string }).email) {
          const prenom = (buyer as { prenom?: string | null }).prenom;
          const html = emailWrapper(`
            <h1 style="color: #dc2626; font-size: 22px; margin: 0 0 16px;">Paiement échoué</h1>
            <p>Bonjour${prenom ? ` ${escapeHtml(prenom)}` : ""},</p>
            <p>Votre paiement pour votre commande sur Quicklot n'a pas abouti. Le listing a été remis en vente.</p>
            <p>Si vous souhaitez retenter l'achat, rendez-vous sur la page du listing.</p>
          `);
          await sendEmail(
            (buyer as { email: string }).email,
            "Paiement échoué — Quicklot",
            html
          );
        }
      }

      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("[stripe-webhook] async_payment_failed exception:", err);
      return NextResponse.json({ received: true, error: "async_payment_failed handler failed" });
    }
  }

  // ── checkout.session.expired ──
  if (event.type === "checkout.session.expired") {
    try {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("[stripe-webhook] checkout.session.expired:", session.id);

      const listingId = session.metadata?.listingId;
      if (listingId) {
        const { data } = await supabaseAdmin
          .from("listings")
          .update({ status: "active", pending_until: null })
          .eq("id", listingId)
          .eq("status", "pending_payment")
          .select();

        console.log("[stripe-webhook] expired: released", data?.length ?? 0, "listing(s)");
      }

      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("[stripe-webhook] checkout.session.expired exception:", err);
      return NextResponse.json({ received: true, error: "expired handler failed" });
    }
  }

  // ── charge.refunded ──
  if (event.type === "charge.refunded") {
    try {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntent = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;

      console.log("[stripe-webhook] charge.refunded, pi:", paymentIntent);

      if (!paymentIntent) {
        console.error("[stripe-webhook] charge.refunded: no payment_intent");
        return NextResponse.json({ received: true, ignored: "no_pi" });
      }

      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, buyer_id, seller_id, listing_id, amount")
        .eq("stripe_payment_intent", paymentIntent)
        .maybeSingle();

      if (!order) {
        console.error("[stripe-webhook] charge.refunded: order not found for pi:", paymentIntent);
        return NextResponse.json({ received: true, ignored: "order_not_found" });
      }

      const o = order as { id: string; buyer_id: string; seller_id: string; listing_id: string; amount: number };
      const isFullRefund = charge.refunded; // true si refund complet
      const newStatut = isFullRefund ? "refunded" : "partial_refund";

      await supabaseAdmin
        .from("orders")
        .update({ statut: newStatut })
        .eq("id", o.id);

      console.log("[stripe-webhook] order", o.id, "→", newStatut);

      // Remise en vente si refund complet
      if (isFullRefund) {
        await supabaseAdmin
          .from("listings")
          .update({ status: "active", pending_until: null })
          .eq("id", o.listing_id)
          .eq("status", "sold");

        console.log("[stripe-webhook] listing", o.listing_id, "remis en active (full refund)");
      }

      // Notifier buyer et seller
      const [{ data: buyer }, { data: seller }, { data: listing }] = await Promise.all([
        supabaseAdmin.from("users").select("email, prenom").eq("id", o.buyer_id).maybeSingle(),
        supabaseAdmin.from("users").select("email, prenom").eq("id", o.seller_id).maybeSingle(),
        supabaseAdmin.from("listings").select("titre").eq("id", o.listing_id).maybeSingle(),
      ]);

      const titre = (listing as { titre?: string } | null)?.titre ?? "votre lot";
      const refundAmountEur = (charge.amount_refunded / 100).toFixed(2);
      const refundType = isFullRefund ? "intégral" : "partiel";

      if (buyer && (buyer as { email?: string }).email) {
        const prenom = (buyer as { prenom?: string | null }).prenom;
        const html = emailWrapper(`
          <h1 style="color: #FF7D07; font-size: 22px; margin: 0 0 16px;">Remboursement ${refundType} confirmé</h1>
          <p>Bonjour${prenom ? ` ${escapeHtml(prenom)}` : ""},</p>
          <p>Un remboursement ${refundType} de <strong>${refundAmountEur} €</strong> a été effectué pour votre commande <strong>${escapeHtml(titre)}</strong>.</p>
          <p>Le montant sera crédité sur votre moyen de paiement dans les prochains jours.</p>
        `);
        await sendEmail(
          (buyer as { email: string }).email,
          `Remboursement ${refundType} — Quicklot`,
          html
        );
      }

      if (seller && (seller as { email?: string }).email) {
        const prenom = (seller as { prenom?: string | null }).prenom;
        const html = emailWrapper(`
          <h1 style="color: #FF7D07; font-size: 22px; margin: 0 0 16px;">Remboursement ${refundType}</h1>
          <p>Bonjour${prenom ? ` ${escapeHtml(prenom)}` : ""},</p>
          <p>Un remboursement ${refundType} de <strong>${refundAmountEur} €</strong> a été effectué sur la commande <strong>${escapeHtml(titre)}</strong>.</p>
          ${isFullRefund ? "<p>Le listing a été remis en vente automatiquement.</p>" : ""}
        `);
        await sendEmail(
          (seller as { email: string }).email,
          `Remboursement ${refundType} sur une commande — Quicklot`,
          html
        );
      }

      return NextResponse.json({ received: true, refund: refundType });
    } catch (err) {
      console.error("[stripe-webhook] charge.refunded exception:", err);
      return NextResponse.json({ received: true, error: "charge.refunded handler failed" });
    }
  }

  // ── charge.dispute.created ──
  if (event.type === "charge.dispute.created") {
    try {
      const dispute = event.data.object as Stripe.Dispute;
      const paymentIntent = typeof dispute.payment_intent === "string"
        ? dispute.payment_intent
        : dispute.payment_intent?.id;

      console.log("[stripe-webhook] charge.dispute.created, pi:", paymentIntent, "reason:", dispute.reason);

      if (!paymentIntent) {
        console.error("[stripe-webhook] dispute: no payment_intent");
        return NextResponse.json({ received: true, ignored: "no_pi" });
      }

      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, buyer_id, seller_id")
        .eq("stripe_payment_intent", paymentIntent)
        .maybeSingle();

      if (!order) {
        console.error("[stripe-webhook] dispute: order not found for pi:", paymentIntent);
        return NextResponse.json({ received: true, ignored: "order_not_found" });
      }

      const o = order as { id: string; buyer_id: string; seller_id: string };

      // Créer le litige dans la table disputes
      const { error: disputeInsertErr } = await supabaseAdmin
        .from("disputes")
        .insert({
          order_id: o.id,
          buyer_id: o.buyer_id,
          seller_id: o.seller_id,
          raison: "non_conformite",
          description: `[Stripe Dispute] ${dispute.reason}`,
          statut: "ouvert",
        });

      if (disputeInsertErr) {
        console.error("[stripe-webhook] dispute insert error:", disputeInsertErr);
      }

      // Notifier admin
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        const html = emailWrapper(`
          <h1 style="color: #dc2626; font-size: 22px; margin: 0 0 16px;">⚠️ Nouveau litige Stripe</h1>
          <p>Un litige a été ouvert sur Stripe pour la commande <strong>${escapeHtml(o.id.slice(0, 8))}…</strong>.</p>
          <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #991b1b;">Raison Stripe : ${escapeHtml(dispute.reason)}</p>
            <p style="margin: 0; color: #991b1b; font-size: 13px;">Payment Intent : ${escapeHtml(paymentIntent)}</p>
          </div>
          <p>Rendez-vous sur le dashboard Stripe et le panel admin Quicklot pour traiter ce litige.</p>
          <p style="margin-top: 20px;">
            <a href="https://www.quicklot.fr/admin" style="background: #FF7D07; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; display: inline-block;">Ouvrir le panel admin</a>
          </p>
        `);
        await sendEmail(adminEmail, "[Quicklot] Nouveau litige Stripe", html);
      }

      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("[stripe-webhook] charge.dispute.created exception:", err);
      return NextResponse.json({ received: true, error: "dispute handler failed" });
    }
  }

  return NextResponse.json({ received: true });
}
