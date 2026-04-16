export default function ConditionsVendeur() {
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
            margin: "0 0 2rem 0",
          }}
        >
          Conditions spécifiques vendeurs
        </h1>

        <div
          style={{
            color: "#374151",
            fontSize: "1rem",
            lineHeight: "1.7",
          }}
        >
          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            Éligibilité
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Réservé aux professionnels (auto-entrepreneurs, sociétés,
            commerçants). La vente entre particuliers n'est pas autorisée sur
            Quicklot.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            Vérification KYC
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Vérification KYC obligatoire avant toute publication de lot : nom
            d'entreprise, numéro SIRET/TVA/RCS, pièce d'identité du gérant,
            adresse.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            Responsabilité sur les annonces
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Le vendeur garantit que ses lots sont conformes à la description,
            aux photos publiées et aux réglementations en vigueur (sécurité,
            étiquetage, douanes). Tout lot non conforme peut être retiré par
            Quicklot sans préavis.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            Expédition
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Le vendeur s'engage à expédier les commandes dans un délai maximum
            de 5 jours ouvrés après confirmation du paiement, sauf accord
            explicite avec l'acheteur.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            Commission et reversement
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Quicklot prélève 7,5% HT sur le montant de la vente hors frais de
            livraison. Le solde est reversé au vendeur selon les conditions de
            paiement Stripe Connect (délais standard Stripe applicables).
            Les prix des annonces sont saisis et affichés hors taxes (HT).
            La TVA est gérée automatiquement par Stripe Tax au moment du paiement.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            Sanctions
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            En cas de manquements répétés (retards d'expédition, descriptions
            inexactes, litiges non résolus), Quicklot se réserve le droit de
            suspendre ou supprimer le compte vendeur sans remboursement de la
            commission.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            Fiscalité
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Le vendeur est seul responsable de ses obligations fiscales et
            comptables. Quicklot transmet les données de transactions aux
            autorités fiscales conformément aux obligations légales
            européennes (DAC7).
          </p>
        </div>
      </div>
    </div>
  );
}
