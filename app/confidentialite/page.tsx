export default function Confidentialite() {
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
          Politique de confidentialité
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
            Responsable du traitement
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            AMZ Seller Consulting OÜ, contact@quicklot.fr
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            Données collectées
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Nom et prénom, adresse email, nom d'entreprise, numéro d'entreprise
            (KYC), pièce d'identité (KYC), adresse postale (KYC), données de
            navigation. Les données de paiement sont traitées directement par
            Stripe et ne sont jamais stockées par Quicklot.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            Finalités
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Création et gestion du compte, vérification d&apos;identité KYC,
            traitement des commandes, communications transactionnelles,
            amélioration de la plateforme. Lorsque vous y consentez,
            Quicklot peut également vous envoyer des conseils, nouveautés et
            opportunités de lots par email.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            Base légale
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Exécution du contrat, obligation légale pour le KYC, intérêt
            légitime pour la sécurité de la plateforme, consentement pour les
            communications marketing par email.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            Sous-traitants
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Supabase (hébergement des données, États-Unis, couvert par les
            clauses contractuelles types UE), Stripe (paiements, Irlande),
            Vercel (hébergement, États-Unis, couvert par les clauses
            contractuelles types UE), Brevo (emails transactionnels et, si
            vous y consentez, emails marketing, France).
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            Durée de conservation
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Données de compte actif conservées pendant toute la durée de la
            relation contractuelle puis 3 ans après la dernière activité.
            Données KYC conservées 5 ans conformément aux obligations légales
            anti-blanchiment.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            Droits des utilisateurs
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Droit d'accès, rectification, suppression, portabilité,
            opposition. Demande à adresser à contact@quicklot.fr. Réponse sous
            30 jours. Droit de réclamation auprès de l'autorité de contrôle
            compétente.
          </p>

          <h2
            style={{
              color: "#111827",
              fontSize: "1.25rem",
              fontWeight: "600",
              margin: "2rem 0 0.75rem 0",
            }}
          >
            Cookies
          </h2>
          <p style={{ margin: "0 0 1rem 0" }}>
            Quicklot utilise des cookies techniques nécessaires au
            fonctionnement du site et des cookies tiers déposés par Stripe
            dans le cadre du traitement des paiements.
          </p>
          <p style={{ margin: "0 0 1rem 0" }}>
            Avec votre consentement préalable, Quicklot dépose également des
            cookies de mesure d&apos;audience via le pixel Meta (Facebook /
            Instagram), afin de mesurer l&apos;usage du site, optimiser ses
            campagnes publicitaires et construire des audiences. Aucune donnée
            n&apos;est transmise à Meta tant que vous n&apos;avez pas accepté
            ces cookies dans le bandeau de consentement. Vous pouvez modifier
            ou retirer votre consentement à tout moment en cliquant sur
            «&nbsp;Gérer mes cookies&nbsp;» en bas de chaque page.
          </p>
        </div>
      </div>
    </div>
  );
}
