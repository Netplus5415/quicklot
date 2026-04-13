import type { Metadata } from "next";
import Link from "next/link";
import HeroButtons from "@/components/HeroButtons";

export const metadata: Metadata = {
  title: "Quicklot — La marketplace #1 du déstockage en France",
  description:
    "Achetez et vendez des lots de déstockage, surplus et liquidations. Rejoignez des milliers de professionnels francophones sur Quicklot.",
};

const STATS = [
  {
    icon: "🔒",
    value: "100% sécurisé",
    description: "Transactions protégées de bout en bout",
  },
  {
    icon: "💳",
    value: "Paiement escrow",
    description: "Les fonds sont bloqués jusqu'à validation",
  },
  {
    icon: "🤝",
    value: "Communauté pro",
    description: "Vendeurs et acheteurs vérifiés",
  },
];

const STEPS = [
  {
    num: "1",
    title: "Publiez votre lot",
    description:
      "Créez votre annonce en quelques minutes avec photos, description et prix.",
  },
  {
    num: "2",
    title: "Un acheteur vous contacte",
    description:
      "Recevez des offres de notre réseau de professionnels qualifiés.",
  },
  {
    num: "3",
    title: "Quicklot sécurise le paiement",
    description:
      "L'argent est bloqué jusqu'à confirmation de livraison des deux parties.",
  },
];

export default function Home() {
  return (
    <div style={{ fontFamily: "sans-serif" }}>

      {/* ── HERO ── */}
      <section
        style={{
          position: "relative",
          height: "100vh",
          backgroundImage: "url('/hero-warehouse.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        {/* Overlay sombre */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        />

        {/* Contenu */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "780px",
            padding: "0 2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Badge */}
          <span
            style={{
              display: "inline-block",
              backgroundColor: "#FF7D07",
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: "700",
              padding: "0.35rem 1rem",
              borderRadius: "999px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "1.5rem",
            }}
          >
            La marketplace #1 du déstockage en France
          </span>

          <h1
            style={{
              color: "#ffffff",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: "800",
              margin: "0 0 1.25rem 0",
              lineHeight: "1.15",
              letterSpacing: "-0.02em",
            }}
          >
            La marketplace des pros du déstockage
          </h1>

          <p
            style={{
              color: "rgba(255,255,255,0.82)",
              fontSize: "clamp(1rem, 2vw, 1.2rem)",
              margin: "0 0 2.5rem 0",
              lineHeight: "1.7",
              maxWidth: "580px",
            }}
          >
            Achetez et vendez des lots de déstockage, surplus et liquidations.
            Rejoignez des milliers de professionnels francophones.
          </p>

          <HeroButtons />
        </div>
      </section>

      {/* ── CHIFFRES / STATS ── */}
      <section style={{ backgroundColor: "#ffffff", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "2rem",
            }}
          >
            {STATS.map((s) => (
              <div
                key={s.value}
                style={{
                  textAlign: "center",
                  padding: "2rem 1.5rem",
                  border: "1px solid #f3f4f6",
                  borderRadius: "16px",
                  backgroundColor: "#fafafa",
                }}
              >
                <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>
                  {s.icon}
                </div>
                <p
                  style={{
                    color: "#111827",
                    fontSize: "1.2rem",
                    fontWeight: "700",
                    margin: "0 0 0.4rem 0",
                  }}
                >
                  {s.value}
                </p>
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "0.9rem",
                    margin: 0,
                    lineHeight: "1.5",
                  }}
                >
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section style={{ backgroundColor: "#f9fafb", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <h2
            style={{
              color: "#111827",
              fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
              fontWeight: "800",
              margin: "0 0 3rem 0",
              textAlign: "center",
              letterSpacing: "-0.01em",
            }}
          >
            Comment ça marche ?
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "2rem",
            }}
          >
            {STEPS.map((step) => (
              <div
                key={step.num}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "16px",
                  padding: "2rem 1.5rem",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    backgroundColor: "#fff7ed",
                    border: "2px solid #FF7D07",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1.25rem",
                  }}
                >
                  <span
                    style={{
                      color: "#FF7D07",
                      fontSize: "1rem",
                      fontWeight: "800",
                    }}
                  >
                    {step.num}
                  </span>
                </div>
                <h3
                  style={{
                    color: "#111827",
                    fontSize: "1.05rem",
                    fontWeight: "700",
                    margin: "0 0 0.5rem 0",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "0.9rem",
                    margin: 0,
                    lineHeight: "1.6",
                  }}
                >
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINALE ── */}
      <section
        style={{
          backgroundColor: "#f9fafb",
          padding: "5rem 2rem",
          textAlign: "center",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2
            style={{
              color: "#111827",
              fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
              fontWeight: 800,
              margin: "0 0 1rem 0",
              letterSpacing: "-0.01em",
            }}
          >
            Qui sommes-nous ?
          </h2>
          <p
            style={{
              color: "#6b7280",
              fontSize: "1.05rem",
              margin: "0 0 2rem 0",
              lineHeight: 1.6,
            }}
          >
            Quicklot connecte les commerçants, grossistes et importateurs avec
            les arbitreurs Amazon francophones. Une marketplace pensée pour les
            professionnels, avec des vendeurs vérifiés et des paiements
            sécurisés.
          </p>
          <Link
            href="/a-propos"
            style={{
              display: "inline-block",
              backgroundColor: "#ffffff",
              color: "#FF7D07",
              textDecoration: "none",
              padding: "0.85rem 2rem",
              borderRadius: "8px",
              fontSize: "0.95rem",
              fontWeight: 700,
              border: "1px solid #FF7D07",
            }}
          >
            En savoir plus →
          </Link>
        </div>
      </section>

      <section
        style={{
          backgroundColor: "#FF7D07",
          padding: "5rem 2rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2
            style={{
              color: "#ffffff",
              fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
              fontWeight: "800",
              margin: "0 0 1rem 0",
              letterSpacing: "-0.01em",
            }}
          >
            Prêt à rejoindre Quicklot ?
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "1.05rem",
              margin: "0 0 2.25rem 0",
              lineHeight: "1.6",
            }}
          >
            Créez votre compte gratuitement et commencez à vendre vos stocks dès aujourd'hui.
          </p>
          <Link
            href="/vendeur/inscription"
            style={{
              display: "inline-block",
              backgroundColor: "#ffffff",
              color: "#FF7D07",
              textDecoration: "none",
              padding: "0.9rem 2.5rem",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "700",
              letterSpacing: "0.01em",
            }}
          >
            Créer mon compte gratuit
          </Link>
        </div>
      </section>

    </div>
  );
}
