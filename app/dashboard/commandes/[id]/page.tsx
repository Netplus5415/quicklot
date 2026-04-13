"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { RatingModal } from "@/components/RatingModal";

interface OrderDetail {
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
  buyer: { prenom: string | null; pseudo: string | null; email: string } | null;
  seller: { prenom: string | null; pseudo: string | null } | null;
}

type ViewRole = "seller" | "buyer";

function trackingUrl(transporteur: string, numero: string): string {
  const t = transporteur.toLowerCase();
  if (t.includes("colissimo")) return `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(numero)}`;
  if (t.includes("chronopost")) return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodeURIComponent(numero)}`;
  if (t.includes("dpd")) return `https://www.dpd.fr/trace/${encodeURIComponent(numero)}`;
  if (t.includes("ups")) return `https://www.ups.com/track?tracknum=${encodeURIComponent(numero)}`;
  if (t.includes("dhl")) return `https://www.dhl.com/fr-fr/home/tracking/tracking-express.html?tracking-id=${encodeURIComponent(numero)}`;
  return "#";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

export default function CommandeDetail() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [role, setRole] = useState<ViewRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasRating, setHasRating] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Form state
  const [statut, setStatut] = useState("");
  const [transporteur, setTransporteur] = useState("");
  const [numeroSuivi, setNumeroSuivi] = useState("");
  const [notesVendeur, setNotesVendeur] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const [pendingLabelFile, setPendingLabelFile] = useState<File | null>(null);
  const [uploadingLabels, setUploadingLabels] = useState(false);
  const [labelUploadError, setLabelUploadError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Litiges
  const [dispute, setDispute] = useState<{
    id: string;
    raison: string;
    statut: string;
  } | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showDisputePreModal, setShowDisputePreModal] = useState(false);
  const [disputeRaison, setDisputeRaison] = useState<"non_expedition" | "non_conformite">("non_expedition");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

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
             buyer:buyer_id!left (prenom, pseudo, email),
             seller:seller_id!left (prenom, pseudo)`
          )
          .eq("id", orderId)
          .maybeSingle();

        if (error) {
          console.error("[commande detail] query error:", error.message, error.details, error.hint);
          setNotFound(true);
          return;
        }

        if (!data) {
          setNotFound(true);
          return;
        }

        const o = data as unknown as OrderDetail;

        // Sécurité : l'user doit être soit le vendeur, soit l'acheteur
        let resolvedRole: ViewRole | null = null;
        if (o.seller_id === user.id) resolvedRole = "seller";
        else if (o.buyer_id === user.id) resolvedRole = "buyer";

        if (!resolvedRole) {
          console.warn("[commande detail] user not involved in order, redirecting");
          router.replace("/dashboard");
          return;
        }

        setOrder(o);
        setCurrentUserId(user.id);
        setRole(resolvedRole);
        setStatut(o.statut ?? "paid");
        setTransporteur(o.transporteur ?? "");
        setNumeroSuivi(o.numero_suivi ?? "");
        setNotesVendeur(o.notes_vendeur ?? "");

        // Buyer : vérifier si avis déjà laissé
        if (resolvedRole === "buyer") {
          const { data: existing } = await supabase
            .from("ratings")
            .select("id")
            .eq("order_id", o.id)
            .maybeSingle();
          setHasRating(!!existing);
        }

        // Charger litige éventuel (acheteur et vendeur peuvent voir)
        const { data: existingDispute } = await supabase
          .from("disputes")
          .select("id, raison, statut")
          .eq("order_id", o.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingDispute) {
          setDispute(existingDispute as { id: string; raison: string; statut: string });
        }
      } finally {
        setLoading(false);
      }
    }
    if (orderId) load();
  }, [orderId, router]);

  async function handleSubmitDispute() {
    if (!order || !currentUserId) return;
    const desc = disputeDescription.trim();
    if (desc.length < 20) {
      setDisputeError("La description doit faire au moins 20 caractères.");
      return;
    }
    setDisputeSubmitting(true);
    setDisputeError(null);

    const { data: inserted, error: insertError } = await supabase
      .from("disputes")
      .insert({
        order_id: order.id,
        buyer_id: currentUserId,
        seller_id: order.seller_id,
        raison: disputeRaison,
        description: desc,
      })
      .select("id, raison, statut")
      .maybeSingle();

    if (insertError || !inserted) {
      console.error("[commande detail] insert dispute:", insertError);
      setDisputeError("Une erreur est survenue, veuillez réessayer.");
      setDisputeSubmitting(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch("/api/disputes/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ dispute_id: (inserted as { id: string }).id }),
        });
      }
    } catch (err) {
      console.error("[commande detail] dispute notify error:", err);
    }

    setDispute(inserted as { id: string; raison: string; statut: string });
    setShowDisputeModal(false);
    setDisputeDescription("");
    setDisputeRaison("non_expedition");
    setDisputeSubmitting(false);
    setToast({ text: "Litige ouvert. L'équipe Quicklot va l'examiner.", error: false });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleSave() {
    if (!order) return;
    setSaving(true);
    setToast(null);

    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({
        statut,
        transporteur: transporteur.trim() || null,
        numero_suivi: numeroSuivi.trim() || null,
        notes_vendeur: notesVendeur.trim() || null,
      })
      .eq("id", order.id)
      .eq("seller_id", order.seller_id)
      .select();

    if (updateError) {
      console.error("[commande detail] update error:", updateError);
      setToast({ text: "Une erreur est survenue, veuillez réessayer.", error: true });
      setSaving(false);
      return;
    }

    if (!updated || updated.length === 0) {
      setToast({ text: "Une erreur est survenue, veuillez réessayer.", error: true });
      setSaving(false);
      return;
    }

    setOrder({ ...order, statut, transporteur: transporteur.trim() || null, numero_suivi: numeroSuivi.trim() || null, notes_vendeur: notesVendeur.trim() || null });
    setToast({ text: "Commande mise à jour ✓", error: false });
    setSaving(false);
    setTimeout(() => setToast(null), 4000);
  }

  async function handleBuyerUploadLabels() {
    if (!order || !pendingLabelFile) return;
    const file = pendingLabelFile;

    if (file.size > 10 * 1024 * 1024) {
      setLabelUploadError("Le fichier dépasse 10 Mo.");
      return;
    }

    setUploadingLabels(true);
    setLabelUploadError(null);

    const path = `${order.id}/etiquettes.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("order-labels")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      console.error("[commande detail] buyer upload error:", uploadError);
      setLabelUploadError("Une erreur est survenue, veuillez réessayer.");
      setUploadingLabels(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ etiquettes_url: path })
      .eq("id", order.id)
      .select();

    if (updateError) {
      console.error("[commande detail] buyer update etiquettes_url:", updateError);
      setLabelUploadError("Une erreur est survenue, veuillez réessayer.");
      setUploadingLabels(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch(`/api/orders/${order.id}/notify-labels`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      }
    } catch (err) {
      console.error("[commande detail] notify-labels error:", err);
    }

    setOrder({ ...order, etiquettes_url: path });
    setPendingLabelFile(null);
    setUploadingLabels(false);
    setToast({ text: "Étiquettes envoyées au vendeur ✓", error: false });
    setTimeout(() => setToast(null), 4000);
  }

  function handleConfirmReception() {
    if (!order) return;
    setConfirmModal({
      open: true,
      title: "Confirmer la réception ?",
      message: "Confirmez-vous avoir bien reçu cette commande ? Cette action est définitive.",
      onConfirm: () => {
        setConfirmModal(null);
        void doConfirmReception();
      },
    });
  }

  async function doConfirmReception() {
    if (!order) return;
    setConfirming(true);
    setConfirmError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setConfirmError("Session expirée. Veuillez vous reconnecter.");
      setConfirming(false);
      return;
    }

    try {
      const res = await fetch(`/api/orders/${order.id}/deliver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur confirmation");
      }

      // Update local state : passe en delivered
      setOrder({ ...order, statut: "delivered" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setConfirmError(msg);
    } finally {
      setConfirming(false);
    }
  }

  function parseLabelPaths(raw: string | null): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((p): p is string => typeof p === "string");
    } catch {
      // Ancienne valeur : chemin simple
    }
    return [raw];
  }

  async function handleDownloadLabel() {
    if (!order?.etiquettes_url) return;
    const paths = parseLabelPaths(order.etiquettes_url);
    for (const path of paths) {
      const { data, error } = await supabase.storage
        .from("order-labels")
        .createSignedUrl(path, 60 * 5);
      if (error || !data) {
        console.error("[commande detail] download label:", error);
        setToast({ text: "Une erreur est survenue, veuillez réessayer.", error: true });
        setTimeout(() => setToast(null), 4000);
        return;
      }
      window.open(data.signedUrl, "_blank");
    }
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: "#ffffff", minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <p style={{ color: "#6b7280" }}>Chargement…</p>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div style={{ backgroundColor: "#ffffff", minHeight: "calc(100vh - 56px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "sans-serif" }}>
        <p style={{ color: "#dc2626", fontSize: "1rem", marginBottom: "1rem" }}>
          Commande introuvable.
        </p>
        <Link href="/dashboard/commandes" style={{ color: "#6b7280", fontSize: "0.875rem", textDecoration: "none" }}>
          ← Retour aux commandes
        </Link>
      </div>
    );
  }

  const mode = order.livraison_mode ?? order.shipping_mode;
  const buyerName = order.buyer?.pseudo || order.buyer?.prenom || "Acheteur";

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.65rem 0.9rem",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "0.9rem",
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "sans-serif",
    backgroundColor: "#ffffff",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#6b7280",
    fontSize: "0.8rem",
    marginBottom: "0.35rem",
    fontWeight: "600",
  };

  const isSellerView = role === "seller";
  const isBuyerView = role === "buyer";
  const currentStatut = order.statut ?? "paid";
  const sellerName = order.seller?.pseudo || order.seller?.prenom || "le vendeur";
  const backHref = isSellerView ? "/dashboard/commandes" : "/dashboard/acheteur";
  const backLabel = isSellerView ? "← Retour aux commandes" : "← Retour à mes achats";

  return (
    <div style={{ backgroundColor: "#f9fafb", minHeight: "calc(100vh - 56px)", padding: "2rem", fontFamily: "sans-serif" }}>
      {showDisputePreModal && order && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowDisputePreModal(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1002, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "1.5rem", maxWidth: "480px", width: "100%", boxShadow: "0 20px 48px rgba(0,0,0,0.25)" }}
          >
            <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "1.2rem", fontWeight: 600, color: "#111827" }}>
              Avant d&apos;ouvrir un litige
            </h3>
            <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.9rem", color: "#6b7280", lineHeight: 1.6 }}>
              Avez-vous déjà tenté de résoudre ce problème directement avec le vendeur ? La plupart des problèmes se règlent à l&apos;amiable.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <Link
                href={`/messages?with=${order.seller_id}`}
                onClick={() => setShowDisputePreModal(false)}
                style={{ backgroundColor: "#FF7D07", color: "#ffffff", border: "none", borderRadius: "8px", padding: "0.7rem 1.2rem", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none", textAlign: "center", display: "block" }}
              >
                Contacter le vendeur
              </Link>
              <button
                type="button"
                onClick={() => {
                  setShowDisputePreModal(false);
                  setDisputeError(null);
                  setShowDisputeModal(true);
                }}
                style={{ backgroundColor: "#ffffff", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.7rem 1.2rem", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}
              >
                Oui, j&apos;ai déjà contacté le vendeur
              </button>
              <button
                type="button"
                onClick={() => setShowDisputePreModal(false)}
                style={{ backgroundColor: "transparent", color: "#6b7280", border: "none", padding: "0.55rem 1rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showDisputeModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !disputeSubmitting && setShowDisputeModal(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1002, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "1.5rem", maxWidth: "520px", width: "100%", boxShadow: "0 20px 48px rgba(0,0,0,0.25)" }}
          >
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.2rem", fontWeight: 600, color: "#111827" }}>
              Ouvrir un litige
            </h3>

            <label style={{ display: "block", marginBottom: "1rem" }}>
              <span style={{ display: "block", color: "#374151", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                Raison
              </span>
              <select
                value={disputeRaison}
                onChange={(e) => setDisputeRaison(e.target.value as "non_expedition" | "non_conformite")}
                disabled={disputeSubmitting}
                style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.9rem", color: "#111827", backgroundColor: "#ffffff", fontFamily: "inherit", boxSizing: "border-box" }}
              >
                <option value="non_expedition">Le vendeur n&apos;a pas expédié dans les délais</option>
                <option value="non_conformite">Le lot reçu n&apos;est pas conforme à la description</option>
              </select>
            </label>

            <label style={{ display: "block", marginBottom: "1rem" }}>
              <span style={{ display: "block", color: "#374151", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                Description (min. 20 caractères)
              </span>
              <textarea
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                disabled={disputeSubmitting}
                rows={5}
                placeholder="Décrivez précisément le problème..."
                style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.9rem", color: "#111827", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
              />
              <p style={{ margin: "0.35rem 0 0 0", color: "#9ca3af", fontSize: "0.75rem" }}>
                {disputeDescription.trim().length}/20
              </p>
            </label>

            {disputeError && (
              <p style={{ color: "#dc2626", fontSize: "0.85rem", margin: "0 0 0.85rem 0" }}>
                {disputeError}
              </p>
            )}

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                disabled={disputeSubmitting}
                style={{ padding: "0.6rem 1.1rem", backgroundColor: "#ffffff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: disputeSubmitting ? "not-allowed" : "pointer" }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmitDispute}
                disabled={disputeSubmitting || disputeDescription.trim().length < 20}
                style={{
                  padding: "0.6rem 1.1rem",
                  backgroundColor: disputeSubmitting || disputeDescription.trim().length < 20 ? "#e5e7eb" : "#FF7D07",
                  color: disputeSubmitting || disputeDescription.trim().length < 20 ? "#9ca3af" : "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: disputeSubmitting || disputeDescription.trim().length < 20 ? "not-allowed" : "pointer",
                }}
              >
                {disputeSubmitting ? "Envoi…" : "Soumettre le litige"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal?.open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmModal(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1001, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "1.5rem", maxWidth: "420px", width: "100%", boxShadow: "0 20px 48px rgba(0,0,0,0.25)" }}
          >
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem", fontWeight: 600, color: "#111827" }}>
              {confirmModal.title}
            </h3>
            <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.9rem", color: "#6b7280", lineHeight: 1.5 }}>
              {confirmModal.message}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                style={{ padding: "0.55rem 1.1rem", backgroundColor: "#ffffff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                style={{ padding: "0.55rem 1.1rem", backgroundColor: "#FF7D07", color: "#ffffff", border: "none", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <Link
          href={backHref}
          style={{ color: "#6b7280", fontSize: "0.875rem", textDecoration: "none", display: "inline-block", marginBottom: "1.5rem" }}
        >
          {backLabel}
        </Link>

        <h1 style={{ color: "#111827", fontSize: "1.65rem", fontWeight: "bold", margin: "0 0 2rem 0" }}>
          {isSellerView ? "Traitement de la commande" : "Ma commande"}
        </h1>

        {/* ── Infos lecture seule ── */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {order.listing?.photo_url ? (
              <img src={order.listing.photo_url} alt={order.listing.titre} style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 }} />
            ) : (
              <div style={{ width: "100px", height: "100px", backgroundColor: "#f3f4f6", borderRadius: "8px", flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: "200px" }}>
              <p style={{ color: "#111827", fontSize: "1.1rem", fontWeight: "700", margin: "0 0 0.4rem 0" }}>
                {order.listing?.titre ?? "Listing supprimé"}
              </p>
              {isSellerView ? (
                <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 0.25rem 0" }}>
                  Acheteur : <strong style={{ color: "#374151" }}>{buyerName}</strong>
                  {order.buyer?.email && <span style={{ color: "#9ca3af" }}> · {order.buyer.email}</span>}
                </p>
              ) : (
                <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 0.25rem 0" }}>
                  Vendeur : <Link href={`/vendeur/${order.seller_id}`} style={{ color: "#FF7D07", fontWeight: "600", textDecoration: "none" }}>{sellerName}</Link>
                </p>
              )}
              <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 0.25rem 0" }}>
                Commandé le <strong style={{ color: "#374151" }}>{formatDate(order.created_at)}</strong>
              </p>
              <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: 0 }}>
                Mode de livraison : <strong style={{ color: "#374151" }}>{shippingLabel(mode)}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.85rem", borderTop: "1px solid #f3f4f6", paddingTop: "1rem" }}>
            <div>
              <p style={{ color: "#9ca3af", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.25rem 0", fontWeight: "600" }}>{isSellerView ? "Total payé" : "Total"}</p>
              <p style={{ color: "#111827", fontSize: "1rem", fontWeight: "700", margin: 0 }}>{(order.amount ?? 0).toFixed(2)} €</p>
            </div>
            {isSellerView && (
              <>
                <div>
                  <p style={{ color: "#9ca3af", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.25rem 0", fontWeight: "600" }}>Net vendeur</p>
                  <p style={{ color: "#16a34a", fontSize: "1rem", fontWeight: "700", margin: 0 }}>{(order.seller_amount ?? 0).toFixed(2)} €</p>
                </div>
                <div>
                  <p style={{ color: "#9ca3af", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.25rem 0", fontWeight: "600" }}>Commission</p>
                  <p style={{ color: "#6b7280", fontSize: "1rem", fontWeight: "700", margin: 0 }}>{(order.commission_amount ?? 0).toFixed(2)} €</p>
                </div>
              </>
            )}
          </div>

          {isSellerView && order.stripe_session_id && (
            <p style={{ color: "#9ca3af", fontSize: "0.68rem", fontFamily: "monospace", margin: "1rem 0 0 0", wordBreak: "break-all" }}>
              Stripe session : {order.stripe_session_id}
            </p>
          )}
        </div>

        {/* ── Vue acheteur : timeline + suivi + avis ── */}
        {isBuyerView && (
          <>
            {/* Timeline */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h2 style={{ color: "#111827", fontSize: "1.05rem", fontWeight: "600", margin: "0 0 1.25rem 0" }}>
                Suivi de la commande
              </h2>
              {(() => {
                const steps = [
                  { key: "paid",      label: "Payée" },
                  { key: "preparing", label: "En préparation" },
                  { key: "shipped",   label: "Expédiée" },
                  { key: "delivered", label: "Livrée" },
                ];
                const currentIdx = steps.findIndex((s) => s.key === currentStatut);
                const cancelled = currentStatut === "cancelled";

                if (cancelled) {
                  return (
                    <div style={{ padding: "0.85rem 1rem", backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#dc2626", fontSize: "0.875rem", fontWeight: "600" }}>
                      Cette commande a été annulée.
                    </div>
                  );
                }

                return (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    {steps.map((step, i) => {
                      const reached = i <= currentIdx;
                      const active = i === currentIdx;
                      return (
                        <div key={step.key} style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: "110px" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", flex: 1 }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                backgroundColor: reached ? "#FF7D07" : "#e5e7eb",
                                color: reached ? "#ffffff" : "#9ca3af",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.85rem",
                                fontWeight: "700",
                                boxShadow: active ? "0 0 0 4px rgba(255,125,7,0.2)" : undefined,
                              }}
                            >
                              {reached ? "✓" : i + 1}
                            </div>
                            <span style={{ color: reached ? "#111827" : "#9ca3af", fontSize: "0.72rem", fontWeight: active ? "700" : "500", textAlign: "center" }}>
                              {step.label}
                            </span>
                          </div>
                          {i < steps.length - 1 && (
                            <div style={{ height: "2px", flex: 1, minWidth: "12px", backgroundColor: i < currentIdx ? "#FF7D07" : "#e5e7eb" }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Suivi transporteur */}
              {currentStatut === "shipped" && order.transporteur && order.numero_suivi && (() => {
                const tUrl = trackingUrl(order.transporteur, order.numero_suivi);
                return (
                  <div style={{ marginTop: "1.25rem", padding: "0.85rem 1rem", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "0.85rem", color: "#374151" }}>
                    📦 Expédié par <strong>{order.transporteur}</strong>{" — "}
                    Suivi :{" "}
                    {tUrl !== "#" ? (
                      <a href={tUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#FF7D07", fontWeight: "600", textDecoration: "none", fontFamily: "monospace" }}>
                        {order.numero_suivi}
                      </a>
                    ) : (
                      <span style={{ fontFamily: "monospace", fontWeight: "600" }}>{order.numero_suivi}</span>
                    )}
                  </div>
                );
              })()}

              {/* Bouton confirmation réception (acheteur) */}
              {currentStatut === "shipped" && (
                <div style={{ marginTop: "1.25rem" }}>
                  <button
                    onClick={handleConfirmReception}
                    disabled={confirming}
                    style={{
                      backgroundColor: confirming ? "#e5e7eb" : "#16a34a",
                      color: confirming ? "#9ca3af" : "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.75rem 1.5rem",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      cursor: confirming ? "not-allowed" : "pointer",
                    }}
                  >
                    {confirming ? "Confirmation…" : "✓ Confirmer la réception"}
                  </button>
                  {confirmError && (
                    <p style={{ color: "#dc2626", fontSize: "0.8rem", margin: "0.5rem 0 0 0" }}>
                      {confirmError}
                    </p>
                  )}
                  <p style={{ color: "#9ca3af", fontSize: "0.75rem", margin: "0.4rem 0 0 0" }}>
                    Cliquez ici dès que vous avez reçu votre commande pour pouvoir laisser un avis au vendeur.
                  </p>
                </div>
              )}
            </div>

            {(() => {
              if (dispute) {
                const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
                  ouvert:   { label: "Litige ouvert",     bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
                  en_cours: { label: "Litige en cours",   bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
                  resolu:   { label: "Litige résolu",     bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
                  clos:     { label: "Litige clos",       bg: "#f3f4f6", color: "#6b7280", border: "#d1d5db" },
                };
                const badge = map[dispute.statut] ?? map.ouvert;
                return (
                  <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
                    <span style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontSize: "0.78rem", fontWeight: 700, padding: "0.35rem 0.85rem", borderRadius: "999px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      {badge.label}
                    </span>
                    <p style={{ margin: 0, color: "#6b7280", fontSize: "0.85rem" }}>
                      L&apos;équipe Quicklot examine la situation et vous contactera.
                    </p>
                  </div>
                );
              }

              const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
              const elapsed = Date.now() - new Date(order.created_at).getTime();
              const canOpenDispute =
                (currentStatut === "shipped" && elapsed > fiveDaysMs) ||
                currentStatut === "delivered";

              if (!canOpenDispute) return null;

              return (
                <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
                  <p style={{ margin: "0 0 0.85rem 0", color: "#374151", fontSize: "0.9rem" }}>
                    Un problème avec cette commande ?
                  </p>
                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                    <Link
                      href={`/messages?with=${order.seller_id}`}
                      style={{ backgroundColor: "#ffffff", color: "#374151", border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.6rem 1.2rem", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none", display: "inline-block" }}
                    >
                      Contacter le vendeur
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowDisputePreModal(true)}
                      style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.6rem 1.2rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      ⚠ Ouvrir un litige
                    </button>
                  </div>
                </div>
              );
            })()}

            {mode === "amazon" && (
              <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
                <h2 style={{ color: "#111827", fontSize: "1.05rem", fontWeight: 600, margin: "0 0 0.5rem 0" }}>
                  📦 Étiquettes FBA
                </h2>
                <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 1rem 0" }}>
                  Uploadez vos étiquettes de préparation Amazon FBA (PDF, JPEG ou PNG — max 10 Mo). Le vendeur les recevra pour expédier votre lot.
                </p>

                {order.etiquettes_url && (
                  <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "0.65rem 0.9rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span style={{ color: "#16a34a", fontSize: "0.85rem", fontWeight: 600 }}>
                      ✓ Étiquettes envoyées
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadLabel}
                      style={{ backgroundColor: "transparent", color: "#16a34a", border: "1px solid #86efac", borderRadius: "6px", padding: "0.3rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      Voir mes étiquettes
                    </button>
                  </div>
                )}

                {currentStatut !== "delivered" && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                      <label
                        style={{
                          display: "inline-block",
                          padding: "0.6rem 1.1rem",
                          backgroundColor: "#ffffff",
                          color: "#FF7D07",
                          border: "1px solid #FF7D07",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: uploadingLabels ? "not-allowed" : "pointer",
                          opacity: uploadingLabels ? 0.6 : 1,
                        }}
                      >
                        Choisir un fichier
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png"
                          disabled={uploadingLabels}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setPendingLabelFile(file);
                            setLabelUploadError(null);
                            e.target.value = "";
                          }}
                          style={{ display: "none" }}
                        />
                      </label>

                      {pendingLabelFile && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", backgroundColor: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "0.4rem 0.7rem", fontSize: "0.8rem", color: "#9a3412" }}>
                          <span style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {pendingLabelFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingLabelFile(null);
                              setLabelUploadError(null);
                            }}
                            disabled={uploadingLabels}
                            aria-label="Retirer le fichier"
                            style={{ background: "none", border: "none", color: "#9a3412", cursor: uploadingLabels ? "not-allowed" : "pointer", fontSize: "0.9rem", lineHeight: 1, padding: 0 }}
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleBuyerUploadLabels}
                        disabled={!pendingLabelFile || uploadingLabels}
                        style={{
                          padding: "0.6rem 1.2rem",
                          backgroundColor: !pendingLabelFile || uploadingLabels ? "#e5e7eb" : "#FF7D07",
                          color: !pendingLabelFile || uploadingLabels ? "#9ca3af" : "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: !pendingLabelFile || uploadingLabels ? "not-allowed" : "pointer",
                        }}
                      >
                        {uploadingLabels ? "Envoi…" : "Envoyer"}
                      </button>
                    </div>
                    {labelUploadError && (
                      <p style={{ margin: "0.6rem 0 0 0", color: "#dc2626", fontSize: "0.8rem" }}>
                        {labelUploadError}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Avis */}
            {currentStatut === "delivered" && (
              <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
                {hasRating ? (
                  <p style={{ color: "#16a34a", fontSize: "0.9rem", margin: 0, fontWeight: "600" }}>
                    ✓ Vous avez déjà laissé un avis pour cette commande
                  </p>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <p style={{ color: "#111827", fontSize: "1rem", fontWeight: "600", margin: "0 0 0.25rem 0" }}>
                        Comment s&apos;est passée cette commande ?
                      </p>
                      <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: 0 }}>
                        Votre avis aide les autres acheteurs.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowRatingModal(true)}
                      style={{ backgroundColor: "#FF7D07", color: "#fff", border: "none", borderRadius: "8px", padding: "0.65rem 1.25rem", fontSize: "0.9rem", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      ⭐ Laisser un avis
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Formulaire vendeur ── */}
        {isSellerView && (
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.5rem" }}>
          <h2 style={{ color: "#111827", fontSize: "1.05rem", fontWeight: "600", margin: "0 0 1.25rem 0" }}>
            Mise à jour
          </h2>

          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="statut" style={labelStyle}>Statut</label>
            <select
              id="statut"
              value={statut}
              onChange={(e) => setStatut(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="paid">Payée</option>
              <option value="preparing">En préparation</option>
              <option value="shipped">Expédiée</option>
              <option value="delivered">Livrée</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="transporteur" style={labelStyle}>Transporteur</label>
            <input
              id="transporteur"
              type="text"
              value={transporteur}
              onChange={(e) => setTransporteur(e.target.value)}
              placeholder="Ex : Colissimo, Chronopost, DPD, UPS, DHL…"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="numero_suivi" style={labelStyle}>Numéro de suivi</label>
            <input
              id="numero_suivi"
              type="text"
              value={numeroSuivi}
              onChange={(e) => setNumeroSuivi(e.target.value)}
              placeholder="Ex : 6A12345678901"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="notes" style={labelStyle}>Notes vendeur</label>
            <textarea
              id="notes"
              value={notesVendeur}
              onChange={(e) => setNotesVendeur(e.target.value)}
              rows={3}
              placeholder="Notes internes (optionnel)…"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {mode === "amazon" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={labelStyle}>Étiquettes FBA de l&apos;acheteur</label>
              {order.etiquettes_url ? (
                <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "0.65rem 0.9rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span style={{ color: "#16a34a", fontSize: "0.85rem", fontWeight: 600 }}>
                    ✓ Étiquettes reçues
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadLabel}
                    style={{ backgroundColor: "#16a34a", color: "#ffffff", border: "none", borderRadius: "6px", padding: "0.4rem 0.9rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    Télécharger les étiquettes
                  </button>
                </div>
              ) : (
                <div style={{ backgroundColor: "#fff7ed", border: "1px dashed #fed7aa", borderRadius: "8px", padding: "0.75rem 1rem", color: "#9a3412", fontSize: "0.85rem", fontStyle: "italic" }}>
                  En attente des étiquettes de l&apos;acheteur.
                </div>
              )}
            </div>
          )}

          {toast && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontSize: "0.9rem",
                backgroundColor: toast.error ? "#fef2f2" : "#f0fdf4",
                color: toast.error ? "#dc2626" : "#16a34a",
                border: `1px solid ${toast.error ? "#fca5a5" : "#86efac"}`,
              }}
            >
              {toast.text}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              backgroundColor: saving ? "#e5e7eb" : "#FF7D07",
              color: saving ? "#9ca3af" : "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "0.75rem 1.75rem",
              fontSize: "0.95rem",
              fontWeight: "600",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
        )}
      </div>

      {/* Rating modal (acheteur) */}
      {showRatingModal && currentUserId && order && (
        <RatingModal
          orderId={order.id}
          listingId={order.listing_id}
          listingTitle={order.listing?.titre ?? "votre commande"}
          reviewerId={currentUserId}
          revieweeId={order.seller_id}
          onClose={() => setShowRatingModal(false)}
          onSuccess={() => {
            setShowRatingModal(false);
            setHasRating(true);
          }}
        />
      )}
    </div>
  );
}
