"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const GENERIC_ERROR = "Une erreur est survenue, veuillez réessayer.";

interface PurchaseRow {
  id: string;
  listing_id: string | null;
  seller_id: string;
  amount: number;
  statut: string | null;
  created_at: string;
  transporteur: string | null;
  numero_suivi: string | null;
  shipping_mode: string | null;
  etiquettes_url: string | null;
  listing: { titre: string; photo_url: string | null } | null;
  seller: { pseudo: string | null; prenom: string | null } | null;
}

function statutBadge(statut: string | null) {
  switch (statut) {
    case "paid":      return { label: "Payée",         bg: "#ffedd5", color: "#c2410c" };
    case "preparing": return { label: "En préparation", bg: "#dbeafe", color: "#2563eb" };
    case "shipped":   return { label: "Expédiée",      bg: "#ede9fe", color: "#7c3aed" };
    case "delivered": return { label: "Livrée",        bg: "#dcfce7", color: "#16a34a" };
    case "cancelled": return { label: "Annulée",       bg: "#f3f4f6", color: "#6b7280" };
    default:          return { label: statut ?? "—",   bg: "#f3f4f6", color: "#6b7280" };
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AcheteurDashboard() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File | null>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string | null>>({});
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

  async function reloadPurchases() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select(
        `id, listing_id, seller_id, amount, statut, created_at, transporteur, numero_suivi, shipping_mode, etiquettes_url,
         listing:listing_id!left (titre, photo_url),
         seller:seller_id!left (pseudo, prenom)`
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    setPurchases((data as unknown as PurchaseRow[]) ?? []);
  }

  async function handleUploadLabels(orderId: string) {
    const file = pendingFiles[orderId];
    if (!file) return;
    setUploadingId(orderId);
    setUploadErrors((prev) => ({ ...prev, [orderId]: null }));
    const path = `${orderId}/etiquettes.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("order-labels")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      console.error("[acheteur] upload labels:", uploadError);
      setUploadErrors((prev) => ({ ...prev, [orderId]: GENERIC_ERROR }));
      setUploadingId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ etiquettes_url: path })
      .eq("id", orderId)
      .select();

    if (updateError) {
      console.error("[acheteur] update etiquettes_url:", updateError);
      setUploadErrors((prev) => ({ ...prev, [orderId]: GENERIC_ERROR }));
      setUploadingId(null);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch(`/api/orders/${orderId}/notify-labels`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      }
    } catch (err) {
      console.error("[acheteur] notify-labels error:", err);
    }

    setPendingFiles((prev) => ({ ...prev, [orderId]: null }));
    showToast("Étiquettes envoyées au vendeur ✓", false);
    await reloadPurchases();
    setUploadingId(null);
  }

  async function handleDownloadLabels(path: string) {
    const { data, error } = await supabase.storage
      .from("order-labels")
      .createSignedUrl(path, 60 * 5);
    if (error || !data) {
      console.error("[acheteur] download labels:", error);
      showToast(GENERIC_ERROR, true);
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

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
            `id, listing_id, seller_id, amount, statut, created_at, transporteur, numero_suivi, shipping_mode, etiquettes_url,
             listing:listing_id!left (titre, photo_url),
             seller:seller_id!left (pseudo, prenom)`
          )
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[acheteur] query error:", error.message, error.details, error.hint);
        }

        console.log("[acheteur] purchases loaded:", data?.length ?? 0);
        setPurchases((data as unknown as PurchaseRow[]) ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff", fontFamily: "sans-serif" }}>
        <p style={{ color: "#6b7280" }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#f9fafb", minHeight: "calc(100vh - 56px)", padding: "2rem", fontFamily: "sans-serif" }}>
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
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <Link
          href="/dashboard"
          style={{ color: "#6b7280", fontSize: "0.875rem", textDecoration: "none", display: "inline-block", marginBottom: "1.5rem" }}
        >
          ← Retour au dashboard
        </Link>

        <h1 style={{ color: "#111827", fontSize: "1.75rem", fontWeight: "bold", margin: "0 0 0.5rem 0" }}>
          Mes achats
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: "0 0 2rem 0" }}>
          Toutes vos commandes passées sur Quicklot.
        </p>

        {purchases.length === 0 ? (
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: "0 0 1rem 0" }}>
              Vous n&apos;avez pas encore passé de commande.
            </p>
            <Link
              href="/boutique"
              style={{ display: "inline-block", backgroundColor: "#FF7D07", color: "#fff", textDecoration: "none", padding: "0.65rem 1.25rem", borderRadius: "8px", fontSize: "0.9rem", fontWeight: "600" }}
            >
              Découvrir le catalogue
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {purchases.map((order) => {
              const currentStatut = order.statut;
              const badge = statutBadge(currentStatut);
              const sellerName = order.seller?.pseudo || order.seller?.prenom || "Vendeur";

              const isFba = order.shipping_mode === "amazon";
              const canUploadLabels = isFba && order.statut !== "delivered";
              const isUploading = uploadingId === order.id;

              return (
                <div key={order.id} style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  {order.listing?.photo_url ? (
                    <img src={order.listing.photo_url} alt={order.listing.titre} style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: "72px", height: "72px", backgroundColor: "#f3f4f6", borderRadius: "8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#9ca3af", fontSize: "0.65rem" }}>N/A</span>
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <p style={{ color: "#111827", fontSize: "0.95rem", fontWeight: "600", margin: "0 0 0.2rem 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {order.listing?.titre ?? "Listing supprimé"}
                    </p>
                    <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: "0 0 0.2rem 0" }}>
                      Vendu par{" "}
                      <Link href={`/vendeur/${order.seller_id}`} style={{ color: "#FF7D07", textDecoration: "none", fontWeight: "600" }}>
                        {sellerName}
                      </Link>
                    </p>
                    <p style={{ color: "#9ca3af", fontSize: "0.75rem", margin: 0 }}>
                      {formatDate(order.created_at)}
                    </p>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.35rem" }}>
                    <p style={{ color: "#111827", fontWeight: "700", fontSize: "1rem", margin: 0 }}>
                      {(order.amount ?? 0).toFixed(2)} €
                    </p>
                    <span style={{ backgroundColor: badge.bg, color: badge.color, fontSize: "0.68rem", fontWeight: "700", padding: "0.2rem 0.55rem", borderRadius: "999px", textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap" }}>
                      {badge.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                    <Link
                      href={`/messages?with=${order.seller_id}`}
                      style={{ backgroundColor: "#ffffff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.5rem 0.9rem", fontSize: "0.8rem", fontWeight: "600", textDecoration: "none", whiteSpace: "nowrap" }}
                    >
                      Contacter le vendeur
                    </Link>
                    <Link
                      href={`/dashboard/commandes/${order.id}`}
                      style={{ backgroundColor: "#FF7D07", color: "#ffffff", border: "none", borderRadius: "8px", padding: "0.5rem 0.9rem", fontSize: "0.8rem", fontWeight: "600", textDecoration: "none", whiteSpace: "nowrap" }}
                    >
                      Voir détails →
                    </Link>
                  </div>

                  {isFba && (
                    <div style={{ flexBasis: "100%", marginTop: "0.75rem", backgroundColor: "#fff7ed", border: "1px dashed #fed7aa", borderRadius: "8px", padding: "0.85rem 1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#9a3412" }}>
                          📦 Préparation FBA
                        </span>
                        {order.etiquettes_url && (
                          <button
                            type="button"
                            onClick={() => handleDownloadLabels(order.etiquettes_url!)}
                            style={{ backgroundColor: "#ffffff", color: "#9a3412", border: "1px solid #fed7aa", borderRadius: "6px", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                          >
                            Voir mes étiquettes
                          </button>
                        )}
                      </div>

                      {canUploadLabels && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <label
                            style={{
                              backgroundColor: "#ffffff",
                              color: "#FF7D07",
                              border: "1px solid #FF7D07",
                              borderRadius: "6px",
                              padding: "0.4rem 0.85rem",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: isUploading ? "not-allowed" : "pointer",
                              opacity: isUploading ? 0.6 : 1,
                            }}
                          >
                            Choisir un fichier
                            <input
                              type="file"
                              accept=".pdf,image/jpeg,image/png"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                setPendingFiles((prev) => ({ ...prev, [order.id]: file }));
                                setUploadErrors((prev) => ({ ...prev, [order.id]: null }));
                                e.target.value = "";
                              }}
                              style={{ display: "none" }}
                            />
                          </label>

                          {pendingFiles[order.id] && (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", backgroundColor: "#ffffff", border: "1px solid #fed7aa", borderRadius: "6px", padding: "0.3rem 0.6rem", fontSize: "0.75rem", color: "#9a3412" }}>
                              <span style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {pendingFiles[order.id]!.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingFiles((prev) => ({ ...prev, [order.id]: null }));
                                  setUploadErrors((prev) => ({ ...prev, [order.id]: null }));
                                }}
                                disabled={isUploading}
                                aria-label="Retirer le fichier"
                                style={{ background: "none", border: "none", color: "#9a3412", cursor: isUploading ? "not-allowed" : "pointer", fontSize: "0.85rem", lineHeight: 1, padding: 0 }}
                              >
                                ✕
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleUploadLabels(order.id)}
                            disabled={!pendingFiles[order.id] || isUploading}
                            style={{
                              backgroundColor: !pendingFiles[order.id] || isUploading ? "#e5e7eb" : "#FF7D07",
                              color: !pendingFiles[order.id] || isUploading ? "#9ca3af" : "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "0.4rem 0.95rem",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: !pendingFiles[order.id] || isUploading ? "not-allowed" : "pointer",
                            }}
                          >
                            {isUploading ? "Envoi…" : "Envoyer"}
                          </button>
                        </div>
                      )}

                      {uploadErrors[order.id] && (
                        <p style={{ margin: 0, color: "#dc2626", fontSize: "0.75rem" }}>
                          {uploadErrors[order.id]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
