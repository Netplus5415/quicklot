export const CATEGORIES = [
  "Électronique & Informatique",
  "Maison & Décoration",
  "Mode & Textile",
  "Jouets & Jeux",
  "Beauté & Santé",
  "Alimentation & Boissons",
  "Sport & Loisirs",
  "Auto & Moto",
  "Livres & Médias",
  "Divers",
] as const;

export type Categorie = typeof CATEGORIES[number];
