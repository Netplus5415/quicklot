export function getTauxTva(pays: string | null | undefined): number {
  const p = (pays ?? "").toLowerCase().trim();
  if (p.includes("belgique") || p.includes("belgium")) return 0.21;
  return 0.20;
}

export function calculTva(prixHt: number, pays: string | null | undefined) {
  const taux = getTauxTva(pays);
  const tva = Math.round(prixHt * taux * 100) / 100;
  const ttc = Math.round((prixHt + tva) * 100) / 100;
  return { ht: prixHt, taux, tva, ttc };
}
