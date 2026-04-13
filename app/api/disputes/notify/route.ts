import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "contact@quicklot.fr";

const RAISON_LABELS: Record<string, string> = {
  non_expedition: "Le vendeur n'a pas expédié dans les délais",
  non_conformite: "Le lot reçu n'est pas conforme à la description",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  try {
    const authHeader =
      request.headers.get("authorization") ??
      request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentification requise." },
        { status: 401 }
      );
    }
    const accessToken = authHeader.slice(7).trim();
    if (!accessToken) {
      return NextResponse.json({ error: "Token invalide." }, { status: 401 });
    }

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAnon.auth.getUser(accessToken);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    const body = (await request.json()) as {
      dispute_id?: string;
      order_id?: string;
    };
    if (!body.dispute_id && !body.order_id) {
      return NextResponse.json(
        { error: "dispute_id ou order_id requis." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    let disputeQuery = supabaseAdmin
      .from("disputes")
      .select("id, order_id, buyer_id, seller_id, raison, description, created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    if (body.dispute_id) {
      disputeQuery = disputeQuery.eq("id", body.dispute_id);
    } else {
      disputeQuery = disputeQuery.eq("order_id", body.order_id!);
    }

    const { data: disputes, error: disputeErr } = await disputeQuery;
    if (disputeErr) {
      console.error("[disputes/notify] dispute fetch error:", disputeErr);
      return NextResponse.json({ error: disputeErr.message }, { status: 500 });
    }
    const dispute = disputes?.[0];
    if (!dispute) {
      return NextResponse.json({ error: "Litige introuvable." }, { status: 404 });
    }

    // Sécurité : seul l'acheteur du litige peut déclencher la notif
    if (
      (dispute as { buyer_id: string }).buyer_id !== authUser.id
    ) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 403 }
      );
    }

    const [{ data: buyer }, { data: seller }, { data: order }] =
      await Promise.all([
        supabaseAdmin
          .from("users")
          .select("email, prenom")
          .eq("id", (dispute as { buyer_id: string }).buyer_id)
          .maybeSingle(),
        supabaseAdmin
          .from("users")
          .select("email, prenom")
          .eq("id", (dispute as { seller_id: string }).seller_id)
          .maybeSingle(),
        supabaseAdmin
          .from("orders")
          .select("id, listing:listing_id!left (titre)")
          .eq("id", (dispute as { order_id: string }).order_id)
          .maybeSingle(),
      ]);

    const raisonLabel =
      RAISON_LABELS[(dispute as { raison: string }).raison] ??
      (dispute as { raison: string }).raison;
    const description = escapeHtml((dispute as { description: string }).description);
    const titre =
      (order as { listing?: { titre?: string | null } | null } | null)?.listing?.titre ??
      "—";
    const buyerEmail = (buyer as { email?: string | null } | null)?.email ?? "";
    const buyerPrenom =
      (buyer as { prenom?: string | null } | null)?.prenom ?? null;
    const sellerEmail = (seller as { email?: string | null } | null)?.email ?? "";
    const sellerPrenom =
      (seller as { prenom?: string | null } | null)?.prenom ?? null;

    // 1) Email admin
    const adminSubject = "Nouveau litige ouvert — Quicklot";
    const adminHtml = `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #111827; padding: 24px;">
  <h1 style="color: #dc2626; font-size: 22px; margin: 0 0 16px;">⚠ Nouveau litige ouvert</h1>
  <p>Un acheteur vient d'ouvrir un litige sur Quicklot.</p>
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Lot :</strong> ${escapeHtml(titre)}</p>
    <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Raison :</strong> ${escapeHtml(raisonLabel)}</p>
    <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Acheteur :</strong> ${escapeHtml(buyerEmail)}</p>
    <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Vendeur :</strong> ${escapeHtml(sellerEmail)}</p>
    <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Order ID :</strong> <span style="font-family: monospace;">${escapeHtml((dispute as { order_id: string }).order_id)}</span></p>
  </div>
  <div style="background: #fef2f2; border-left: 3px solid #dc2626; padding: 12px 16px; margin: 16px 0; color: #374151; white-space: pre-wrap;">${description}</div>
  <p style="margin-top: 24px;">
    <a href="https://www.quicklot.fr/admin" style="background: #FF7D07; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; display: inline-block;">Ouvrir le panel admin</a>
  </p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;" />
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">Quicklot — notification admin</p>
</div>
    `.trim();

    await sendEmail(ADMIN_EMAIL, adminSubject, adminHtml);

    // 2) Email acheteur — confirmation
    if (buyerEmail) {
      const buyerSubject = "Votre litige a bien été enregistré — Quicklot";
      const buyerHtml = `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #111827; padding: 24px;">
  <h1 style="color: #FF7D07; font-size: 22px; margin: 0 0 16px;">Votre litige a bien été enregistré</h1>
  <p>Bonjour${buyerPrenom ? ` ${escapeHtml(buyerPrenom)}` : ""},</p>
  <p>Nous avons bien reçu votre demande concernant votre commande <strong>${escapeHtml(titre)}</strong>.</p>
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Raison :</strong> ${escapeHtml(raisonLabel)}</p>
    <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Votre description :</strong></p>
    <div style="background: #ffffff; border-left: 3px solid #FF7D07; padding: 10px 14px; color: #374151; font-size: 14px; white-space: pre-wrap;">${description}</div>
  </div>
  <p>L&#39;équipe Quicklot examine actuellement la situation et reviendra vers vous sous 48h.</p>
  <p>En attendant, si vous avez de nouveaux éléments à nous communiquer, répondez simplement à cet email.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;" />
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
    Cet email vous a été envoyé par <a href="https://www.quicklot.fr" style="color: #FF7D07; text-decoration: none;">Quicklot</a>, la marketplace du déstockage en France.
  </p>
</div>
      `.trim();
      await sendEmail(buyerEmail, buyerSubject, buyerHtml);
    }

    // 3) Email vendeur
    if (sellerEmail) {
      const sellerSubject = "Un litige a été ouvert sur votre commande — Quicklot";
      const sellerHtml = `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #111827; padding: 24px;">
  <h1 style="color: #FF7D07; font-size: 22px; margin: 0 0 16px;">Litige ouvert sur votre commande</h1>
  <p>Bonjour${sellerPrenom ? ` ${escapeHtml(sellerPrenom)}` : ""},</p>
  <p>Un litige a été ouvert sur votre commande <strong>${escapeHtml(titre)}</strong>.</p>
  <p>L'équipe Quicklot va examiner la situation et vous contactera.</p>
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Raison invoquée :</strong> ${escapeHtml(raisonLabel)}</p>
  </div>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;" />
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
    Cet email vous a été envoyé par <a href="https://www.quicklot.fr" style="color: #FF7D07; text-decoration: none;">Quicklot</a>.
  </p>
</div>
      `.trim();
      await sendEmail(sellerEmail, sellerSubject, sellerHtml);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[disputes/notify] exception:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
