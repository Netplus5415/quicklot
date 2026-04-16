import type { Metadata } from "next";
import Link from "next/link";
import { getArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Blog — Quicklot",
  description:
    "Ressources, guides et conseils pour les professionnels du déstockage, de la liquidation et de l'Amazon FBA.",
};

export default function BlogPage() {
  const articles = getArticles();

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "3rem 2rem 5rem" }}>
        <Link
          href="/"
          style={{
            color: "#6b7280",
            fontSize: "0.875rem",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: "2rem",
          }}
        >
          ← Retour à l&apos;accueil
        </Link>

        <h1
          style={{
            color: "#111827",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 800,
            margin: "0 0 0.5rem 0",
            letterSpacing: "-0.02em",
          }}
        >
          Blog Quicklot
        </h1>
        <p
          style={{
            color: "#6b7280",
            fontSize: "1.05rem",
            margin: "0 0 3rem 0",
            lineHeight: 1.6,
          }}
        >
          Ressources et conseils pour les pros du déstockage.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {articles.map((article) => (
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
                  transition: "box-shadow 0.15s",
                }}
              >
                <img
                  src={article.imageUrl}
                  alt={article.imageAlt}
                  style={{ width: "100%", height: "180px", objectFit: "cover", display: "block" }}
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
                  <h2
                    style={{
                      color: "#111827",
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      margin: "0 0 0.5rem 0",
                      lineHeight: 1.35,
                    }}
                  >
                    {article.titre}
                  </h2>
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
    </div>
  );
}
