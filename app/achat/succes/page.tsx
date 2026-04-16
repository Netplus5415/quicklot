import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export default async function AchatSucces({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  // Pas de session_id → affichage générique
  if (!session_id) {
    return <SuccessLayout message="Paiement confirmé" subtitle="Merci pour votre achat !" />;
  }

  // ── Vérification Stripe côté serveur ──
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let stripeSession: Stripe.Checkout.Session;
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(session_id);
  } catch {
    return (
      <SuccessLayout
        message="Session introuvable"
        subtitle="La référence de paiement est invalide ou a expiré."
        error
      />
    );
  }

  if (stripeSession.payment_status !== "paid") {
    return (
      <SuccessLayout
        message="Paiement en attente"
        subtitle="Votre paiement n'est pas encore confirmé. Veuillez rafraîchir cette page dans quelques secondes."
        pending
        sessionId={session_id}
      />
    );
  }

  // ── Vérification que le user connecté correspond au buyer ──
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Server Component read-only — pas de set
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Vérifier que le customer_email Stripe correspond au user connecté
  const customerEmail = stripeSession.customer_details?.email ?? stripeSession.customer_email;
  const userEmail = user?.email;
  const emailMismatch = userEmail && customerEmail && userEmail !== customerEmail;

  // Vérifier que l'order existe en DB (webhook arrivé)
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("stripe_session_id", session_id)
    .maybeSingle();

  if (!order) {
    return (
      <SuccessLayout
        message="Paiement confirmé"
        subtitle="En attente de confirmation... Le webhook Stripe n'a pas encore été traité. Rafraîchissez dans quelques secondes."
        pending
        sessionId={session_id}
      />
    );
  }

  if (emailMismatch) {
    return (
      <SuccessLayout
        message="Paiement confirmé"
        subtitle="Attention : l'email de paiement ne correspond pas à votre compte connecté."
        sessionId={session_id}
      />
    );
  }

  return (
    <SuccessLayout
      message="Paiement confirmé"
      subtitle="Merci pour votre achat ! Le vendeur a été notifié et vous contactera prochainement pour la suite de la transaction."
      sessionId={session_id}
    />
  );
}

function SuccessLayout({
  message,
  subtitle,
  sessionId,
  error,
  pending,
}: {
  message: string;
  subtitle: string;
  sessionId?: string;
  error?: boolean;
  pending?: boolean;
}) {
  const iconColor = error ? "#dc2626" : pending ? "#f59e0b" : "#FF7D07";
  const icon = error ? "✗" : pending ? "⏳" : "✓";

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        minHeight: "calc(100vh - 56px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "480px", width: "100%" }}>
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            backgroundColor: "#fff7ed",
            border: `3px solid ${iconColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            fontSize: "2.5rem",
          }}
        >
          {icon}
        </div>

        <h1
          style={{
            color: "#111827",
            fontSize: "1.75rem",
            fontWeight: "bold",
            margin: "0 0 0.75rem 0",
          }}
        >
          {message}
        </h1>

        <p
          style={{
            color: "#6b7280",
            fontSize: "1rem",
            lineHeight: "1.6",
            margin: "0 0 2rem 0",
          }}
        >
          {subtitle}
        </p>

        {sessionId && (
          <p
            style={{
              color: "#9ca3af",
              fontSize: "0.75rem",
              fontFamily: "monospace",
              margin: "0 0 2rem 0",
              wordBreak: "break-all",
            }}
          >
            Référence : {sessionId}
          </p>
        )}

        <Link
          href="/dashboard/acheteur"
          style={{
            display: "inline-block",
            backgroundColor: "#FF7D07",
            color: "#ffffff",
            textDecoration: "none",
            padding: "0.75rem 1.75rem",
            borderRadius: "8px",
            fontSize: "0.95rem",
            fontWeight: "600",
          }}
        >
          Voir mes achats
        </Link>
      </div>
    </div>
  );
}
