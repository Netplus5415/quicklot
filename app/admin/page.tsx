"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const GENERIC_ERROR = "Une erreur est survenue, veuillez réessayer.";

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

interface KycRequest {
  id: string;
  user_id: string;
  nom_entreprise: string;
  numero_entreprise: string;
  document_url: string | null;
  piece_identite_url: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville_kyc: string | null;
  pays: string | null;
  statut: string;
  created_at: string;
  user_email?: string;
}

interface PendingListing {
  id: string;
  seller_id: string;
  titre: string;
  description: string;
  type: string;
  prix: number;
  photo_url: string | null;
  created_at: string;
  seller_email?: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [kycRequests, setKycRequests] = useState<KycRequest[]>([]);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [listingRejectNote, setListingRejectNote] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(text: string, error = false) {
    setToast({ text, error });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  async function loadPendingListings(usersMap?: Record<string, string>) {
    const { data, error } = await supabase
      .from("listings")
      .select("id, seller_id, titre, description, type, prix, photo_url, created_at")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin] loadPendingListings error:", error);
      return;
    }

    let map = usersMap;
    if (!map) {
      const { data: usersData } = await supabase.from("users").select("id, email");
      map = {};
      (usersData ?? []).forEach((u: { id: string; email: string }) => { map![u.id] = u.email; });
    }

