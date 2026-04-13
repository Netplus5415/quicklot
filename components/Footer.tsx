import Link from "next/link";

export default function Footer() {
  const linkStyle = {
    color: "#6b7280",
    fontSize: "0.875rem",
    textDecoration: "none",
  };

  return (
    <footer
      style={{
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e5e7eb",
        padding: "2rem 1.5rem",
        textAlign: "center",
        fontFamily: "var(--font-geist-sans), sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "1.5rem",
          marginBottom: "1rem",
        }}
      >
        <Link href="/a-propos" style={linkStyle}>
          À propos
        </Link>
        <Link href="/mentions-legales" style={linkStyle}>
          Mentions légales
        </Link>
        <Link href="/cgv" style={linkStyle}>
          CGV
        </Link>
        <Link href="/conditions-vendeur" style={linkStyle}>
          Conditions vendeurs
        </Link>
        <Link href="/confidentialite" style={linkStyle}>
          Politique de confidentialité
        </Link>
      </div>
      <p
        style={{
          color: "#9ca3af",
          fontSize: "0.8125rem",
          margin: 0,
        }}
      >
        © 2025 AMZ Seller Consulting OÜ — Quicklot
      </p>
    </footer>
  );
}
