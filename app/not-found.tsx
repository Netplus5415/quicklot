import Link from "next/link";

export default function NotFound() {
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
        fontFamily: "var(--font-geist-sans), sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "480px", width: "100%" }}>
        <p
          style={{
            color: "#FF7D07",
            fontSize: "0.875rem",
            fontWeight: "700",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            margin: "0 0 1rem 0",
          }}
        >
          Erreur 404
        </p>

        <h1
          style={{
            color: "#111827",
            fontSize: "2rem",
            fontWeight: "bold",
            margin: "0 0 0.75rem 0",
          }}
        >
          Page introuvable
        </h1>

        <p
          style={{
            color: "#6b7280",
            fontSize: "1rem",
            lineHeight: "1.6",
            margin: "0 0 2rem 0",
          }}
        >
          Cette page n'existe pas ou a été déplacée.
        </p>

        <Link
          href="/boutique"
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
          Retour au catalogue
        </Link>
      </div>
    </div>
  );
}
