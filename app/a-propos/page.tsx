export default function APropos() {
  const sectionTitleStyle: React.CSSProperties = {
    color: "#111827",
    fontSize: "1.25rem",
    fontWeight: 600,
    margin: "2.5rem 0 0.85rem 0",
  };

  const paragraphStyle: React.CSSProperties = {
    color: "#374151",
    fontSize: "1rem",
    lineHeight: 1.7,
    margin: "0 0 1rem 0",
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        minHeight: "calc(100vh - 56px)",
        padding: "3rem 1.5rem",
        fontFamily: "var(--font-geist-sans), sans-serif",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1
          style={{
            color: "#111827",
            fontSize: "2rem",
            fontWeight: "bold",
            margin: "0 0 0.5rem 0",
          }}
        >
          Qui sommes-nous
        </h1>
        <p
          style={{
            color: "#FF7D07",
            fontSize: "1rem",
            fontWeight: 600,
            margin: "0 0 0.5rem 0",
          }}
        >
          Quicklot, par AMZSC
        </p>

        <h2 style={sectionTitleStyle}>Pourquoi Quicklot existe</h2>
        <p style={paragraphStyle}>
          Chaque année, des millions d&apos;euros de marchandises dorment dans
          des entrepôts : invendus, fins de série, surplus de production,
          retours logistiques. Les commerçants, grossistes et importateurs du
          monde entier cherchent à écouler ces stocks rapidement et au meilleur
          prix.
        </p>
        <p style={paragraphStyle}>
          De l&apos;autre côté, les arbitreurs Amazon cherchent en permanence
          des sources d&apos;approvisionnement fiables, à prix compétitifs,
          avec des lots bien décrits et des vendeurs sérieux.
        </p>
        <p style={paragraphStyle}>
          Il n&apos;existait pas de place de marché francophone dédiée,
          professionnelle et simple à utiliser pour connecter ces deux mondes.
          Les plateformes existantes sont soit généralistes, soit réservées aux
          très gros volumes, soit dotées d&apos;une expérience utilisateur qui
          décourage. Quicklot a été créé pour combler ce vide.
        </p>

        <h2 style={sectionTitleStyle}>Ce qu&apos;on a construit</h2>
        <p style={paragraphStyle}>
          Une marketplace pensée pour les professionnels francophones, avec des
          exigences claires : vérification KYC obligatoire pour tous les
          vendeurs, descriptions détaillées, photos réelles, paiement sécurisé
          via Stripe, commission transparente de 7,5% sans frais cachés.
        </p>

        <h2 style={sectionTitleStyle}>Pourquoi nous faire confiance</h2>
        <ul
          style={{
            color: "#374151",
            fontSize: "1rem",
            lineHeight: 1.8,
            margin: "0 0 1rem 0",
            paddingLeft: "1.25rem",
          }}
        >
          <li>Tous les vendeurs sont vérifiés avant de pouvoir publier</li>
          <li>Paiements sécurisés gérés par Stripe</li>
          <li>
            Société enregistrée en Europe — AMZ Seller Consulting OÜ, Estonie,
            n° 17153127
          </li>
          <li>Une équipe issue du monde Amazon et e-commerce</li>
          <li>Contact direct : contact@quicklot.fr</li>
        </ul>

        <p
          style={{
            color: "#6b7280",
            fontSize: "0.95rem",
            lineHeight: 1.7,
            margin: "3rem 0 0 0",
            paddingTop: "1.5rem",
            borderTop: "1px solid #e5e7eb",
            fontStyle: "italic",
          }}
        >
          Quicklot est développé par{" "}
          <a
            href="https://www.amzsc.fr"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#FF7D07", textDecoration: "none", fontWeight: 600 }}
          >
            AMZSC
          </a>
          , expert en e-commerce et Amazon.
        </p>
      </div>
    </div>
  );
}
