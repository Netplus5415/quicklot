export interface SellerProfileShape {
  bio?: string | null;
  nom_entreprise?: string | null;
  numero_entreprise?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  pays?: string | null;
  seller_profile_completed_at?: string | null;
  kyc_status?: string | null;
  stripe_account_status?: string | null;
}

export const SELLER_PROFILE_COLUMNS =
  "bio, nom_entreprise, numero_entreprise, adresse, code_postal, ville, pays, seller_profile_completed_at, kyc_status, stripe_account_status";

const REQUIRED_FIELDS = [
  "bio",
  "nom_entreprise",
  "numero_entreprise",
  "adresse",
  "code_postal",
  "ville",
  "pays",
] as const satisfies ReadonlyArray<keyof SellerProfileShape>;

function isFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasAllRequiredSellerFields(
  user: SellerProfileShape | null | undefined
): boolean {
  if (!user) return false;
  return REQUIRED_FIELDS.every((field) => isFilled(user[field]));
}

export function isSellerProfileComplete(
  user: SellerProfileShape | null | undefined
): boolean {
  if (!user) return false;
  if (isFilled(user.seller_profile_completed_at)) return true;
  if (user.kyc_status === "verified") return true;
  if (user.stripe_account_status === "active") return true;
  return hasAllRequiredSellerFields(user);
}
