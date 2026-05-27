import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  hasAllRequiredSellerFields,
  type SellerProfileShape,
} from "@/lib/seller-profile";

export const dynamic = "force-dynamic";

const Body = z.object({
  bio: z.string().min(1).max(300),
  nom_entreprise: z.string().min(2).max(200),
  numero_entreprise: z.string().min(4).max(50),
  adresse: z.string().min(3).max(300),
  code_postal: z.string().min(2).max(10),
  ville: z.string().min(1).max(100),
  pays: z.string().min(1).max(50).default("France"),
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

    const rl = await checkRateLimit(
      supabaseAdmin,
      `seller-profile:${user.id}`,
      30,
      3600
    );
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Trop de tentatives. Réessayez dans ${Math.ceil(
            rl.retryAfterSeconds / 60
          )} min.`,
        },
        { status: 429 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("seller_profile_completed_at")
      .eq("id", user.id)
      .maybeSingle();

    const next: SellerProfileShape = {
      bio: body.bio.trim(),
      nom_entreprise: body.nom_entreprise.trim(),
      numero_entreprise: body.numero_entreprise.trim(),
      adresse: body.adresse.trim(),
      code_postal: body.code_postal.trim(),
      ville: body.ville.trim(),
      pays: body.pays.trim() || "France",
    };

    const updates: Record<string, string | null> = {
      bio: next.bio ?? null,
      nom_entreprise: next.nom_entreprise ?? null,
      numero_entreprise: next.numero_entreprise ?? null,
      adresse: next.adresse ?? null,
      code_postal: next.code_postal ?? null,
      ville: next.ville ?? null,
      pays: next.pays ?? null,
    };

    const alreadyMarked = (existing as { seller_profile_completed_at?: string | null } | null)
      ?.seller_profile_completed_at;
    if (!alreadyMarked && hasAllRequiredSellerFields(next)) {
      updates.seller_profile_completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", user.id);

    if (updateError) {
      console.error("[seller-profile] update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      seller_profile_completed_at:
        updates.seller_profile_completed_at ?? alreadyMarked ?? null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides.", details: err.issues },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[seller-profile] exception:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