    const enriched = (data ?? []).map((l) => ({
      ...(l as PendingListing),
      seller_email: map![(l as PendingListing).seller_id] ?? (l as PendingListing).seller_id.slice(0, 8) + "…",
    }));
    setPendingListings(enriched);
  }

  async function loadKycRequests(usersMap?: Record<string, string>) {
    const { data: kycData, error } = await supabase
      .from("kyc_requests")
      .select("*")
      .eq("statut", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin] loadKycRequests error:", error);
      showToast(GENERIC_ERROR, true);
      return;
    }

    let map = usersMap;
    if (!map) {
      const { data: usersData } = await supabase.from("users").select("id, email");
      map = {};
      (usersData ?? []).forEach((u: { id: string; email: string }) => { map![u.id] = u.email; });
    }

    const kycEnriched = ((kycData ?? []) as KycRequest[]).map((k) => ({
      ...k,
      user_email: map![k.user_id] ?? k.user_id.slice(0, 8) + "…",
    }));
    setKycRequests(kycEnriched);
  }

  useEffect(() => {
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.replace("/");
          return;
        }

        if (user.email !== "contact@quicklot.fr") {
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

        await Promise.all([
          loadKycRequests(usersMap),
          loadPendingListings(usersMap),
        ]);
      } finally {
        setAuthLoading(false);
      }
    }

    load();
  }, [router]);

  async function handleKycApprove(req: KycRequest) {
    // Update kyc_requests — use .select() to detect 0-row RLS blocks
    const { data: kycUpdated, error: kycErr } = await supabase
      .from("kyc_requests")
      .update({ statut: "approved", note_admin: null, updated_at: new Date().toISOString() })
      .eq("id", req.id)
      .select();

    if (kycErr) {
      console.error("[admin] kyc_requests approve error:", kycErr);
      showToast(GENERIC_ERROR, true);
      return;
    }
    if (!kycUpdated || kycUpdated.length === 0) {
      console.error("[admin] kyc_requests approve: 0 rows affected (RLS block probable)", { reqId: req.id });
      showToast(GENERIC_ERROR, true);
      return;
    }

    // Update public.users
    const { data: userUpdated, error: userErr } = await supabase
      .from("users")
      .update({ kyc_status: "verified" })
      .eq("id", req.user_id)
      .select();

    if (userErr) {
      console.error("[admin] users approve error:", userErr);
      showToast(GENERIC_ERROR, true);
      return;
    }
    if (!userUpdated || userUpdated.length === 0) {
      console.error("[admin] users approve: 0 rows affected (RLS block probable)", { userId: req.user_id });
      showToast(GENERIC_ERROR, true);
      return;
    }

    // Email notification (best-effort)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch("/api/kyc-notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId: req.user_id, action: "approved" }),
        });
      }
    } catch (err) {
      console.error("[admin] kyc-notify approve error:", err);
    }

    showToast("Demande KYC approuvée ✓", false);
    await loadKycRequests();
  }

  async function handleKycReject(req: KycRequest) {
    const note = rejectNote[req.id]?.trim();
    if (!note) { showToast("Veuillez saisir une raison de refus.", true); return; }

    const { data: kycUpdated, error: kycErr } = await supabase
      .from("kyc_requests")
      .update({ statut: "rejected", note_admin: note, updated_at: new Date().toISOString() })
      .eq("id", req.id)
      .select();

    if (kycErr) {
      console.error("[admin] kyc_requests reject error:", kycErr);
      showToast(GENERIC_ERROR, true);
      return;
    }
    if (!kycUpdated || kycUpdated.length === 0) {
      console.error("[admin] kyc_requests reject: 0 rows affected (RLS block probable)", { reqId: req.id });
      showToast(GENERIC_ERROR, true);
      return;
    }

    const { data: userUpdated, error: userErr } = await supabase
      .from("users")
      .update({ kyc_status: "rejected" })
      .eq("id", req.user_id)
      .select();

    if (userErr) {
      console.error("[admin] users reject error:", userErr);
      showToast(GENERIC_ERROR, true);
      return;
    }
    if (!userUpdated || userUpdated.length === 0) {
      console.error("[admin] users reject: 0 rows affected (RLS block probable)", { userId: req.user_id });
      showToast(GENERIC_ERROR, true);
      return;
    }

    // Email notification (best-effort)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch("/api/kyc-notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId: req.user_id, action: "rejected", raison: note }),
        });
      }
    } catch (err) {
      console.error("[admin] kyc-notify reject error:", err);
    }

    setRejectNote((prev) => { const n = { ...prev }; delete n[req.id]; return n; });
    showToast("Demande KYC refusée", false);
    await loadKycRequests();
  }

  async function handleListingApprove(listing: PendingListing) {
    const { data: updated, error } = await supabase
      .from("listings")
      .update({ status: "active", moderation_note: null })
      .eq("id", listing.id)
      .select();

    if (error) {
      console.error("[admin] listing approve error:", error);
      showToast(GENERIC_ERROR, true);
      return;
    }
    if (!updated || updated.length === 0) {
      console.error("[admin] listing approve: 0 rows affected");
      showToast(GENERIC_ERROR, true);
      return;
    }

    // Notifier le vendeur
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch("/api/listing-notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "approved", listingId: listing.id }),
        });
      }
    } catch (err) {
      console.error("[admin] listing-notify approve error:", err);
    }

    showToast("Listing approuvé ✓", false);
    await loadPendingListings();
  }

  async function handleListingReject(listing: PendingListing) {
    const note = listingRejectNote[listing.id]?.trim();
    if (!note) {
      showToast("Veuillez saisir une raison de refus.", true);
      return;
    }

    const { data: updated, error } = await supabase
      .from("listings")
      .update({ status: "rejected", moderation_note: note })
      .eq("id", listing.id)
      .select();

    if (error) {
      console.error("[admin] listing reject error:", error);
      showToast(GENERIC_ERROR, true);
      return;
    }
    if (!updated || updated.length === 0) {
      console.error("[admin] listing reject: 0 rows affected");
      showToast(GENERIC_ERROR, true);
      return;
    }

    // Notifier le vendeur
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch("/api/listing-notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "rejected", listingId: listing.id, raison: note }),
        });
      }
    } catch (err) {
      console.error("[admin] listing-notify reject error:", err);
    }

    setListingRejectNote((prev) => { const n = { ...prev }; delete n[listing.id]; return n; });
    showToast("Listing refusé", false);
    await loadPendingListings();
  }

  async function handleDownloadDocument(path: string) {
    const { data, error } = await supabase.storage
      .from("kyc-documents")
      .createSignedUrl(path, 60 * 5);
    if (error || !data) {
      console.error("[admin] download document error:", error);
      showToast(GENERIC_ERROR, true);
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

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
      case "active": return "#16a34a";
      case "pending": return "#d97706";
      case "removed":
      case "cancelled": return "#dc2626";
      case "completed": return "#2563eb";
      default: return "#6b7280";
    }
  }

  if (authLoading) {
    return (
      <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
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
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    color: "#374151",
    fontSize: "0.875rem",
    padding: "0.75rem 1rem",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "middle",
  };

  const sectionTitleStyle: React.CSSProperties = {
    color: "#111827",
    fontSize: "1.1rem",
    fontWeight: "600",
    margin: "0 0 1rem 0",
  };

  const tableWrapStyle: React.CSSProperties = {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
    overflowX: "auto",
    marginBottom: "2.5rem",
  };

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", padding: "2rem", fontFamily: "sans-serif" }}>
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: "72px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            backgroundColor: toast.error ? "#fef2f2" : "#f0fdf4",
            color: toast.error ? "#991b1b" : "#166534",
            border: `1px solid ${toast.error ? "#fca5a5" : "#86efac"}`,
            borderRadius: "10px",
            padding: "0.75rem 1.25rem",
            fontSize: "0.9rem",
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            maxWidth: "calc(100% - 2rem)",
          }}
        >
          {toast.text}
        </div>
      )}
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        <h1 style={{ color: "#111827", fontSize: "1.75rem", fontWeight: "bold", margin: "0 0 2rem 0" }}>
          Panel Admin
        </h1>

        {/* KYC REQUESTS */}
        <h2 style={sectionTitleStyle}>
          Demandes de vérification ({kycRequests.length})
        </h2>
        {kycRequests.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "2.5rem" }}>
            Aucune demande en attente.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2.5rem" }}>
            {kycRequests.map((req) => (
              <div key={req.id} style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <p style={{ color: "#111827", fontWeight: "600", fontSize: "1rem", margin: "0 0 0.25rem 0" }}>
                      {req.nom_entreprise}
                    </p>
                    <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 0.25rem 0" }}>
                      N° : <span style={{ fontFamily: "monospace" }}>{req.numero_entreprise}</span>
                    </p>
                    {(req.adresse || req.code_postal || req.ville_kyc || req.pays) && (
                      <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: "0 0 0.25rem 0" }}>
                        📍 {[req.adresse, [req.code_postal, req.ville_kyc].filter(Boolean).join(" "), req.pays].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: 0 }}>
                      {req.user_email} · {formatDate(req.created_at)}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0 }}>
                    {req.document_url && (
                      <button
                        onClick={() => handleDownloadDocument(req.document_url!)}
                        style={{ backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0.4rem 0.85rem", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        📄 Voir le document
                      </button>
                    )}
                    {req.piece_identite_url && (
                      <button
                        onClick={() => handleDownloadDocument(req.piece_identite_url!)}
                        style={{ backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", padding: "0.4rem 0.85rem", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        🪪 Voir la pièce d&apos;identité
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap", borderTop: "1px solid #f3f4f6", paddingTop: "1rem" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <input
                      type="text"
                      value={rejectNote[req.id] ?? ""}
                      onChange={(e) => setRejectNote((prev) => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder="Raison du refus (si rejet)"
                      style={{ width: "100%", padding: "0.5rem 0.85rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.85rem", color: "#111827", outline: "none", boxSizing: "border-box", fontFamily: "sans-serif" }}
                    />
                  </div>
                  <button
                    onClick={() => handleKycReject(req)}
                    style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                  >
                    Rejeter
                  </button>
                  <button
                    onClick={() => handleKycApprove(req)}
                    style={{ backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                  >
                    ✓ Approuver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PENDING LISTINGS */}
        <h2 style={sectionTitleStyle}>
          Listings en attente ({pendingListings.length})
        </h2>
        {pendingListings.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "2.5rem" }}>
            Aucun listing en attente de validation.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2.5rem" }}>
            {pendingListings.map((l) => (
              <div key={l.id} style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.25rem" }}>
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                  {l.photo_url ? (
                    <img src={l.photo_url} alt={l.titre} style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: "120px", height: "120px", backgroundColor: "#f3f4f6", borderRadius: "8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>Pas de photo</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <p style={{ color: "#111827", fontWeight: "700", fontSize: "1.05rem", margin: "0 0 0.3rem 0" }}>
                      {l.titre}
                    </p>
                    <p style={{ color: "#FF7D07", fontSize: "1rem", fontWeight: "700", margin: "0 0 0.5rem 0" }}>
                      {Number(l.prix).toFixed(2)} €
                      <span style={{ color: "#9ca3af", fontSize: "0.75rem", fontWeight: "500", marginLeft: "0.5rem" }}>
                        · {l.type}
                      </span>
                    </p>
                    <p style={{ color: "#374151", fontSize: "0.85rem", lineHeight: "1.5", margin: "0 0 0.5rem 0", whiteSpace: "pre-wrap" }}>
                      {l.description.length > 300 ? l.description.slice(0, 300) + "…" : l.description}
                    </p>
                    <p style={{ color: "#9ca3af", fontSize: "0.75rem", margin: 0 }}>
                      {l.seller_email} · {formatDate(l.created_at)}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap", borderTop: "1px solid #f3f4f6", paddingTop: "1rem" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <input
                      type="text"
                      value={listingRejectNote[l.id] ?? ""}
                      onChange={(e) => setListingRejectNote((prev) => ({ ...prev, [l.id]: e.target.value }))}
                      placeholder="Raison du refus (obligatoire si rejet)"
                      style={{ width: "100%", padding: "0.5rem 0.85rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.85rem", color: "#111827", outline: "none", boxSizing: "border-box", fontFamily: "sans-serif" }}
                    />
                  </div>
                  <button
                    onClick={() => handleListingReject(l)}
                    style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                  >
                    Refuser
                  </button>
                  <button
                    onClick={() => handleListingApprove(l)}
                    style={{ backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                  >
                    ✓ Approuver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LISTINGS */}
        <h2 style={sectionTitleStyle}>Listings ({listings.length})</h2>
        <div style={tableWrapStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f9fafb" }}>
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
                  <td style={{ ...tdStyle, color: "#6b7280", fontSize: "0.8rem" }}>{l.seller_email}</td>
                  <td style={{ ...tdStyle, fontWeight: "600", color: "#111827" }}>{l.prix.toFixed(2)} €</td>
                  <td style={tdStyle}>
                    <span style={{ color: statusColor(l.status), fontWeight: "600", fontSize: "0.8rem" }}>{l.status}</span>
                  </td>
                  <td style={tdStyle}>
                    {l.status !== "removed" ? (
                      <button
                        onClick={() => handleSupprimer(l.id)}
                        style={{
                          backgroundColor: "#fee2e2",
                          color: "#dc2626",
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
                      <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>Supprimé</span>
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
              <tr style={{ backgroundColor: "#f9fafb" }}>
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
                      color: u.role === "admin" ? "#d97706" : u.role === "seller" ? "#7c3aed" : "#2563eb",
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
              <tr style={{ backgroundColor: "#f9fafb" }}>
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
                  <td style={{ ...tdStyle, fontWeight: "600", color: "#111827" }}>{o.amount.toFixed(2)} €</td>
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
