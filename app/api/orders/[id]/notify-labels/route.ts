import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const wrap = (body: string) => `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #111827; padding: 24px;">
  ${body}
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;" />
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
    Cet email vous a été envoyé par <a href="https://www.quicklot.fr" style="color: #FF7D07; text-decoration: none;">Quicklot</a>.
  </p>
</div>
`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    const token = authHeader.slice(7).trim();

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, buyer_id, seller_id, listing_id")
      .eq("id", id)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const o = order as { id: string; buyer_id: string; seller_id: string; listing_id: string };

    // Seul l'acheteur peut déclencher cette notif
    if (o.buyer_id !== user.id) {
      return NextResponse.json(
        { error: "Seul l'acheteur peut déclencher cette notification." },
        { status: 403 }
      );
    }

    // Fetch seller email + listing title
    const [{ data: seller }, { data: listing }] = await Promise.all([
      supabaseAdmin.from("users").select("email, prenom").eq("id", o.seller_id).maybeSingle(),
      supabaseAdmin.from("listings").select("titre").eq("id", o.listing_id).maybeSingle(),
    ]);

    if (!seller || !(seller as { email?: string }).email) {
      return NextResponse.json({ error: "Vendeur introuvable." }, { status: 404 });
    }

    const titre = (listing as { titre?: string } | null)?.titre ?? "votre commande";
    const sellerName = (seller as { prenom?: string | null }).prenom ?? null;

    const subject = "L'acheteur a uploadé ses étiquettes FBA — Quicklot";
    const html = wrap(`
      <h1 style="color: #FF7D07; font-size: 22px; margin: 0 0 16px;">📦 Étiquettes FBA reçues</h1>
      <p>Bonjour${sellerName ? ` ${sellerName}` : ""},</p>
      <p>L'acheteur de votre commande <strong>${titre}</strong> vient d'uploader ses étiquettes de préparation Amazon FBA.</p>
      <p>Vous pouvez les télécharger depuis votre dashboard pour préparer l'expédition vers Amazon.</p>
      <p style="margin-top: 24px;">
        <a href="https://www.quicklot.fr/dashboard/commandes/${o.id}" style="background: #FF7D07; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; display: inline-block;">Télécharger les étiquettes</a>
      </p>
    `);

    const r = await sendEmail((seller as { email: string }).email, subject, html);
    if (!r.ok) {
      return NextResponse.json({ error: r.error ?? "Envoi échoué" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[notify-labels] exception:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
