import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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
  };
  const prenom =
    meta.given_name ?? meta.full_name ?? meta.name ?? null;
  const avatar_url = meta.avatar_url ?? meta.picture ?? null;
  const pseudo = null;

  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("users")
    .select("id, pseudo, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (existingErr) {
    console.error("[auth/callback] users lookup error:", existingErr);
  }

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
    });

    if (insertErr) {
      console.error("[auth/callback] profile insert error:", insertErr);
    }
  } else {
    const updates: Record<string, string> = {};
    if (!existing.avatar_url && avatar_url) updates.avatar_url = avatar_url;
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

  return NextResponse.redirect(`${origin}/dashboard`);
}
