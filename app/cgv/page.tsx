export default function CGV() {
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
          Conditions Générales de Vente et d'Utilisation
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
            1. Objet et statut de la plateforme
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Quicklot est une plateforme de mise en relation entre vendeurs
            professionnels et acheteurs. Quicklot n'est pas vendeur, n'est pas
            propriétaire des lots proposés et n'intervient pas dans la relation
            commerciale entre vendeurs et acheteurs. Chaque vendeur est seul
            responsable de ses annonces, de la conformité de ses produits et de
            l'exécution des commandes.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            2. Accès à la plateforme
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Inscription gratuite, réservée aux professionnels pour la vente.
            Une vérification KYC est obligatoire avant toute mise en vente.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            3. Commission
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Quicklot prélève une commission de 7,5% HT sur le montant de chaque
            transaction réalisée via la plateforme, déduite automatiquement au
            moment du paiement.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            4. Abonnement vendeur
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Une formule d'abonnement payant pour les vendeurs sera introduite
            prochainement. Les vendeurs actuels seront informés au moins 30
            jours avant son entrée en vigueur.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            5. Obligations du vendeur
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Description exacte et complète des lots, photos représentatives,
            expédition dans les délais annoncés, respect des réglementations
            douanières et fiscales applicables.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            6. Obligations de l'acheteur
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Paiement immédiat via Stripe, information du vendeur en cas de
            problème à réception.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            7. Litiges
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            En cas de litige entre acheteur et vendeur, Quicklot peut
            intervenir en tant que médiateur sans obligation de résultat.
            Quicklot ne garantit pas le bon déroulement des transactions et ne
            peut être tenu responsable des manquements des vendeurs ou
            acheteurs.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            8. Remboursements
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Tout remboursement est soumis à accord entre acheteur et vendeur.
            Quicklot peut faciliter le processus mais ne prend pas en charge
            les remboursements sauf faute prouvée de la plateforme.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            9. Droit applicable
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Les présentes CGV sont soumises au droit estonien et au droit
            européen applicable. Tout litige sera porté devant les juridictions
            compétentes.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            10. Modification des CGV
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Quicklot se réserve le droit de modifier les présentes CGV à tout
            moment avec préavis de 15 jours aux utilisateurs inscrits.
          </p>
        </div>
      </div>
    </div>
  );
}
