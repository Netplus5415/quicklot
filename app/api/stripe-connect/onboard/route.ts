import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";

const REFRESH_URL = "https://www.quicklot.fr/dashboard/profil?stripe=refresh";
const RETURN_URL = "https://www.quicklot.fr/dashboard/profil?stripe=success";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
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
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
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
      .select("id, email, stripe_account_id, stripe_account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (userErr) {
      console.error("[stripe-connect/onboard] users fetch error:", userErr);
      return NextResponse.json({ error: "Erreur lecture utilisateur." }, { status: 500 });
    }
    if (!userRow) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    let accountId = (userRow as { stripe_account_id?: string | null }).stripe_account_id ?? null;
    const userEmail = (userRow as { email?: string | null }).email ?? user.email ?? undefined;

    // Pays optionnel envoyé par le client
    const ALLOWED_COUNTRIES = ["FR", "BE", "ES", "IT", "LU"] as const;
    const BodySchema = z.object({
      country: z.string().optional(),
    }).optional();
    let selectedCountry: (typeof ALLOWED_COUNTRIES)[number] | undefined;
    try {
      const body = BodySchema.parse(await request.json().catch(() => undefined));
      const raw = typeof body?.country === "string" ? body.country.toUpperCase() : null;
      if (raw && (ALLOWED_COUNTRIES as readonly string[]).includes(raw)) {
        selectedCountry = raw as (typeof ALLOWED_COUNTRIES)[number];
      }
    } catch {
      // body non-JSON or validation error → on ignore
    }

    if (!accountId) {
      const createParams: Stripe.AccountCreateParams = {
        type: "express",
        email: userEmail,
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          url: "https://www.quicklot.fr",
        },
      };
      if (selectedCountry) {
        createParams.country = selectedCountry;
      }
      const account = await stripe.accounts.create(createParams);
      accountId = account.id;

      const { error: updateErr } = await supabaseAdmin
        .from("users")
        .update({ stripe_account_id: accountId, stripe_account_status: "pending" })
        .eq("id", user.id);

      if (updateErr) {
        console.error("[stripe-connect/onboard] persist stripe_account_id error:", updateErr);
      }

      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: REFRESH_URL,
        return_url: RETURN_URL,
        type: "account_onboarding",
      });
      return NextResponse.json({ url: link.url });
    }

    // Compte existant : si onboarding complet → login link, sinon → account link
    const account = await stripe.accounts.retrieve(accountId);
    const fullyOnboarded = Boolean(account.charges_enabled && account.payouts_enabled);

    if (fullyOnboarded) {
      try {
        const loginLink = await stripe.accounts.createLoginLink(accountId);
        return NextResponse.json({ url: loginLink.url });
      } catch (err) {
        console.error("[stripe-connect/onboard] createLoginLink failed, fallback to account link:", err);
      }
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: REFRESH_URL,
      return_url: RETURN_URL,
      type: "account_onboarding",
    });
    return NextResponse.json({ url: link.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[stripe-connect/onboard] exception:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
