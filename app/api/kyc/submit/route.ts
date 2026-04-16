import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const Body = z.object({
  nom_entreprise: z.string().min(2).max(200),
  numero_entreprise: z.string().min(4).max(50),
  adresse: z.string().min(3).max(300),
  code_postal: z.string().min(2).max(10),
  ville_kyc: z.string().min(1).max(100),
  pays: z.string().max(50).default("France"),
  bio: z.string().max(300).optional(),
  pseudo: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authHeader =
      request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Token invalide." }, { status: 401 });
    }

    const raw = await request.json();
    const body = Body.parse(raw);

    const rl = await checkRateLimit(supabaseAdmin, `kyc-submit:${user.id}`, 3, 3600);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${Math.ceil(rl.retryAfterSeconds / 60)} min.` },
        { status: 429 }
      );
    }

    const { data: files } = await supabaseAdmin.storage
      .from("kyc-documents")
      .list(user.id);
    const fileNames = (files ?? []).map((f) => f.name);
    const hasDocument = fileNames.some((n) => n.startsWith("document."));
    const hasIdentite = fileNames.some((n) => n.startsWith("identite."));
    if (!hasDocument || !hasIdentite) {
      return NextResponse.json(
        { error: "Les fichiers KYC (document + pièce d'identité) doivent être uploadés avant la soumission." },
        { status: 400 }
      );
    }

    const docFile = fileNames.find((n) => n.startsWith("document."))!;
    const idFile = fileNames.find((n) => n.startsWith("identite."))!;

    const { error: upsertError } = await supabaseAdmin
      .from("kyc_requests")
      .upsert(
        {
          user_id: user.id,
          nom_entreprise: body.nom_entreprise.trim(),
          numero_entreprise: body.numero_entreprise.trim(),
          adresse: body.adresse.trim(),
          code_postal: body.code_postal.trim(),
          ville_kyc: body.ville_kyc.trim(),
          pays: body.pays.trim() || "France",
          document_url: `${user.id}/${docFile}`,
          piece_identite_url: `${user.id}/${idFile}`,
          statut: "pending",
          note_admin: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("[kyc/submit] upsert error:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const userUpdates: Record<string, string | null> = {
      kyc_status: "pending",
      bio: body.bio?.trim() || null,
      ville: body.ville_kyc.trim() || null,
    };
    if (body.pseudo?.trim()) {
      userUpdates.pseudo = body.pseudo.trim();
    }

    const { error: userErr } = await supabaseAdmin
      .from("users")
      .update(userUpdates)
      .eq("id", user.id);

    if (userErr) {
      console.error("[kyc/submit] users update error:", userErr);
    }

    try {
      await fetch(new URL("/api/kyc-notify-admin", request.url).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch (err) {
      console.error("[kyc/submit] admin notify error:", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides.", details: err.issues },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[kyc/submit] exception:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
