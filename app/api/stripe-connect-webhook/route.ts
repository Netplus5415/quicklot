import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, escapeHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

const emailWrapper = (body: string) => `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #111827; padding: 24px;">
  ${body}
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;" />
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
    Cet email vous a été envoyé par <a href="https://www.quicklot.fr" style="color: #FF7D07; text-decoration: none;">Quicklot</a>.
  </p>
</div>
`;

export async function POST(request: NextRequest) {
  if (
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_CONNECT_WEBHOOK_SECRET ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error("[stripe-connect-webhook] missing env vars");
    return NextResponse.json({ error: "missing env vars" }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "signature invalide";
    console.error("[stripe-connect-webhook] signature verification FAILED:", message);
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  console.log("[stripe-connect-webhook] event:", event.type, "id:", event.id);

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // ── account.updated ──
  if (event.type === "account.updated") {
    try {
      const account = event.data.object as Stripe.Account;
      console.log("[stripe-connect-webhook] account.updated:", {
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      });

      const newStatus =
        account.charges_enabled && account.payouts_enabled ? "active" : "pending";

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("users")
        .update({ stripe_account_status: newStatus })
        .eq("stripe_account_id", account.id)
        .select();

      if (updateErr) {
        console.error("[stripe-connect-webhook] users update error:", updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      console.log(
        "[stripe-connect-webhook] stripe_account_status set to",
        newStatus,
        "for",
        updated?.length ?? 0,
        "row(s)"
      );

      return NextResponse.json({
        received: true,
        stripe_account_status: newStatus,
        rows: updated?.length ?? 0,
      });
    } catch (err) {
      console.error("[stripe-connect-webhook] account.updated exception:", err);
      return NextResponse.json({ received: true, error: "account.updated handler failed" });
    }
  }

  // ── account.application.deauthorized ──
  if (event.type === "account.application.deauthorized") {
    try {
      // Pour account.application.deauthorized, event.account contient le connected account ID
      const connectedAccountId = event.account;
      console.log("[stripe-connect-webhook] account.application.deauthorized:", connectedAccountId);

      if (!connectedAccountId) {
        console.error("[stripe-connect-webhook] deauthorized: no connected account id");
        return NextResponse.json({ received: true, ignored: "no_account" });
      }

      // Trouver le vendeur
      const { data: seller } = await supabaseAdmin
        .from("users")
        .select("id, email, prenom")
        .eq("stripe_account_id", connectedAccountId)
        .maybeSingle();

      if (!seller) {
        console.error("[stripe-connect-webhook] deauthorized: user not found for", connectedAccountId);
        return NextResponse.json({ received: true, ignored: "user_not_found" });
      }

      const s = seller as { id: string; email: string; prenom?: string | null };

      // Marquer le compte comme deauthorized
      await supabaseAdmin
        .from("users")
        .update({ stripe_account_status: "deauthorized" })
        .eq("id", s.id);

      // Retirer tous les listings actifs du vendeur
      const { data: removedListings } = await supabaseAdmin
        .from("listings")
        .update({ status: "removed" })
        .eq("seller_id", s.id)
        .in("status", ["active", "pending_review", "pending_payment"])
        .select("id");

      console.log(
        "[stripe-connect-webhook] deauthorized: removed",
        removedListings?.length ?? 0,
        "listing(s) for user",
        s.id
      );

      // Notifier le vendeur
      if (s.email) {
        const html = emailWrapper(`
          <h1 style="color: #dc2626; font-size: 22px; margin: 0 0 16px;">Compte Stripe deconnecte</h1>
          <p>Bonjour${s.prenom ? ` ${escapeHtml(s.prenom)}` : ""},</p>
          <p>Votre compte Stripe Connect a ete deconnecte de Quicklot. Vos listings actifs ont ete retires de la vente.</p>
          <p>Si vous souhaitez continuer a vendre, reconnectez votre compte Stripe depuis votre dashboard.</p>
          <p style="margin-top: 24px;">
            <a href="https://www.quicklot.fr/dashboard" style="background: #FF7D07; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; display: inline-block;">Mon dashboard</a>
          </p>
        `);
        await sendEmail(s.email, "Compte Stripe deconnecte — Quicklot", html);
      }

      return NextResponse.json({ received: true, deauthorized: true });
    } catch (err) {
      console.error("[stripe-connect-webhook] deauthorized exception:", err);
      return NextResponse.json({ received: true, error: "deauthorized handler failed" });
    }
  }

  return NextResponse.json({ received: true, ignored: true });
}
