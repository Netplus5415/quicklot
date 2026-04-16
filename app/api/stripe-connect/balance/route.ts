import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader =
      request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      return NextResponse.json({ error: "Token invalide." }, { status: 401 });
    }

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: userRow, error: userErr } = await supabaseAdmin
      .from("users")
      .select("stripe_account_id")
      .eq("id", user.id)
      .maybeSingle();

    if (userErr) {
      console.error("[stripe-connect/balance] users fetch error:", userErr);
      return NextResponse.json({ error: "Erreur lecture utilisateur." }, { status: 500 });
    }

    const accountId =
      (userRow as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null;
    if (!accountId) {
      return NextResponse.json(
        { error: "Aucun compte Stripe Connect associé." },
        { status: 404 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const balance = await stripe.balance.retrieve({}, { stripeAccount: accountId });

    const availableCents = balance.available
      .filter((b) => b.currency === "eur")
      .reduce((sum, b) => sum + b.amount, 0);
    const pendingCents = balance.pending
      .filter((b) => b.currency === "eur")
      .reduce((sum, b) => sum + b.amount, 0);

    return NextResponse.json({
      available: availableCents / 100,
      pending: pendingCents / 100,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[stripe-connect/balance] exception:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
