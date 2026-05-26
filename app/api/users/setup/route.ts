import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { addToMarketingList } from "@/lib/brevo-contacts";

export const dynamic = "force-dynamic";

const Body = z.object({
  userId: z.string(),
  pseudo: z.string(),
  nom_entreprise: z.string(),
  type_vendeur: z.enum(["amazon", "destockeur"]),
  prenom: z.string(),
  marketing_opt_in: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = Body.parse(await request.json());

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const authHeader = request.headers.get("authorization") ??
                       request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: authUser }, error: authError } =
      await supabaseAdmin.auth.getUser(token);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Token invalide." }, { status: 401 });
    }
    if (authUser.id !== body.userId) {
      return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
    }

    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("kyc_status")
      .eq("id", body.userId)
      .maybeSingle();
    if (existing && existing.kyc_status !== null) {
      return NextResponse.json(
        { error: "Profil déjà configuré." },
        { status: 400 }
      );
    }

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
      marketing_opt_in: body.marketing_opt_in,
      marketing_opt_in_at: body.marketing_opt_in ? new Date().toISOString() : null,
    };

    const { error: upsertError } = await supabaseAdmin.from("users").upsert(payload);

    if (upsertError) {
      console.error("[users/setup] upsert error:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    if (body.marketing_opt_in && email) {
      const brevoRes = await addToMarketingList(email, body.prenom.trim());
      if (!brevoRes.ok) {
        console.error("[users/setup] brevo sync failed:", brevoRes.error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[users/setup] unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}
