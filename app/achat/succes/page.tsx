import Link from "next/link";

export default async function AchatSucces({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

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
            border: "3px solid #FF7D07",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            fontSize: "2.5rem",
          }}
        >
          ✓
        </div>

        <h1
          style={{
            color: "#111827",
            fontSize: "1.75rem",
            fontWeight: "bold",
            margin: "0 0 0.75rem 0",
          }}
        >
          Paiement confirmé
        </h1>

        <p
          style={{
            color: "#6b7280",
            fontSize: "1rem",
            lineHeight: "1.6",
            margin: "0 0 2rem 0",
          }}
        >
          Merci pour votre achat ! Le vendeur a été notifié et vous contactera
          prochainement pour la suite de la transaction.
        </p>

        {session_id && (
          <p
            style={{
              color: "#9ca3af",
              fontSize: "0.75rem",
              fontFamily: "monospace",
              margin: "0 0 2rem 0",
              wordBreak: "break-all",
            }}
          >
            Référence : {session_id}
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
