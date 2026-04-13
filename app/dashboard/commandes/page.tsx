"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface OrderRow {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  seller_amount: number;
  commission_amount: number | null;
  statut: string | null;
  transporteur: string | null;
  numero_suivi: string | null;
  etiquettes_url: string | null;
  notes_vendeur: string | null;
  shipping_mode: string | null;
  livraison_mode: string | null;
  stripe_session_id: string | null;
  created_at: string;
  listing: { titre: string; photo_url: string | null } | null;
  buyer: { prenom: string | null; pseudo: string | null; email: string; avatar_url: string | null } | null;
}

function statutBadge(statut: string | null) {
  switch (statut) {
    case "paid":      return { label: "Payée",          bg: "#ffedd5", color: "#c2410c" };
    case "preparing": return { label: "En préparation", bg: "#dbeafe", color: "#2563eb" };
    case "shipped":   return { label: "Expédiée",       bg: "#ede9fe", color: "#7c3aed" };
    case "delivered": return { label: "Livrée",         bg: "#dcfce7", color: "#16a34a" };
    case "cancelled": return { label: "Annulée",        bg: "#f3f4f6", color: "#6b7280" };
    default:          return { label: statut ?? "—",    bg: "#f3f4f6", color: "#6b7280" };
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function shippingLabel(mode: string | null): string {
  switch (mode) {
    case "enlevement": return "Enlèvement sur place";
    case "france":     return "Livraison France";
    case "belgique":   return "Livraison Belgique";
    case "amazon":
    case "fba":        return "Préparation Amazon FBA";
    default:           return mode ?? "—";
  }
}

export default function CommandesListe() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.replace("/connexion");
          return;
        }

        const { data, error } = await supabase
          .from("orders")
          .select(
            `*,
             listing:listing_id!left (titre, photo_url),
             buyer:buyer_id!left (prenom, pseudo, email, avatar_url)`
          )
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[commandes] query error:", error.message, error.details, error.hint);
        }

        console.log("[commandes] loaded:", data?.length ?? 0);
        setOrders((data as unknown as OrderRow[]) ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div style={{ backgroundColor: "#ffffff", minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <p style={{ color: "#6b7280" }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#f9fafb", minHeight: "calc(100vh - 56px)", padding: "2rem", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <Link
          href="/dashboard"
          style={{ color: "#6b7280", fontSize: "0.875rem", textDecoration: "none", display: "inline-block", marginBottom: "1.5rem" }}
        >
          ← Retour au dashboard
        </Link>

        <h1 style={{ color: "#111827", fontSize: "1.75rem", fontWeight: "bold", margin: "0 0 0.5rem 0" }}>
          Mes ventes
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: "0 0 2rem 0" }}>
          Toutes vos ventes reçues sur Quicklot.
        </p>

        {orders.length === 0 ? (
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: 0 }}>
              Aucune commande reçue pour le moment.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {orders.map((order) => {
              const statut = order.statut;
              const badge = statutBadge(statut);
              const buyerName = order.buyer?.pseudo || order.buyer?.prenom || order.buyer?.email?.split("@")[0] || "Acheteur";
              const mode = order.livraison_mode ?? order.shipping_mode;

              return (
                <div key={order.id} style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  {/* Photo */}
                  {order.listing?.photo_url ? (
                    <img src={order.listing.photo_url} alt={order.listing.titre} style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: "72px", height: "72px", backgroundColor: "#f3f4f6", borderRadius: "8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#9ca3af", fontSize: "0.65rem" }}>N/A</span>
                    </div>
                  )}

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <p style={{ color: "#111827", fontSize: "0.95rem", fontWeight: "600", margin: "0 0 0.2rem 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {order.listing?.titre ?? "Listing supprimé"}
                    </p>
                    <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: "0 0 0.2rem 0" }}>
                      {buyerName} · {formatDate(order.created_at)}
                    </p>
                    <p style={{ color: "#9ca3af", fontSize: "0.75rem", margin: 0 }}>
                      {shippingLabel(mode)}
                    </p>
                  </div>

                  {/* Montant + badge */}
                  <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.35rem" }}>
                    <p style={{ color: "#111827", fontWeight: "700", fontSize: "1rem", margin: 0 }}>
                      {(order.seller_amount ?? 0).toFixed(2)} €
                    </p>
                    <span style={{ backgroundColor: badge.bg, color: badge.color, fontSize: "0.68rem", fontWeight: "700", padding: "0.2rem 0.55rem", borderRadius: "999px", textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap" }}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Bouton */}
                  <button
                    onClick={() => router.push(`/dashboard/commandes/${order.id}`)}
                    style={{ backgroundColor: "#FF7D07", color: "#ffffff", border: "none", borderRadius: "8px", padding: "0.55rem 1.1rem", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    Gérer →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
