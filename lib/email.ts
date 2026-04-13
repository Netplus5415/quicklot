const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("[email] BREVO_API_KEY non configurée");
    return { ok: false, error: "BREVO_API_KEY non configurée" };
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: "noreply@quicklot.fr", name: "Quicklot" },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[email] Brevo send failed:", res.status, text);
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[email] exception:", msg);
    return { ok: false, error: msg };
  }
}

// ── Templates ──

const wrapper = (body: string) => `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #111827; padding: 24px;">
  ${body}
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;" />
  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
    Cet email vous a été envoyé par <a href="https://www.quicklot.fr" style="color: #FF7D07; text-decoration: none;">Quicklot</a>, la marketplace du déstockage en France.
  </p>
</div>
`;

export interface ConfirmationAcheteurData {
  prenom?: string | null;
  titreListing: string;
  montant: number;
}

export function templateConfirmationAcheteur(data: ConfirmationAcheteurData): {
  subject: string;
  html: string;
} {
  const { prenom, titreListing, montant } = data;
  const html = wrapper(`
    <h1 style="color: #FF7D07; font-size: 22px; margin: 0 0 16px;">Votre commande est confirmée ✓</h1>
    <p>Bonjour${prenom ? ` ${prenom}` : ""},</p>
    <p>Votre paiement sur Quicklot a bien été reçu. Voici le récapitulatif de votre commande :</p>
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px; font-weight: 600;">${titreListing}</p>
      <p style="margin: 0; color: #FF7D07; font-size: 18px; font-weight: 700;">${montant.toFixed(2)} €</p>
    </div>
    <p>Le vendeur a été notifié et préparera votre commande dans les plus brefs délais. Vous recevrez un nouvel email dès l'expédition avec le numéro de suivi.</p>
    <p style="margin-top: 24px;">Merci de votre confiance !</p>
  `);
  return { subject: "Votre commande est confirmée — Quicklot", html };
}

export interface NotificationVendeurData {
  prenom?: string | null;
  titreListing: string;
  montant: number;
  acheteurPrenom?: string | null;
  orderId?: string | null;
}

export function templateNotificationVendeur(data: NotificationVendeurData): {
  subject: string;
  html: string;
} {
  const { prenom, titreListing, montant, acheteurPrenom, orderId } = data;
  const ctaUrl = orderId
    ? `https://www.quicklot.fr/dashboard/commandes/${orderId}`
    : "https://www.quicklot.fr/dashboard#mes-ventes";
  const html = wrapper(`
    <h1 style="color: #FF7D07; font-size: 22px; margin: 0 0 16px;">🎉 Vous avez une nouvelle commande</h1>
    <p>Bonjour${prenom ? ` ${prenom}` : ""},</p>
    <p>Bonne nouvelle : ${acheteurPrenom ?? "un acheteur"} vient d'acheter l'un de vos lots sur Quicklot.</p>
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px; font-weight: 600;">${titreListing}</p>
      <p style="margin: 0; color: #FF7D07; font-size: 18px; font-weight: 700;">${montant.toFixed(2)} €</p>
    </div>
    <p>Cliquez ci-dessous pour ouvrir la commande et renseigner les informations d'expédition.</p>
    <p style="margin-top: 24px;">
      <a href="${ctaUrl}" style="background: #FF7D07; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; display: inline-block;">Traiter la commande</a>
    </p>
  `);
  return { subject: "Nouvelle commande reçue — Quicklot", html };
}

export interface PreparationAcheteurData {
  prenom?: string | null;
  titreListing: string;
}

export function templatePreparationAcheteur(data: PreparationAcheteurData): {
  subject: string;
  html: string;
} {
  const { prenom, titreListing } = data;
  const html = wrapper(`
    <h1 style="color: #FF7D07; font-size: 22px; margin: 0 0 16px;">📦 Votre commande est en préparation</h1>
    <p>Bonjour${prenom ? ` ${prenom}` : ""},</p>
    <p>Bonne nouvelle : le vendeur prépare actuellement votre commande sur Quicklot.</p>
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-weight: 600;">${titreListing}</p>
    </div>
    <p>Vous recevrez un nouvel email dès l'expédition avec le numéro de suivi.</p>
    <p style="margin-top: 24px;">
      <a href="https://www.quicklot.fr/dashboard/acheteur" style="background: #FF7D07; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; display: block; max-width: 100%; box-sizing: border-box; text-align: center;">Voir mes achats</a>
    </p>
  `);
  return { subject: "Votre commande est en cours de préparation — Quicklot", html };
}

