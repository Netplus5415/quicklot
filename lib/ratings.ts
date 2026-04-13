export interface RatingRow {
  id?: string;
  rating?: number | null;
  score?: number | null;
  comment?: string | null;
  commentaire?: string | null;
  created_at?: string;
  reviewer?: { pseudo?: string | null; prenom?: string | null } | null;
  buyer?: { pseudo?: string | null; prenom?: string | null } | null;
}

export interface RatingStats {
  avg: number | null;
  count: number;
}

/**
 * Calcule la note moyenne et le nombre d'avis, en gérant la coexistence
 * des anciennes (`score`) et nouvelles (`rating`) colonnes.
 */
export function computeRatingStats(ratings: RatingRow[] | null | undefined): RatingStats {
  if (!ratings || ratings.length === 0) return { avg: null, count: 0 };
  const values = ratings
    .map((r) => r.rating ?? r.score ?? null)
    .filter((v): v is number => typeof v === "number" && !isNaN(v));
  if (values.length === 0) return { avg: null, count: 0 };
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return { avg, count: values.length };
}

export function ratingValue(r: RatingRow): number | null {
  return r.rating ?? r.score ?? null;
}

export function ratingComment(r: RatingRow): string | null {
  return r.comment ?? r.commentaire ?? null;
}

export function ratingReviewerName(r: RatingRow): string {
  return r.reviewer?.pseudo ?? r.reviewer?.prenom ?? r.buyer?.pseudo ?? r.buyer?.prenom ?? "Acheteur";
}

export function renderStarsString(avg: number | null): string {
  if (avg == null) return "";
  const rounded = Math.round(avg);
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}
