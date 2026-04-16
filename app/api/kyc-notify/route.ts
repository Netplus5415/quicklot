import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, templateKycApprouve, templateKycRefuse } from "@/lib/email";
import { isAdminUser } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  userId: z.string(),
  action: z.enum(["approved", "rejected"]),
  raison: z.string().nullable().optional(),
});

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

    // Service role pour vérifier le rôle et lire les données user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const admin = await isAdminUser(supabaseAdmin, authUser.id);
    if (!admin) {
      console.warn("[kyc-notify] non-admin tried to call kyc-notify:", authUser.id);
      return NextResponse.json({ error: "Accès réservé à l'administrateur." }, { status: 403 });
    }

    const body = BodySchema.parse(await request.json());

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
