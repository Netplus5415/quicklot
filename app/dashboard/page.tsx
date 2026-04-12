"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface SaleOrder {
  id: string;
  listing_id: string;
  amount: number;
  seller_amount: number;
  status: string;
  created_at: string;
}

interface Listing {
  id: string;
  titre: string;
  prix: number;
  status: string;
  photo_url: string | null;
}

interface PurchaseOrder {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  listing: { titre: string; photo_url: string | null } | null;
}

export default function Dashboard() {
  const router = useRouter();
  const [prenom, setPrenom] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.replace("/connexion");
          return;
        }

        setPrenom(user.user_metadata?.prenom ?? user.email?.split("@")[0] ?? "là");

        const [
          { data: listings },
          { data: saleOrders },
          { data: purchaseOrders },
        ] = await Promise.all([
          supabase.from("listings").select("id, titre, prix, status, photo_url").eq("seller_id", user.id).neq("status", "removed").order("created_at", { ascending: false }),
          supabase
            .from("orders")
            .select("id, listing_id, amount, seller_amount, status, created_at")
            .eq("seller_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("orders")
            .select(`id, amount, status, created_at, listing:listing_id (titre, photo_url)`)
            .eq("buyer_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        setListings((listings as Listing[]) ?? []);
        setSales(saleOrders ?? []);
        setPurchases((purchaseOrders as unknown as PurchaseOrder[]) ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  }

  function statusBadge(status: string) {
    switch (status) {
      case "pending":   return { label: "En attente", color: "#f59e0b" };
      case "completed": return { label: "Terminée",   color: "#4ade80" };
      case "cancelled": return { label: "Annulée",    color: "#f87171" };
      default:          return { label: status,       color: "#9ca3af" };
    }
  }

  const listingsActifs = listings.filter((l) => l.status === "active").length;

  const solde = sales
    .filter((o) => o.status === "pending")
    .reduce((sum: number, o: SaleOrder) => sum + (o.seller_amount ?? 0), 0);

  async function handleSupprimer(id: string) {
    if (!window.confirm("Supprimer ce listing ? Cette action est irréversible.")) return;
    const { error } = await supabase.from("listings").update({ status: "removed" }).eq("id", id);
    if (!error) setListings((prev) => prev.filter((l) => l.id !== id));
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <p style={{ color: "#6b7280" }}>Chargement…</p>
      </div>
    );
  }

  const sectionTitle: React.CSSProperties = {
    color: "#fff", fontSize: "1.1rem", fontWeight: "600", margin: "0 0 1rem 0",
  };

  const card: React.CSSProperties = {
    backgroundColor: "#111", border: "1px solid #1f2937", borderRadius: "12px", overflow: "hidden",
  };

  const rowBase: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "1rem 1.25rem", flexWrap: "wrap", gap: "0.5rem",
  };

  return (
    <div style={{ backgroundColor: "#000", minHeight: "100vh", padding: "2rem", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ color: "#fff", fontSize: "1.75rem", fontWeight: "bold", margin: "0 0 0.25rem 0" }}>
              Bonjour {prenom} 👋
            </h1>
            <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: 0 }}>Voici un aperçu de votre activité.</p>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
            style={{ padding: "0.65rem 1.25rem", backgroundColor: "#1f2937", color: "#9ca3af", border: "none", borderRadius: "8px", fontSize: "0.95rem", fontWeight: "600", cursor: "pointer" }}
          >
            Déconnexion
          </button>
        </div>

        {/* Section Mes listings */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{ ...sectionTitle, margin: 0 }}>Mes listings</h2>
            <button
              onClick={() => router.push("/dashboard/listing/nouveau")}
              style={{ padding: "0.5rem 1rem", backgroundColor: "#9f1239", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
            >
              + Nouveau
            </button>
          </div>

          {listings.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Aucun listing pour le moment.</p>
          ) : (
            <div style={card}>
              {listings.map((listing, i) => (
                <div key={listing.id} style={{ ...rowBase, borderTop: i === 0 ? "none" : "1px solid #1f2937" }}>
                  {/* Miniature */}
                  {listing.photo_url ? (
                    <img src={listing.photo_url} alt={listing.titre} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: "60px", height: "60px", backgroundColor: "#1f2937", borderRadius: "6px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#4b5563", fontSize: "0.6rem" }}>N/A</span>
                    </div>
                  )}

                  {/* Titre + prix */}
                  <div style={{ flex: 1, minWidth: 0, padding: "0 0.75rem" }}>
                    <p style={{ color: "#fff", fontWeight: "600", fontSize: "0.9rem", margin: "0 0 0.2rem 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {listing.titre}
                    </p>
                    <span style={{ color: statusBadge(listing.status).color, fontSize: "0.75rem", fontWeight: "600" }}>
                      {listing.status}
                    </span>
                  </div>

                  <p style={{ color: "#fff", fontWeight: "bold", fontSize: "0.95rem", margin: "0 1rem 0 0", whiteSpace: "nowrap" }}>
                    {listing.prix.toFixed(2)} €
                  </p>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                    <button
                      onClick={() => router.push(`/dashboard/listing/${listing.id}/modifier`)}
                      style={{ padding: "0.35rem 0.75rem", backgroundColor: "#9f1239", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleSupprimer(listing.id)}
                      style={{ padding: "0.35rem 0.75rem", backgroundColor: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section Mes ventes — masquée si aucun listing actif */}
        {listingsActifs > 0 && (
          <div style={{ marginBottom: "2.5rem" }}>
            <h2 style={sectionTitle}>Mes ventes</h2>

            {/* Stats ventes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Listings actifs",   value: String(listingsActifs) },
                { label: "Commandes reçues",  value: String(sales.length) },
                { label: "Solde disponible",  value: `${Math.round(solde * 100) / 100} €` },
              ].map((s) => (
                <div key={s.label} style={{ backgroundColor: "#111", border: "1px solid #1f2937", borderRadius: "12px", padding: "1.25rem" }}>
                  <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: "0 0 0.4rem 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                  <p style={{ color: "#fff", fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Liste commandes reçues */}
            {sales.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Aucune commande reçue pour le moment.</p>
            ) : (
              <div style={card}>
                {sales.slice(0, 5).map((order, i) => {
                  const { label, color } = statusBadge(order.status);
                  return (
                    <div key={order.id} style={{ ...rowBase, borderTop: i === 0 ? "none" : "1px solid #1f2937" }}>
                      <div style={{ flex: 1, minWidth: "120px" }}>
                        <p style={{ color: "#9ca3af", fontSize: "0.7rem", margin: "0 0 0.15rem 0", textTransform: "uppercase" }}>Listing</p>
                        <p style={{ color: "#d1d5db", fontSize: "0.85rem", margin: 0, fontFamily: "monospace" }}>{order.listing_id.slice(0, 8)}…</p>
                      </div>
                      <div style={{ flex: 1, minWidth: "80px" }}>
                        <p style={{ color: "#9ca3af", fontSize: "0.7rem", margin: "0 0 0.15rem 0", textTransform: "uppercase" }}>Montant</p>
                        <p style={{ color: "#fff", fontSize: "0.95rem", fontWeight: "600", margin: 0 }}>{order.amount.toFixed(2)} €</p>
                      </div>
                      <div style={{ flex: 1, minWidth: "80px" }}>
                        <p style={{ color: "#9ca3af", fontSize: "0.7rem", margin: "0 0 0.15rem 0", textTransform: "uppercase" }}>Statut</p>
                        <span style={{ color, fontSize: "0.8rem", fontWeight: "600" }}>{label}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: "80px", textAlign: "right" }}>
                        <p style={{ color: "#9ca3af", fontSize: "0.7rem", margin: "0 0 0.15rem 0", textTransform: "uppercase" }}>Date</p>
                        <p style={{ color: "#d1d5db", fontSize: "0.85rem", margin: 0 }}>{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Section Mes achats */}
        <div>
          <h2 style={sectionTitle}>Mes achats</h2>

          {purchases.length === 0 ? (
            <div>
              <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "1rem" }}>Vous n'avez pas encore passé de commande.</p>
              <Link href="/boutique" style={{ backgroundColor: "#9f1239", color: "#fff", textDecoration: "none", padding: "0.65rem 1.25rem", borderRadius: "8px", fontSize: "0.9rem", fontWeight: "600" }}>
                Découvrir la boutique
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {purchases.map((order) => {
                const { label, color } = statusBadge(order.status);
                return (
                  <div key={order.id} style={{ ...card, display: "flex", alignItems: "center", gap: "1rem" }}>
                    {order.listing?.photo_url ? (
                      <img src={order.listing.photo_url} alt={order.listing.titre} style={{ width: "80px", height: "80px", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: "80px", height: "80px", backgroundColor: "#1f2937", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#4b5563", fontSize: "0.7rem" }}>Pas de photo</span>
                      </div>
                    )}
                    <div style={{ flex: 1, padding: "0.75rem 1rem 0.75rem 0", minWidth: 0 }}>
                      <p style={{ color: "#fff", fontWeight: "600", fontSize: "0.95rem", margin: "0 0 0.25rem 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {order.listing?.titre ?? "Listing supprimé"}
                      </p>
                      <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: "0 0 0.25rem 0" }}>{formatDate(order.created_at)}</p>
                      <span style={{ color, fontSize: "0.8rem", fontWeight: "600" }}>{label}</span>
                    </div>
                    <div style={{ padding: "0 1.25rem 0 0", flexShrink: 0 }}>
                      <p style={{ color: "#fff", fontSize: "1.05rem", fontWeight: "bold", margin: 0 }}>{order.amount.toFixed(2)} €</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
