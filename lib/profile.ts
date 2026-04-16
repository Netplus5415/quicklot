export interface ProfileLike {
  pseudo?: string | null;
  prenom?: string | null;
  nom_entreprise?: string | null;
  avatar_url?: string | null;
}

export function resolveDisplayName(
  profile: ProfileLike | null | undefined,
  fallback = "Membre"
): string {
  if (!profile) return fallback;
  return profile.pseudo || profile.nom_entreprise || profile.prenom || fallback;
}

export function resolveAvatar(
  profile: ProfileLike | null | undefined
): string | null {
  return profile?.avatar_url || null;
}
