import Link from "next/link";

export default function Home() {
  return (
    <div
      style={{
        backgroundColor: "#000",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "sans-serif",
      }}
    >
      <h1
        style={{
          color: "#fff",
          fontSize: "4rem",
          fontWeight: "bold",
          margin: "0 0 1rem 0",
          textAlign: "center",
          letterSpacing: "-0.02em",
        }}
      >
        UniversPieds
      </h1>
      <p
        style={{
          color: "#9ca3af",
          fontSize: "1.25rem",
          textAlign: "center",
          maxWidth: "600px",
          margin: "0 0 2.5rem 0",
          lineHeight: "1.7",
        }}
      >
        La première marketplace française de contenu pieds et objets portés
      </p>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link
          href="/vendeur/inscription"
          style={{
            backgroundColor: "#9f1239",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "8px",
            padding: "0.85rem 2rem",
            fontSize: "1rem",
            fontWeight: "600",
          }}
        >
          Je suis vendeur
        </Link>
        <Link
          href="/acheteur/inscription"
          style={{
            backgroundColor: "#be185d",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "8px",
            padding: "0.85rem 2rem",
            fontSize: "1rem",
            fontWeight: "600",
          }}
        >
          Je suis acheteur
        </Link>
      </div>
    </div>
  );
}
