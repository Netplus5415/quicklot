import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

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
      sender_id?: string;
      recipient_id?: string;
      contenu?: string;
    };

    if (!body.sender_id || !body.recipient_id) {
      return NextResponse.json(
        { error: "sender_id et recipient_id requis." },
        { status: 400 }
      );
    }
    if (body.sender_id !== authUser.id) {
      return NextResponse.json(
        { error: "sender_id non autorisé." },
        { status: 403 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Cooldown : 1h depuis dernière notif sender→recipient
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabaseAdmin
      .from("message_notifications")
      .select("sent_at")
      .eq("sender_id", body.sender_id)
      .eq("recipient_id", body.recipient_id)
      .gte("sent_at", oneHourAgo)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, skipped: "cooldown" });
    }

    const [{ data: recipient }, { data: sender }] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("email, prenom")
        .eq("id", body.recipient_id)
        .maybeSingle(),
      supabaseAdmin
        .from("users")
        .select("prenom")
        .eq("id", body.sender_id)
        .maybeSingle(),
    ]);

    const recipientEmail = (recipient as { email?: string | null } | null)?.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Destinataire introuvable." },
        { status: 404 }
      );
    }

    const recipientPrenom =
      (recipient as { prenom?: string | null } | null)?.prenom ?? null;
    const senderPrenom =
      (sender as { prenom?: string | null } | null)?.prenom ?? "Un utilisateur";
    const extrait = (body.contenu ?? "").trim();

    const subject = "Vous avez un nouveau message — Quicklot";
    const html = `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #111827; padding: 24px;">
  <h1 style="color: #FF7D07; font-size: 22px; margin: 0 0 16px;">💬 Nouveau message</h1>
  <p>Bonjour${recipientPrenom ? ` ${recipientPrenom}` : ""},</p>
  <p><strong>${senderPrenom}</strong> vous a envoyé un nouveau message sur Quicklot.</p>
  ${
    extrait
      ? `<div style="background: #f9fafb; border-left: 3px solid #FF7D07; padding: 12px 16px; margin: 16px 0; color: #374151; font-style: italic;">${extrait.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`
      : ""
  }
  <p style="margin-top: 24px;">
    <a href="https://www.quicklot.fr/messages" style="background: #FF7D07; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; display: block; max-width: 100%; box-sizing: border-box; text-align: center;">Ouvrir la conversation</a>
  </p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;" />
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
    Pour limiter les notifications, un seul email par heure est envoyé par expéditeur.
  </p>
</div>
    `.trim();

    const result = await sendEmail(recipientEmail, subject, html);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Erreur envoi" },
        { status: 500 }
      );
    }

    await supabaseAdmin
      .from("message_notifications")
      .upsert(
        {
          sender_id: body.sender_id,
          recipient_id: body.recipient_id,
          sent_at: new Date().toISOString(),
        },
        { onConflict: "sender_id,recipient_id" }
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[messages/notify] exception:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
