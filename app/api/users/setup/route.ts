import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Body = {
  userId?: string;
  pseudo?: string;
  nom_entreprise?: string;
  type_vendeur?: "amazon" | "destockeur";
  prenom?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;

    if (!body.userId || !body.prenom || !body.pseudo || !body.nom_entreprise || !body.type_vendeur) {
      return NextResponse.json(
        { error: "userId, prenom, pseudo, nom_entreprise et type_vendeur requis." },
        { status: 400 }
      );
    }
    if (body.type_vendeur !== "amazon" && body.type_vendeur !== "destockeur") {
      return NextResponse.json(
        { error: "type_vendeur invalide (amazon | destockeur)." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: authUserData, error: getUserError } =
      await supabaseAdmin.auth.admin.getUserById(body.userId);

    if (getUserError || !authUserData?.user) {
      console.error("[users/setup] getUserById failed:", getUserError);
      return NextResponse.json({ error: "Utilisateur auth introuvable." }, { status: 404 });
    }

    const email = authUserData.user.email ?? null;

    const payload = {
      id: body.userId,
      email,
      role: "seller",
      prenom: body.prenom.trim(),
      kyc_status: null,
      nom_entreprise: body.nom_entreprise.trim() || null,
      type_vendeur: body.type_vendeur,
      pseudo: body.pseudo.trim(),
    };

    const { error: upsertError } = await supabaseAdmin.from("users").upsert(payload);

    if (upsertError) {
      console.error("[users/setup] upsert error:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[users/setup] unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}