export interface KycApprouveData {
  prenom?: string | null;
}

export function templateKycApprouve(data: KycApprouveData): {
  subject: string;
  html: string;
} {
  const { prenom } = data;
  const html = wrapper(`
    <h1 style="color: #16a34a; font-size: 22px; margin: 0 0 16px;">✓ Votre compte vendeur est validé</h1>
    <p>Bonjour${prenom ? ` ${prenom}` : ""},</p>
    <p>Bonne nouvelle : votre demande de vérification KYC a été <strong>approuvée</strong>.</p>
    <p>Vous pouvez dès maintenant publier vos listings sur Quicklot et profiter de toutes les fonctionnalités vendeur, dont le badge suivant sur votre profil public :</p>
    <p style="margin: 12px 0;">
      <span style="background: #FF7D07; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; display: inline-block;">✓ Vendeur vérifié</span>
    </p>
    <p style="margin-top: 24px;">
      <a href="https://www.quicklot.fr/dashboard/listing/nouveau" style="background: #FF7D07; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; display: block; max-width: 100%; box-sizing: border-box; text-align: center;">Publier mon premier listing</a>
    </p>
  `);
  return { subject: "Votre compte vendeur est validé — Quicklot", html };
}

export interface KycRefuseData {
  prenom?: string | null;
  raison?: string | null;
}

export function templateKycRefuse(data: KycRefuseData): {
  subject: string;
  html: string;
} {
  const { prenom, raison } = data;
  const raisonBlock = raison
    ? `<div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0 0 4px; color: #991b1b; font-size: 13px; font-weight: 600;">Raison du refus</p>
        <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">${raison}</p>
      </div>`
    : "";
  const html = wrapper(`
    <h1 style="color: #dc2626; font-size: 22px; margin: 0 0 16px;">Votre demande de vérification a été refusée</h1>
    <p>Bonjour${prenom ? ` ${prenom}` : ""},</p>
    <p>Nous avons examiné votre demande de vérification KYC et celle-ci n'a pas pu être validée en l'état.</p>
    ${raisonBlock}
    <p>Vous pouvez soumettre une nouvelle demande depuis votre dashboard en prenant en compte les remarques ci-dessus.</p>
    <p style="margin-top: 24px;">
      <a href="https://www.quicklot.fr/dashboard" style="background: #FF7D07; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; display: inline-block;">Soumettre une nouvelle demande</a>
    </p>
  `);
  return { subject: "Votre demande de vérification a été refusée — Quicklot", html };
}

// ── Modération listings ──

export interface NouveauListingAdminData {
  listingId: string;
  titre: string;
  description: string;
  prix: number;
  sellerName?: string | null;
  sellerEmail?: string | null;
}

export function templateNouveauListingAdmin(data: NouveauListingAdminData): {
  subject: string;
  html: string;
} {
  const { listingId, titre, description, prix, sellerName, sellerEmail } = data;
  const descShort = description.length > 300 ? description.slice(0, 300) + "…" : description;
  const html = wrapper(`
    <h1 style="color: #FF7D07; font-size: 22px; margin: 0 0 16px;">📥 Nouveau listing à modérer</h1>
    <p>Un vendeur vient de soumettre un nouveau listing sur Quicklot.</p>
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px; font-weight: 600; font-size: 16px;">${titre}</p>
      <p style="margin: 0 0 8px; color: #FF7D07; font-size: 18px; font-weight: 700;">${prix.toFixed(2)} €</p>
      <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">
        Vendeur : <strong style="color: #374151;">${sellerName ?? "—"}</strong>${sellerEmail ? ` · ${sellerEmail}` : ""}
      </p>
      <p style="margin: 12px 0 0; color: #374151; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${descShort}</p>
    </div>
    <p style="margin-top: 20px;">
      <a href="https://www.quicklot.fr/admin" style="background: #FF7D07; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; display: inline-block;">Ouvrir le panel admin</a>
    </p>
    <p style="color: #9ca3af; font-size: 11px; margin-top: 16px;">ID : ${listingId}</p>
  `);
  return { subject: `[Quicklot Admin] Nouveau listing — ${titre}`, html };
}

