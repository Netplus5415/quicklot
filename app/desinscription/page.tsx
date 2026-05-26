import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken, removeFromMarketingList } from "@/lib/brevo-contacts";

export const dynamic = "force-dynamic";

type Status = "ok" | "invalid" | "error";

async function processUnsubscribe(token: string | undefined): Promise<Status> {
  if (!token) return "invalid";
  const email = verifyUnsubscribeToken(token);
  if (!email) return "invalid";

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const now = new Date().toISOString();
  const { error: dbErr } = await supabaseAdmin
    .from("users")
    .update({
      marketing_opt_in: false,
      marketing_unsubscribed_at: now,
    })
    .eq("email", email);

  if (dbErr) {
    console.error("[desinscription] supabase update error:", dbErr);
    return "error";
  }

  const brevoRes = await removeFromMarketingList(email);
  if (!brevoRes.ok) {
    console.error("[desinscription] brevo remove failed:", brevoRes.error);
    // La source de vérité reste Supabase ; on considère la désinscription
    // effective côté plateforme même si Brevo a échoué (resync manuel possible).
  }

  return "ok";
}

export default async function DesinscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const status = await processUnsubscribe(params.token);

  const titles: Record<Status, string> = {
    ok: "Désinscription confirmée",
    invalid: "Lien invalide",
    error: "Une erreur est survenue",
  };
  const messages: Record<Status, string> = {
    ok: "Vous ne recevrez plus d'emails marketing de Quicklot. Vous continuerez à recevoir uniquement les emails liés à vos commandes et à votre compte.",
    invalid: "Ce lien de désinscription n'est pas valide ou a expiré. Si vous souhaitez vous désinscrire, contactez-nous à infos@quicklot.fr.",
    error: "Nous n'avons pas pu enregistrer votre désinscription. Réessayez dans quelques minutes ou contactez-nous à infos@quicklot.fr.",
  };
  const color = status === "ok" ? "#16a34a" : "#dc2626";

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: "480px", textAlign: "center" }}>
        <h1
          style={{
            color,
            fontSize: "1.75rem",
            fontWeight: "bold",
            margin: "0 0 1rem 0",
          }}
        >
          {titles[status]}
        </h1>
        <p
          style={{
            color: "#4b5563",
            fontSize: "0.95rem",
            lineHeight: 1.55,
            margin: "0 0 2rem 0",
          }}
        >
          {messages[status]}
        </p>
        <a
          href="https://www.quicklot.fr"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#FF7D07",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "0.95rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Retour à l&apos;accueil
        </a>
      </div>
    </div>
  );
}
