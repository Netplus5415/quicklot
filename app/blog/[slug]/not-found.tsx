import Link from "next/link";

export default function BlogNotFound() {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <p
        style={{
          color: "#111827",
          fontSize: "1.5rem",
          fontWeight: 700,
          margin: "0 0 0.5rem 0",
        }}
      >
        Article introuvable
      </p>
      <p
        style={{
          color: "#6b7280",
          fontSize: "0.95rem",
          margin: "0 0 2rem 0",
        }}
      >
        Cet article n&apos;existe pas ou a été supprimé.
      </p>
      <Link
        href="/blog"
        style={{
          color: "#FF7D07",
          fontSize: "0.9rem",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        ← Retour au blog
      </Link>
    </div>
  );
}
