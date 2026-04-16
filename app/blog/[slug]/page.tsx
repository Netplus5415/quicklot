import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle, getArticles } from "@/lib/articles";

export function generateStaticParams() {
  return getArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article introuvable — Quicklot" };
  return {
    title: `${article.titre} — Blog Quicklot`,
    description: article.extrait,
    alternates: {
      canonical: `https://www.quicklot.fr/blog/${article.slug}`,
    },
    openGraph: {
      title: article.titre,
      description: article.extrait,
      url: `https://www.quicklot.fr/blog/${article.slug}`,
      siteName: "Quicklot",
      type: "article",
      images: [{ url: article.imageUrl, width: 800, height: 400, alt: article.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.titre,
      description: article.extrait,
      images: [article.imageUrl],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const others = getArticles().filter((a) => a.slug !== slug);

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2rem 2rem 5rem" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: "0.8rem", color: "#9ca3af", marginBottom: "2rem" }}>
          <Link href="/" style={{ color: "#9ca3af", textDecoration: "none" }}>
            Accueil
          </Link>
          {" > "}
          <Link href="/blog" style={{ color: "#9ca3af", textDecoration: "none" }}>
            Blog
          </Link>
          {" > "}
          <span style={{ color: "#6b7280" }}>{article.titre}</span>
        </nav>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: article.titre,
              description: article.extrait,
              image: article.imageUrl,
              datePublished: article.date,
              author: { "@type": "Organization", name: "Quicklot" },
              publisher: {
                "@type": "Organization",
                name: "Quicklot",
                logo: {
                  "@type": "ImageObject",
                  url: "https://www.quicklot.fr/logo.png",
                },
              },
              mainEntityOfPage: {
                "@type": "WebPage",
                "@id": `https://www.quicklot.fr/blog/${article.slug}`,
              },
            }),
          }}
        />

        {/* Image header */}
        <img
          src={article.imageUrl}
          alt={article.imageAlt}
          style={{
            width: "100%",
            height: "320px",
            objectFit: "cover",
            borderRadius: "12px",
            display: "block",
            marginBottom: "2rem",
          }}
        />

        {/* Badge + titre + meta */}
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
            marginBottom: "1rem",
          }}
        >
          {article.categorie}
        </span>

        <h1
          style={{
            color: "#111827",
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            fontWeight: 800,
            margin: "0 0 0.75rem 0",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
          }}
        >
          {article.titre}
        </h1>

        <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: "0 0 2.5rem 0" }}>
          {article.date} · {article.readTime} de lecture
        </p>

        {/* Corps de l'article */}
        <div
          className="article-body"
          dangerouslySetInnerHTML={{ __html: article.contenu }}
          style={{
            color: "#374151",
            fontSize: "1.05rem",
            lineHeight: 1.85,
          }}
        />

        <style>{`
          .article-body h2 {
            color: #111827;
            font-size: 1.4rem;
            font-weight: 700;
            margin: 2.5rem 0 0.75rem 0;
            letter-spacing: -0.01em;
            line-height: 1.3;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #f3f4f6;
          }
          .article-body p {
            margin: 0 0 1.25rem 0;
          }
          .article-body ul,
          .article-body ol {
            margin: 0 0 1.5rem 0;
            padding-left: 1.5rem;
          }
          .article-body li {
            margin-bottom: 0.6rem;
          }
          .article-body strong {
            color: #111827;
            font-weight: 600;
          }
          .article-body table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5rem 0;
            font-size: 0.9rem;
          }
          .article-body th {
            text-align: left;
            padding: 0.7rem 0.8rem;
            color: #111827;
            font-weight: 700;
            border-bottom: 2px solid #e5e7eb;
            background-color: #f9fafb;
          }
          .article-body td {
            padding: 0.65rem 0.8rem;
            border-bottom: 1px solid #f3f4f6;
            color: #374151;
          }
          .article-body tr:last-child td {
            border-bottom: none;
          }
          .article-body a {
            color: #FF7D07;
            text-decoration: underline;
            text-underline-offset: 2px;
          }
        `}</style>

        {/* CTA */}
        <div
          style={{
            backgroundColor: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "2rem",
            textAlign: "center",
            marginTop: "3rem",
            marginBottom: "3rem",
          }}
        >
          <p
            style={{
              color: "#111827",
              fontSize: "1.1rem",
              fontWeight: 700,
              margin: "0 0 0.5rem 0",
            }}
          >
            {article.ctaLabel}
          </p>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.9rem",
              margin: "0 0 1.25rem 0",
            }}
          >
            Des lots de déstockage vérifiés, des paiements sécurisés.
          </p>
          <Link
            href={article.ctaHref}
            style={{
              display: "inline-block",
              backgroundColor: "#FF7D07",
              color: "#ffffff",
              textDecoration: "none",
              padding: "0.75rem 2rem",
              borderRadius: "8px",
              fontSize: "0.95rem",
              fontWeight: 700,
            }}
          >
            {article.ctaLabel} →
          </Link>
        </div>

        {/* Continuer à lire */}
        {others.length > 0 && (
          <div>
            <h2
              style={{
                color: "#111827",
                fontSize: "1.25rem",
                fontWeight: 700,
                margin: "0 0 1.25rem 0",
              }}
            >
              Continuer à lire
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {others.map((other) => (
                <Link
                  key={other.slug}
                  href={`/blog/${other.slug}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "flex",
                    gap: "1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <img
                    src={other.imageUrl}
                    alt={other.imageAlt}
                    style={{
                      width: "160px",
                      minHeight: "110px",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ padding: "0.9rem 1rem 0.9rem 0", flex: 1 }}>
                    <span
                      style={{
                        display: "inline-block",
                        backgroundColor: "#fff7ed",
                        color: "#FF7D07",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                        marginBottom: "0.4rem",
                      }}
                    >
                      {other.categorie}
                    </span>
                    <p
                      style={{
                        color: "#111827",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        margin: "0 0 0.3rem 0",
                        lineHeight: 1.3,
                      }}
                    >
                      {other.titre}
                    </p>
                    <p style={{ color: "#9ca3af", fontSize: "0.75rem", margin: 0 }}>
                      {other.date} · {other.readTime}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
