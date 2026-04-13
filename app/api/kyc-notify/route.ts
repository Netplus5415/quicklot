import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, templateKycApprouve, templateKycRefuse } from "@/lib/email";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "contact@quicklot.fr";

type KycAction = "approved" | "rejected";

export async function POST(request: NextRequest) {
  try {
    // ── Authentification admin obligatoire ──
    const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    const accessToken = authHeader.slice(7).trim();
    if (!accessToken) {
      return NextResponse.json({ error: "Token invalide." }, { status: 401 });
    }

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user: authUser }, error: authError } = await supabaseAnon.auth.getUser(accessToken);

    if (authError || !authUser) {
      console.error("[kyc-notify] auth.getUser failed:", authError);
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }
    if (authUser.email !== ADMIN_EMAIL) {
      console.warn("[kyc-notify] non-admin tried to call kyc-notify:", authUser.email);
      return NextResponse.json({ error: "Accès réservé à l'administrateur." }, { status: 403 });
    }

    const body = (await request.json()) as {
      userId?: string;
      action?: KycAction;
      raison?: string | null;
    };

    if (!body.userId || !body.action) {
      return NextResponse.json(
        { error: "userId et action requis." },
        { status: 400 }
      );
    }
    if (body.action !== "approved" && body.action !== "rejected") {
      return NextResponse.json(
        { error: "action invalide (approved | rejected)." },
        { status: 400 }
      );
    }

    // Service role pour lire l'email et le prénom, même si RLS bloque anon
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("email, prenom")
      .eq("id", body.userId)
      .maybeSingle();

    if (error) {
      console.error("[kyc-notify] user fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!user || !(user as { email?: string }).email) {
      return NextResponse.json(
        { error: "Utilisateur introuvable ou sans email." },
        { status: 404 }
      );
    }

    const { subject, html } =
      body.action === "approved"
        ? templateKycApprouve({
            prenom: (user as { prenom?: string | null }).prenom ?? null,
          })
        : templateKycRefuse({
            prenom: (user as { prenom?: string | null }).prenom ?? null,
            raison: body.raison ?? null,
          });

    const result = await sendEmail(
      (user as { email: string }).email,
      subject,
      html
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Erreur envoi" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[kyc-notify] exception:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
