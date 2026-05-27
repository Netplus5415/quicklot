import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { addToMarketingList } from "@/lib/brevo-contacts";
import { sanitizeAttribution } from "@/lib/attribution";
import {
  isSellerProfileComplete,
  SELLER_PROFILE_COLUMNS,
  type SellerProfileShape,
} from "@/lib/seller-profile";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/connexion?error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error("[auth/callback] exchange error:", error);
    return NextResponse.redirect(`${origin}/connexion?error=auth_failed`);
  }

  const user = data.user;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const meta = (user.user_metadata ?? {}) as {
    given_name?: string | null;
    full_name?: string | null;
    name?: string | null;
    avatar_url?: string | null;
    picture?: string | null;
    prenom?: string | null;
    seller_profile?: {
      prenom?: string | null;
      pseudo?: string | null;
      nom_entreprise?: string | null;
      type_vendeur?: "amazon" | "destockeur" | null;
      marketing_opt_in?: boolean | null;
    } | null;
    attribution?: unknown;
  };
  const sellerProfile = meta.seller_profile ?? null;
  const prenom =
    sellerProfile?.prenom ?? meta.prenom ?? meta.given_name ?? meta.full_name ?? meta.name ?? null;
  const avatar_url = meta.avatar_url ?? meta.picture ?? null;
  const pseudo = sellerProfile?.pseudo ?? null;

  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("users")
    .select("id, prenom, pseudo, avatar_url, nom_entreprise, type_vendeur, marketing_opt_in_at, marketing_unsubscribed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (existingErr) {
    console.error(
      "[auth/callback] users lookup error — skipping insert and welcome flag:",
      existingErr
    );
    return NextResponse.redirect(`${origin}/dashboard/profil`);
  }

  const marketingOptIn = sellerProfile?.marketing_opt_in === true;
  const marketingOptInAt = marketingOptIn ? new Date().toISOString() : null;

  if (!existing) {
    const { error: insertErr } = await supabaseAdmin.from("users").insert({
      id: user.id,
      email: user.email,
      prenom,
      pseudo,
      avatar_url,
      role: "seller",
      kyc_status: null,
      stripe_account_status: "none",
      nom_entreprise: sellerProfile?.nom_entreprise ?? null,
      type_vendeur: sellerProfile?.type_vendeur ?? null,
      marketing_opt_in: marketingOptIn,
      marketing_opt_in_at: marketingOptInAt,
    });

    if (insertErr) {
      console.error("[auth/callback] profile insert error:", insertErr);
    }
  } else {
    const updates: Record<string, string | boolean | null> = {};
    if (!existing.prenom && prenom) updates.prenom = prenom;
    if (!existing.pseudo && pseudo) updates.pseudo = pseudo;
    if (!existing.avatar_url && avatar_url) updates.avatar_url = avatar_url;
    if (!existing.nom_entreprise && sellerProfile?.nom_entreprise) {
      updates.nom_entreprise = sellerProfile.nom_entreprise;
    }
    if (!existing.type_vendeur && sellerProfile?.type_vendeur) {
      updates.type_vendeur = sellerProfile.type_vendeur;
    }
    if (
      marketingOptIn &&
      existing.marketing_opt_in_at === null &&
      existing.marketing_unsubscribed_at === null
    ) {
      updates.marketing_opt_in = true;
      updates.marketing_opt_in_at = marketingOptInAt;
    }
    if (Object.keys(updates).length > 0) {
      const { error: patchErr } = await supabaseAdmin
        .from("users")
        .update(updates)
        .eq("id", user.id);
      if (patchErr) {
        console.error("[auth/callback] profile sync error:", patchErr);
      }
    }
  }

  const attribution = sanitizeAttribution(meta.attribution);
  if (attribution) {
    const { error: attributionError } = await supabaseAdmin
      .from("user_attributions")
      .upsert(
        {
          user_id: user.id,
          email: user.email ?? null,
          ...attribution,
        },
        { onConflict: "user_id" }
      );

    if (attributionError) {
      console.error("[auth/callback] attribution upsert error:", attributionError);
    }
  }

  if (marketingOptIn && user.email) {
    const brevoRes = await addToMarketingList(user.email, prenom ?? "");
    if (!brevoRes.ok) {
      console.error("[auth/callback] brevo sync failed:", brevoRes.error);
    }
  }

  const consentNotYetAnswered =
    !marketingOptIn &&
    (!existing ||
      (existing.marketing_opt_in_at === null &&
        existing.marketing_unsubscribed_at === null));

  if (consentNotYetAnswered) {
    return NextResponse.redirect(`${origin}/bienvenue`);
  }

  // Pas de /dashboard par défaut : si le profil vendeur n'est pas complet,
  // on envoie vers /dashboard/profil pour finir l'onboarding, sinon vers /.
  const { data: sellerRow } = await supabaseAdmin
    .from("users")
    .select(SELLER_PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();
  const target = isSellerProfileComplete(sellerRow as SellerProfileShape | null)
    ? `${origin}/`
    : `${origin}/dashboard/profil`;
  return NextResponse.redirect(target);
}
