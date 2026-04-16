import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import HeroButtons from "@/components/HeroButtons";
import { getArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Quicklot — La marketplace du déstockage en France",
  description:
    "Achetez et vendez des lots de déstockage, surplus et liquidations. Rejoignez des milliers de professionnels francophones sur Quicklot.",
};

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" {...ICON_PROPS}>
    <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const CardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" {...ICON_PROPS}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <line x1="6" y1="15" x2="10" y2="15" />
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" {...ICON_PROPS}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const STATS: { icon: ReactNode; value: string; description: string }[] = [
  {
    icon: <ShieldIcon />,
    value: "Transactions sécurisées",
    description: "Identité et activité vérifiées de bout en bout.",
  },
  {
    icon: <CardIcon />,
    value: "Paiement protégé jusqu'à livraison",
    description: "Les fonds sont bloqués tant que vous n'avez pas reçu le lot.",
  },
  {
    icon: <UsersIcon />,
    value: "Communauté de pros vérifiés",
    description: "Uniquement des vendeurs et acheteurs professionnels.",
  },
];

const STEPS = [
  {
    num: "1",
    title: "Publiez votre lot",
    description: "Créez votre annonce en quelques minutes.",
  },
  {
    num: "2",
    title: "Un acheteur achète",
    description: "Paiement sécurisé directement sur la plateforme.",
  },
  {
    num: "3",
    title: "Expédiez et soyez payé",
    description:
      "Une fois la livraison confirmée, les fonds vous sont reversés.",
  },
];

export default function Home() {
  return (
    <div style={{ fontFamily: "sans-serif" }}>

      {/* ── HERO ── */}
      <section
        style={{
          background: "#0F1E3C",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          paddingTop: "5rem",
        }}
      >
        <div
          style={{
            maxWidth: "780px",
            padding: "0 2rem 4rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
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
            Réservé aux professionnels vérifiés
          </span>

          <h1
            style={{
              color: "#ffffff",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: "800",
              margin: "0 0 0.9rem 0",
              lineHeight: "1.15",
              letterSpacing: "-0.02em",
            }}
          >
            La marketplace des pros du déstockage
          </h1>

          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "0.85rem",
              fontWeight: 500,
              letterSpacing: "0.02em",
              margin: "0 0 1.5rem 0",
            }}
          >
            ★ Communauté de 2 500+ Amazon Sellers francophones
          </p>

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

        {/* Wave de transition vers le blanc */}
        <svg
          viewBox="0 0 1440 70"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style={{ display: "block", width: "100%", height: "60px", marginBottom: "-2px" }}
        >
          <path d="M0,0 Q720,70 1440,0 L1440,70 L0,70 Z" fill="#ffffff" />
        </svg>
      </section>

      {/* ── CHIFFRES / STATS ── */}
      <section style={{ backgroundColor: "#ffffff", padding: "3.5rem 2rem" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem",
            }}
          >
            {STATS.map((s) => (
              <div
                key={s.value}
                style={{
                  textAlign: "left",
                  padding: "1.25rem 1.25rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  backgroundColor: "#ffffff",
                }}
              >
                <div
                  style={{
                    color: "#FF7D07",
                    marginBottom: "0.65rem",
                    display: "inline-flex",
                  }}
                >
                  {s.icon}
                </div>
                <p
                  style={{
                    color: "#111827",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    margin: "0 0 0.25rem 0",
                    lineHeight: 1.3,
                  }}
                >
                  {s.value}
                </p>
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "0.82rem",
                    margin: 0,
                    lineHeight: 1.5,
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

      {/* ── BLOG / RESSOURCES ── */}
      <section style={{ backgroundColor: "#f9fafb", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <h2
              style={{
                color: "#111827",
                fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Ressources &amp; conseils
            </h2>
            <Link
              href="/blog"
              style={{
                color: "#FF7D07",
                fontSize: "0.9rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Voir tous les articles →
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {getArticles().map((article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <img
                    src={article.imageUrl}
                    alt={article.imageAlt}
                    style={{
                      width: "100%",
                      height: "180px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <div style={{ padding: "1.25rem 1.25rem 1.5rem" }}>
                    <span
                      style={{
                        display: "inline-block",
                        backgroundColor: "#fff7ed",
                        color: "#FF7D07",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px",
                        letterSpacing: "0.03em",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {article.categorie}
                    </span>
                    <h3
                      style={{
                        color: "#111827",
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        margin: "0 0 0.5rem 0",
                        lineHeight: 1.35,
                      }}
                    >
                      {article.titre}
                    </h3>
                    <p
                      style={{
                        color: "#6b7280",
                        fontSize: "0.85rem",
                        margin: "0 0 1rem 0",
                        lineHeight: 1.55,
                      }}
                    >
                      {article.extrait.length > 120
                        ? article.extrait.slice(0, 120) + "..."
                        : article.extrait}
                    </p>
                    <p style={{ color: "#9ca3af", fontSize: "0.75rem", margin: 0 }}>
                      {article.date} · {article.readTime} de lecture
                    </p>
                  </div>
                </div>
              </Link>
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
          backgroundColor: "#0F1E3C",
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