export interface ListingApprouveData {
  prenom?: string | null;
  titre: string;
  listingId: string;
}

export function templateListingApprouve(data: ListingApprouveData): {
  subject: string;
  html: string;
} {
  const { prenom, titre, listingId } = data;
  const html = wrapper(`
    <h1 style="color: #16a34a; font-size: 22px; margin: 0 0 16px;">✓ Votre listing est approuvé</h1>
    <p>Bonjour${prenom ? ` ${prenom}` : ""},</p>
    <p>Bonne nouvelle : votre listing <strong>${titre}</strong> vient d'être validé et est désormais visible par tous les acheteurs sur Quicklot.</p>
    <p style="margin-top: 20px;">
      <a href="https://www.quicklot.fr/boutique/${listingId}" style="background: #FF7D07; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; display: inline-block;">Voir mon listing en ligne</a>
    </p>
  `);
  return { subject: `Votre listing "${titre}" est en ligne — Quicklot`, html };
}

export interface ListingRefuseData {
  prenom?: string | null;
  titre: string;
  raison?: string | null;
}

export function templateListingRefuse(data: ListingRefuseData): {
  subject: string;
  html: string;
} {
  const { prenom, titre, raison } = data;
  const raisonBlock = raison
    ? `<div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0 0 4px; color: #991b1b; font-size: 13px; font-weight: 600;">Raison du refus</p>
        <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">${raison}</p>
      </div>`
    : "";
  const html = wrapper(`
    <h1 style="color: #dc2626; font-size: 22px; margin: 0 0 16px;">Votre listing n'a pas été validé</h1>
    <p>Bonjour${prenom ? ` ${prenom}` : ""},</p>
    <p>Votre listing <strong>${titre}</strong> n'a pas pu être validé en l'état.</p>
    ${raisonBlock}
    <p>Vous pouvez créer un nouveau listing en prenant en compte les remarques ci-dessus.</p>
    <p style="margin-top: 20px;">
      <a href="https://www.quicklot.fr/dashboard/listing/nouveau" style="background: #FF7D07; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; display: inline-block;">Créer un nouveau listing</a>
    </p>
  `);
  return { subject: `Votre listing "${titre}" n'a pas été validé — Quicklot`, html };
}

export interface ExpeditionAcheteurData {
  prenom?: string | null;
  titreListing: string;
  transporteur: string;
  numeroSuivi: string;
  trackingUrl?: string | null;
}

export function templateExpeditionAcheteur(data: ExpeditionAcheteurData): {
  subject: string;
  html: string;
} {
  const { prenom, titreListing, transporteur, numeroSuivi, trackingUrl } = data;
  const suiviLine = trackingUrl
    ? `<a href="${trackingUrl}" style="color: #FF7D07; font-weight: 600;">${numeroSuivi}</a>`
    : `<strong>${numeroSuivi}</strong>`;
  const html = wrapper(`
    <h1 style="color: #FF7D07; font-size: 22px; margin: 0 0 16px;">📦 Votre commande a été expédiée</h1>
    <p>Bonjour${prenom ? ` ${prenom}` : ""},</p>
    <p>Bonne nouvelle : votre commande <strong>${titreListing}</strong> a été expédiée par le vendeur.</p>
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 4px; color: #6b7280; font-size: 13px;">Transporteur</p>
      <p style="margin: 0 0 12px; font-weight: 600;">${transporteur}</p>
      <p style="margin: 0 0 4px; color: #6b7280; font-size: 13px;">Numéro de suivi</p>
      <p style="margin: 0;">${suiviLine}</p>
    </div>
    <p>Vous pouvez suivre votre colis à tout moment depuis votre tableau de bord.</p>
  `);
  return { subject: "Votre commande a été expédiée — Quicklot", html };
}
