import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { COMMISSION_RATE } from "@/lib/constants";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  listingId: z.string().uuid(),
  shippingChoice: z.enum(["enlevement", "france", "belgique", "amazon"]),
});

export async function POST(request: NextRequest) {
  try {
    // ── Authentification ──
    // Le client doit envoyer son access_token Supabase dans Authorization: Bearer
    const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentification requise." },
        { status: 401 }
      );
    }
    const accessToken = authHeader.slice(7).trim();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Token invalide." },
        { status: 401 }
      );
    }

    // Client anon pour vérifier le token
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user: authUser }, error: authError } = await supabaseAnon.auth.getUser(accessToken);
    if (authError || !authUser) {
      console.error("[create-checkout-session] auth.getUser failed:", authError);
      return NextResponse.json(
        { error: "Session invalide." },
        { status: 401 }
      );
    }

    // buyerId = identité serveur vérifiée, jamais ce que le client envoie
    const buyerId = authUser.id;

    // Client service role pour lire le listing (bypass RLS gaps)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // ── Lecture body ──
    const { listingId, shippingChoice } = BodySchema.parse(await request.json());

    // ── Fetch listing (service role) ──
    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select(
        "id, titre, prix, seller_id, status, enlevement_sur_place, livraison_france, prix_livraison_france, livraison_belgique, prix_livraison_belgique, preparation_amazon, preparation_amazon_type, prix_preparation_amazon"
      )
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      console.error("[create-checkout-session] listing not found:", listingError);
      return NextResponse.json({ error: "Listing introuvable." }, { status: 404 });
    }

    if (listing.status !== "active") {
      return NextResponse.json(
        { error: "Ce listing n'est plus disponible." },
        { status: 400 }
      );
    }

    // ── Verrou optimiste : pending_payment ──
    const { data: locked, error: lockErr } = await supabaseAdmin
      .from("listings")
      .update({
        status: "pending_payment",
        pending_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .eq("id", listingId)
      .eq("status", "active")
      .select();

    if (lockErr || !locked || locked.length === 0) {
      return NextResponse.json(
        { error: "Ce listing vient d'être verrouillé par un autre acheteur." },
        { status: 409 }
      );
    }

    // ── Empêcher l'auto-achat ──
    if (listing.seller_id === buyerId) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas acheter votre propre listing." },
        { status: 400 }
      );
    }

    // ── Vérifier que le vendeur a un compte Stripe Connect actif ──
    const { data: seller, error: sellerError } = await supabaseAdmin
      .from("users")
      .select("stripe_account_id, stripe_account_status, pays")
      .eq("id", listing.seller_id)
      .maybeSingle();

    if (sellerError) {
      console.error("[create-checkout-session] seller fetch error:", sellerError);
      return NextResponse.json({ error: "Erreur lecture vendeur." }, { status: 500 });
    }

    const sellerStripeAccountId =
      (seller as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null;
    const sellerStripeStatus =
      (seller as { stripe_account_status?: string | null } | null)?.stripe_account_status ?? null;

    if (sellerStripeStatus !== "active" || !sellerStripeAccountId) {
      return NextResponse.json(
        {
          error:
            "Ce vendeur n'a pas encore activé son compte de paiement. La vente n'est pas disponible.",
        },
        { status: 400 }
      );
    }

    // ── Validation du mode de livraison vs options disponibles ──
    let shippingCents = 0;
    let shippingLabel = "";
    if (shippingChoice === "enlevement") {
      if (!listing.enlevement_sur_place) {
        return NextResponse.json(
          { error: "Enlèvement non proposé par ce vendeur." },
          { status: 400 }
        );
      }
      shippingLabel = "Enlèvement sur place";
    } else if (shippingChoice === "france") {
      if (!listing.livraison_france || listing.prix_livraison_france == null) {
        return NextResponse.json(
          { error: "Livraison France non proposée par ce vendeur." },
          { status: 400 }
        );
      }
      shippingCents = Math.round(Number(listing.prix_livraison_france) * 100);
      shippingLabel = "Livraison France";
    } else if (shippingChoice === "belgique") {
      if (!listing.livraison_belgique || listing.prix_livraison_belgique == null) {
        return NextResponse.json(
          { error: "Livraison Belgique non proposée par ce vendeur." },
          { status: 400 }
        );
      }
      shippingCents = Math.round(Number(listing.prix_livraison_belgique) * 100);
      shippingLabel = "Livraison Belgique";
    } else {
      // amazon
      if (!listing.preparation_amazon) {
        return NextResponse.json(
          { error: "Préparation Amazon non proposée par ce vendeur." },
          { status: 400 }
        );
      }
      shippingLabel = "Préparation Amazon FBA";
      if (listing.preparation_amazon_type === "payante") {
        if (listing.prix_preparation_amazon == null) {
          return NextResponse.json(
            { error: "Prix de préparation Amazon manquant." },
            { status: 400 }
          );
        }
        shippingCents = Math.round(Number(listing.prix_preparation_amazon) * 100);
      }
    }

    // ── Montants ──
    const prixHtCents = Math.round(Number(listing.prix) * 100);
    const totalCents = prixHtCents + shippingCents;
    const applicationFeeCents = Math.round(prixHtCents * COMMISSION_RATE);
    const sellerAmountCents = totalCents - applicationFeeCents;
    const commissionHtCents = applicationFeeCents;

    const origin = request.headers.get("origin") ?? request.nextUrl.origin;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const lineItems = [
      {
        price_data: {
          currency: "eur",
          product_data: { name: listing.titre },
          unit_amount: prixHtCents,
          tax_behavior: "exclusive" as const,
        },
        quantity: 1,
      },
      ...(shippingCents > 0
        ? [
            {
              price_data: {
                currency: "eur",
                product_data: { name: shippingLabel },
                unit_amount: shippingCents,
                tax_behavior: "exclusive" as const,
              },
              quantity: 1,
            },
          ]
        : []),
    ];

    const metadata = {
      listingId: listing.id,
      buyerId,
      sellerId: listing.seller_id,
      commission_ht: (commissionHtCents / 100).toFixed(2),
      commission_amount: (applicationFeeCents / 100).toFixed(2),
      seller_amount: (sellerAmountCents / 100).toFixed(2),
      prix_ht: (prixHtCents / 100).toFixed(2),
      shipping_mode: shippingChoice,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      automatic_tax: { enabled: true },
      customer_creation: "always",
      tax_id_collection: { enabled: true },
      line_items: lineItems,
      success_url: `${origin}/achat/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/boutique/${listingId}`,
      metadata,
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
        transfer_data: {
          destination: sellerStripeAccountId,
        },
        metadata,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[create-checkout-session] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
