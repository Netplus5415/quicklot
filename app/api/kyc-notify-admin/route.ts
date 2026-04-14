import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, escapeHtml } from "@/lib/email";
import { ADMIN_NOTIFY_EMAIL } from "@/lib/admin";
import { checkRateLimit } from "@/lib/rate-limit";

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
      console.error("[kyc-notify-admin] auth.getUser failed:", authError);
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    const body = (await request.json()) as { userId?: string };
    if (!body.userId) {
      return NextResponse.json({ error: "userId requis." }, { status: 400 });
    }
    if (body.userId !== authUser.id) {
      return NextResponse.json(
        { error: "userId non autorisé." },
        { status: 403 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Rate limit : max 3 demandes KYC par heure par utilisateur
    const rl = await checkRateLimit(supabaseAdmin, `kyc-notify-admin:${authUser.id}`, 3, 3600);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Trop de demandes. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("email, prenom, nom, entreprise")
      .eq("id", body.userId)
      .maybeSingle();

    const email = (user as { email?: string | null } | null)?.email ?? authUser.email ?? "";
    const prenom = (user as { prenom?: string | null } | null)?.prenom ?? "";
    const nom = (user as { nom?: string | null } | null)?.nom ?? "";
    const entreprise = (user as { entreprise?: string | null } | null)?.entreprise ?? "";

    const subject = "Nouvelle demande KYC — Quicklot";
    const html = `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #111827; padding: 24px;">
  <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px 0;">Nouvelle demande KYC en attente</h2>
  <p style="color: #374151; font-size: 15px; line-height: 1.6;">
    Une nouvelle demande KYC vient d'être soumise et est en attente de validation.
  </p>
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;"><strong>Utilisateur :</strong> ${escapeHtml(prenom)} ${escapeHtml(nom)}</p>
    <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;"><strong>Email :</strong> ${escapeHtml(email)}</p>
    ${entreprise ? `<p style="margin: 0; font-size: 14px; color: #374151;"><strong>Entreprise :</strong> ${escapeHtml(entreprise)}</p>` : ""}
  </div>
  <p style="margin: 24px 0;">
    <a href="https://www.quicklot.fr/admin" style="display: inline-block; background-color: #FF7D07; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
      Valider la demande
    </a>
  </p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;" />
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">Quicklot — notification admin</p>
</div>
    `.trim();

    const result = await sendEmail(ADMIN_NOTIFY_EMAIL, subject, html);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Erreur envoi" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[kyc-notify-admin] exception:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
