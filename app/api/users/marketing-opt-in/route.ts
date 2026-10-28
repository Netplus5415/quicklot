import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { addToMarketingList, removeFromMarketingList } from "@/lib/brevo-contacts";

export const dynamic = "force-dynamic";

const Body = z.object({
  opt_in: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const body = Body.parse(await request.json());

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const authHeader =
      request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Token invalide." }, { status: 401 });
    }

    const email = authUser.email ?? null;

    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("prenom")
      .eq("id", authUser.id)
      .maybeSingle();

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      marketing_opt_in: body.opt_in,
    };
    if (body.opt_in) {
      updates.marketing_opt_in_at = now;
      updates.marketing_unsubscribed_at = null;
    } else {
      updates.marketing_unsubscribed_at = now;
    }

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", authUser.id);

    if (updateError) {
      console.error("[marketing-opt-in] update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (email) {
      const brevoRes = body.opt_in
        ? await addToMarketingList(email, profile?.prenom ?? null)
        : await removeFromMarketingList(email);
      if (!brevoRes.ok) {
        // On ne fait pas échouer l'action utilisateur si Brevo plante :
        // la source de vérité reste Supabase. On loggue pour resync ultérieur.
        console.error("[marketing-opt-in] brevo sync failed:", brevoRes.error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[marketing-opt-in] unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}
