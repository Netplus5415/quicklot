"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Listing {
  id: string;
  titre: string;
  prix: number;
  status: string;
  seller_email?: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface Order {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.replace("/");
          return;
        }

        if (user.email !== "contact@universpieds.fr") {
          router.replace("/");
          return;
        }

        const [{ data: listingsData }, { data: usersData }, { data: ordersData }] =
          await Promise.all([
            supabase.from("listings").select("id, titre, prix, status, seller_id").order("created_at", { ascending: false }),
            supabase.from("users").select("id, email, role, created_at").order("created_at", { ascending: false }),
            supabase.from("orders").select("id, amount, status, created_at").order("created_at", { ascending: false }),
          ]);

        const usersMap: Record<string, string> = {};
        (usersData ?? []).forEach((u: User) => { usersMap[u.id] = u.email; });

        const enriched = (listingsData ?? []).map((l: Listing & { seller_id?: string }) => ({
          ...l,
          seller_email: l.seller_id ? (usersMap[l.seller_id] ?? l.seller_id.slice(0, 8) + "…") : "—",
        }));

        setListings(enriched);
        setUsers(usersData ?? []);
        setOrders(ordersData ?? []);
      } finally {
        setAuthLoading(false);
      }
    }

    load();
  }, [router]);

  async function handleSupprimer(listingId: string) {
    const { error } = await supabase
      .from("listings")
      .update({ status: "removed" })
      .eq("id", listingId);

    if (!error) {
      setListings((prev) =>
        prev.map((l) => l.id === listingId ? { ...l, status: "removed" } : l)
      );
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  function statusColor(status: string) {
    switch (status) {
      case "active": return "#4ade80";
      case "pending": return "#f59e0b";
      case "removed":
      case "cancelled": return "#f87171";
      case "completed": return "#60a5fa";
      default: return "#9ca3af";
    }
  }

  if (authLoading) {
    return (
      <div style={{ backgroundColor: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <p style={{ color: "#6b7280" }}>Vérification des accès…</p>
      </div>
    );
  }

  const thStyle: React.CSSProperties = {
    color: "#6b7280",
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "0.75rem 1rem",
    textAlign: "left",
    borderBottom: "1px solid #1f2937",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    color: "#d1d5db",
    fontSize: "0.875rem",
    padding: "0.75rem 1rem",
    borderBottom: "1px solid #111",
    verticalAlign: "middle",
  };

  const sectionTitleStyle: React.CSSProperties = {
    color: "#fff",
    fontSize: "1.1rem",
    fontWeight: "600",
    margin: "0 0 1rem 0",
  };

  const tableWrapStyle: React.CSSProperties = {
    backgroundColor: "#111",
    border: "1px solid #1f2937",
    borderRadius: "12px",
    overflow: "hidden",
    overflowX: "auto",
    marginBottom: "2.5rem",
  };

  return (
    <div style={{ backgroundColor: "#000", minHeight: "100vh", padding: "2rem", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        <h1 style={{ color: "#fff", fontSize: "1.75rem", fontWeight: "bold", margin: "0 0 2rem 0" }}>
          Panel Admin
        </h1>

        {/* LISTINGS */}
        <h2 style={sectionTitleStyle}>Listings ({listings.length})</h2>
        <div style={tableWrapStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#0a0a0a" }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Titre</th>
                <th style={thStyle}>Vendeur</th>
                <th style={thStyle}>Prix</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {listings.length === 0 ? (
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#6b7280" }}>Aucun listing.</td></tr>
              ) : listings.map((l) => (
                <tr key={l.id}>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "0.8rem", color: "#6b7280" }}>{l.id.slice(0, 8)}…</td>
                  <td style={tdStyle}>{l.titre}</td>
                  <td style={{ ...tdStyle, color: "#9ca3af", fontSize: "0.8rem" }}>{l.seller_email}</td>
                  <td style={{ ...tdStyle, fontWeight: "600", color: "#fff" }}>{l.prix.toFixed(2)} €</td>
                  <td style={tdStyle}>
                    <span style={{ color: statusColor(l.status), fontWeight: "600", fontSize: "0.8rem" }}>{l.status}</span>
                  </td>
                  <td style={tdStyle}>
                    {l.status !== "removed" ? (
                      <button
                        onClick={() => handleSupprimer(l.id)}
                        style={{
                          backgroundColor: "#7f1d1d",
                          color: "#fca5a5",
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.3rem 0.75rem",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        Supprimer
                      </button>
                    ) : (
                      <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>Supprimé</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* UTILISATEURS */}
        <h2 style={sectionTitleStyle}>Utilisateurs ({users.length})</h2>
        <div style={tableWrapStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#0a0a0a" }}>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Rôle</th>
                <th style={thStyle}>Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={3} style={{ ...tdStyle, textAlign: "center", color: "#6b7280" }}>Aucun utilisateur.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>
                    <span style={{
                      color: u.role === "admin" ? "#f59e0b" : u.role === "seller" ? "#a78bfa" : "#60a5fa",
                      fontWeight: "600",
                      fontSize: "0.8rem",
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: "#6b7280" }}>{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* COMMANDES */}
        <h2 style={sectionTitleStyle}>Commandes ({orders.length})</h2>
        <div style={tableWrapStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#0a0a0a" }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Montant</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "#6b7280" }}>Aucune commande.</td></tr>
              ) : orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "0.8rem", color: "#6b7280" }}>{o.id.slice(0, 8)}…</td>
                  <td style={{ ...tdStyle, fontWeight: "600", color: "#fff" }}>{o.amount.toFixed(2)} €</td>
                  <td style={tdStyle}>
                    <span style={{ color: statusColor(o.status), fontWeight: "600", fontSize: "0.8rem" }}>{o.status}</span>
                  </td>
                  <td style={{ ...tdStyle, color: "#6b7280" }}>{formatDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
