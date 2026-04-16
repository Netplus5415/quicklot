"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { RatingModal } from "@/components/RatingModal";
import { Badge, Button, Card, Input, PageContainer, Textarea } from "@/components/ui";
import type { BadgeProps } from "@/components/ui";

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

const LABEL_CLASS = "block mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500";
const SELECT_CLASS =
  "w-full rounded-[4px] border-[1.5px] border-[#D1D5DB] bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#FF7D07] focus:outline-none focus:shadow-[0_0_0_3px_rgba(255,125,7,0.12)]";

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

function disputeBadgeVariant(statut: string): BadgeProps["variant"] {
  switch (statut) {
    case "ouvert":   return "error";
    case "en_cours": return "warning";
    case "resolu":   return "success";
    case "clos":     return "neutral";
    default:         return "error";
  }
}

function disputeBadgeLabel(statut: string): string {
  switch (statut) {
    case "ouvert":   return "Litige ouvert";
    case "en_cours": return "Litige en cours";
    case "resolu":   return "Litige résolu";
    case "clos":     return "Litige clos";
    default:         return "Litige ouvert";
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

        if (resolvedRole === "buyer") {
          const { data: existing } = await supabase
            .from("ratings")
            .select("id")
            .eq("order_id", o.id)
            .maybeSingle();
          setHasRating(!!existing);
        }

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
      <PageContainer background="white" maxWidth="md">
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-sm text-gray-500">Chargement…</p>
        </div>
      </PageContainer>
    );
  }

  if (notFound || !order) {
    return (
      <PageContainer background="white" maxWidth="md">
        <div className="flex min-h-[50vh] flex-col items-center justify-center">
          <p className="mb-4 text-base text-red-600">Commande introuvable.</p>
          <Link href="/dashboard/commandes" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux commandes
          </Link>
        </div>
      </PageContainer>
    );
  }

  const mode = order.livraison_mode ?? order.shipping_mode;
  const buyerName = order.buyer?.pseudo || order.buyer?.prenom || "Acheteur";

  const isSellerView = role === "seller";
  const isBuyerView = role === "buyer";
  const currentStatut = order.statut ?? "paid";
  const sellerName = order.seller?.pseudo || order.seller?.prenom || "le vendeur";
  const backHref = isSellerView ? "/dashboard/commandes" : "/dashboard/acheteur";
  const backLabel = isSellerView ? "← Retour aux commandes" : "← Retour à mes achats";

  return (
    <PageContainer background="gray" maxWidth="md">
      {showDisputePreModal && order && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowDisputePreModal(false)}
          className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] rounded-[6px] border border-gray-200 bg-white p-6 shadow-lg"
          >
            <h3 className="mb-3 text-lg font-semibold text-gray-900">
              Avant d&apos;ouvrir un litige
            </h3>
            <p className="mb-5 text-sm leading-relaxed text-gray-500">
              Avez-vous déjà tenté de résoudre ce problème directement avec le vendeur ? La plupart des problèmes se règlent à l&apos;amiable.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={`/messages?with=${order.seller_id}`}
                onClick={() => setShowDisputePreModal(false)}
              >
                <Button variant="primary" fullWidth>
                  Contacter le vendeur
                </Button>
              </Link>
              <Button
                type="button"
                variant="danger"
                fullWidth
                onClick={() => {
                  setShowDisputePreModal(false);
                  setDisputeError(null);
                  setShowDisputeModal(true);
                }}
              >
                Oui, j&apos;ai déjà contacté le vendeur
              </Button>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={() => setShowDisputePreModal(false)}
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDisputeModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !disputeSubmitting && setShowDisputeModal(false)}
          className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[520px] rounded-[6px] border border-gray-200 bg-white p-6 shadow-lg"
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Ouvrir un litige</h3>

            <div className="mb-4">
              <label htmlFor="dispute-raison" className={LABEL_CLASS}>Raison</label>
              <select
                id="dispute-raison"
                value={disputeRaison}
                onChange={(e) => setDisputeRaison(e.target.value as "non_expedition" | "non_conformite")}
                disabled={disputeSubmitting}
                className={SELECT_CLASS}
              >
                <option value="non_expedition">Le vendeur n&apos;a pas expédié dans les délais</option>
                <option value="non_conformite">Le lot reçu n&apos;est pas conforme à la description</option>
              </select>
            </div>

            <div className="mb-4">
              <Textarea
                label="Description (min. 20 caractères)"
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                disabled={disputeSubmitting}
                rows={5}
                placeholder="Décrivez précisément le problème..."
                helperText={`${disputeDescription.trim().length}/20`}
              />
            </div>

            {disputeError && (
              <p className="mb-3 text-sm text-red-600">{disputeError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDisputeModal(false)}
                disabled={disputeSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmitDispute}
                disabled={disputeSubmitting || disputeDescription.trim().length < 20}
                loading={disputeSubmitting}
              >
                {disputeSubmitting ? "Envoi…" : "Soumettre le litige"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmModal?.open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmModal(null)}
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-[6px] border border-gray-200 bg-white p-6 shadow-lg"
          >
            <h3 className="mb-2 text-base font-semibold text-gray-900">{confirmModal.title}</h3>
            <p className="mb-5 text-sm leading-relaxed text-gray-500">{confirmModal.message}</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirmModal(null)}>
                Annuler
              </Button>
              <Button type="button" variant="primary" onClick={confirmModal.onConfirm}>
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}

      <Link
        href={backHref}
        className="mb-6 inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        {backLabel}
      </Link>

      <h1 className="mb-8 text-2xl font-bold text-gray-900">
        {isSellerView ? "Traitement de la commande" : "Ma commande"}
      </h1>

      <Card padding="md" className="mb-6 p-6">
        <div className="mb-5 flex flex-wrap gap-4">
          {order.listing?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={order.listing.photo_url}
              alt={order.listing.titre}
              className="h-[100px] w-[100px] flex-shrink-0 rounded-[4px] object-cover"
            />
          ) : (
            <div className="h-[100px] w-[100px] flex-shrink-0 rounded-[4px] bg-gray-100" />
          )}
          <div className="min-w-[200px] flex-1">
            <p className="mb-1.5 text-lg font-bold text-gray-900">
              {order.listing?.titre ?? "Listing supprimé"}
            </p>
            {isSellerView ? (
              <p className="mb-1 text-sm text-gray-500">
                Acheteur : <strong className="text-gray-700">{buyerName}</strong>
                {order.buyer?.email && <span className="text-gray-400"> · {order.buyer.email}</span>}
              </p>
            ) : (
              <p className="mb-1 text-sm text-gray-500">
                Vendeur :{" "}
                <Link href={`/vendeur/${order.seller_id}`} className="font-semibold text-[#FF7D07] hover:underline">
                  {sellerName}
                </Link>
              </p>
            )}
            <p className="mb-1 text-sm text-gray-500">
              Commandé le <strong className="text-gray-700">{formatDate(order.created_at)}</strong>
            </p>
            <p className="text-sm text-gray-500">
              Mode de livraison : <strong className="text-gray-700">{shippingLabel(mode)}</strong>
            </p>
          </div>
        </div>

        <div className="grid gap-3 border-t border-gray-100 pt-4 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
          <div>
            <p className={LABEL_CLASS}>{isSellerView ? "Total payé" : "Total"}</p>
            <p className="text-base font-bold text-gray-900">{(order.amount ?? 0).toFixed(2)} € TTC</p>
          </div>
          {isSellerView && (
            <>
              <div>
                <p className={LABEL_CLASS}>Net vendeur</p>
                <p className="text-base font-bold text-green-600">{(order.seller_amount ?? 0).toFixed(2)} € HT</p>
              </div>
              <div>
                <p className={LABEL_CLASS}>Commission</p>
                <p className="text-base font-bold text-gray-500">{(order.commission_amount ?? 0).toFixed(2)} € HT</p>
              </div>
            </>
          )}
        </div>

        {isSellerView && order.stripe_session_id && (
          <p className="mt-4 break-all font-mono text-[0.68rem] text-gray-400">
            Stripe session : {order.stripe_session_id}
          </p>
        )}
      </Card>

      {isBuyerView && (
        <>
          <Card padding="md" className="mb-6 p-6">
            <h2 className="mb-5 text-base font-semibold text-gray-900">Suivi de la commande</h2>
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
                  <div className="rounded-[4px] border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    Cette commande a été annulée.
                  </div>
                );
              }

              return (
                <div className="flex flex-wrap items-center gap-2">
                  {steps.map((step, i) => {
                    const reached = i <= currentIdx;
                    const active = i === currentIdx;
                    return (
                      <div key={step.key} className="flex min-w-[110px] flex-1 items-center gap-2">
                        <div className="flex flex-1 flex-col items-center gap-1.5">
                          <div
                            className={[
                              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                              reached ? "bg-[#FF7D07] text-white" : "bg-gray-200 text-gray-400",
                              active ? "ring-4 ring-[#FF7D07]/20" : "",
                            ].filter(Boolean).join(" ")}
                          >
                            {reached ? "✓" : i + 1}
                          </div>
                          <span
                            className={[
                              "text-center text-[0.72rem]",
                              reached ? "text-gray-900" : "text-gray-400",
                              active ? "font-bold" : "font-medium",
                            ].join(" ")}
                          >
                            {step.label}
                          </span>
                        </div>
                        {i < steps.length - 1 && (
                          <div
                            className={[
                              "h-0.5 min-w-[12px] flex-1",
                              i < currentIdx ? "bg-[#FF7D07]" : "bg-gray-200",
                            ].join(" ")}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {currentStatut === "shipped" && order.transporteur && order.numero_suivi && (() => {
              const tUrl = trackingUrl(order.transporteur, order.numero_suivi);
              return (
                <div className="mt-5 rounded-[4px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  📦 Expédié par <strong>{order.transporteur}</strong>{" — "}
                  Suivi :{" "}
                  {tUrl !== "#" ? (
                    <a
                      href={tUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-semibold text-[#FF7D07] hover:underline"
                    >
                      {order.numero_suivi}
                    </a>
                  ) : (
                    <span className="font-mono font-semibold">{order.numero_suivi}</span>
                  )}
                </div>
              );
            })()}

            {currentStatut === "shipped" && (
              <div className="mt-5">
                <button
                  onClick={handleConfirmReception}
                  disabled={confirming}
                  className={[
                    "rounded-[4px] px-6 py-3 text-sm font-semibold",
                    confirming
                      ? "cursor-not-allowed bg-gray-200 text-gray-400"
                      : "bg-green-600 text-white hover:bg-green-700",
                  ].join(" ")}
                >
                  {confirming ? "Confirmation…" : "✓ Confirmer la réception"}
                </button>
                {confirmError && (
                  <p className="mt-2 text-xs text-red-600">{confirmError}</p>
                )}
                <p className="mt-1.5 text-xs text-gray-400">
                  Cliquez ici dès que vous avez reçu votre commande pour pouvoir laisser un avis au vendeur.
                </p>
              </div>
            )}
          </Card>

          {(() => {
            if (dispute) {
              return (
                <Card padding="md" className="mb-6 flex flex-wrap items-center gap-3 px-6 py-5">
                  <Badge variant={disputeBadgeVariant(dispute.statut)}>
                    {disputeBadgeLabel(dispute.statut)}
                  </Badge>
                  <p className="text-sm text-gray-500">
                    L&apos;équipe Quicklot examine la situation et vous contactera.
                  </p>
                </Card>
              );
            }

            const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
            const elapsed = Date.now() - new Date(order.created_at).getTime();
            const canOpenDispute =
              (currentStatut === "shipped" && elapsed > fiveDaysMs) ||
              currentStatut === "delivered";

            if (!canOpenDispute) return null;

            return (
              <Card padding="md" className="mb-6 px-6 py-5">
                <p className="mb-3 text-sm text-gray-700">
                  Un problème avec cette commande ?
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/messages?with=${order.seller_id}`}>
                    <Button variant="secondary" size="md">
                      Contacter le vendeur
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    variant="danger"
                    size="md"
                    onClick={() => setShowDisputePreModal(true)}
                  >
                    ⚠ Ouvrir un litige
                  </Button>
                </div>
              </Card>
            );
          })()}

          {mode === "amazon" && (
            <Card padding="md" className="mb-6 p-6">
              <h2 className="mb-2 text-base font-semibold text-gray-900">📦 Étiquettes FBA</h2>
              <p className="mb-4 text-sm text-gray-500">
                Uploadez vos étiquettes de préparation Amazon FBA (PDF, JPEG ou PNG — max 10 Mo). Le vendeur les recevra pour expédier votre lot.
              </p>

              {order.etiquettes_url && (
                <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[4px] border border-green-200 bg-green-50 px-4 py-2.5">
                  <span className="text-sm font-semibold text-green-600">✓ Étiquettes envoyées</span>
                  <Button type="button" variant="secondary" size="sm" onClick={handleDownloadLabel}>
                    Voir mes étiquettes
                  </Button>
                </div>
              )}

              {currentStatut !== "delivered" && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className={[
                        "inline-flex items-center rounded-[4px] border border-[#FF7D07] bg-white px-4 py-2 text-sm font-semibold text-[#FF7D07]",
                        uploadingLabels ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-orange-50",
                      ].join(" ")}
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
                        className="hidden"
                      />
                    </label>

                    {pendingLabelFile && (
                      <div className="flex items-center gap-1.5 rounded-[4px] border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-800">
                        <span className="max-w-[220px] truncate">{pendingLabelFile.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingLabelFile(null);
                            setLabelUploadError(null);
                          }}
                          disabled={uploadingLabels}
                          aria-label="Retirer le fichier"
                          className="text-orange-800 disabled:cursor-not-allowed"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={handleBuyerUploadLabels}
                      disabled={!pendingLabelFile || uploadingLabels}
                      loading={uploadingLabels}
                    >
                      {uploadingLabels ? "Envoi…" : "Envoyer"}
                    </Button>
                  </div>
                  {labelUploadError && (
                    <p className="mt-2 text-xs text-red-600">{labelUploadError}</p>
                  )}
                </>
              )}
            </Card>
          )}

          {currentStatut === "delivered" && (
            <Card padding="md" className="mb-6 p-6">
              {hasRating ? (
                <p className="text-sm font-semibold text-green-600">
                  ✓ Vous avez déjà laissé un avis pour cette commande
                </p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="mb-1 text-base font-semibold text-gray-900">
                      Comment s&apos;est passée cette commande ?
                    </p>
                    <p className="text-sm text-gray-500">
                      Votre avis aide les autres acheteurs.
                    </p>
                  </div>
                  <Button variant="primary" size="md" onClick={() => setShowRatingModal(true)}>
                    ⭐ Laisser un avis
                  </Button>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {isSellerView && (
        <Card padding="md" className="p-6">
          <h2 className="mb-5 text-base font-semibold text-gray-900">Mise à jour</h2>

          <div className="mb-5">
            <label htmlFor="statut" className={LABEL_CLASS}>Statut</label>
            <select
              id="statut"
              value={statut}
              onChange={(e) => setStatut(e.target.value)}
              className={`${SELECT_CLASS} cursor-pointer`}
            >
              <option value="paid">Payée</option>
              <option value="preparing">En préparation</option>
              <option value="shipped">Expédiée</option>
              <option value="delivered">Livrée</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>

          <div className="mb-5">
            <Input
              id="transporteur"
              label="Transporteur"
              type="text"
              value={transporteur}
              onChange={(e) => setTransporteur(e.target.value)}
              placeholder="Ex : Colissimo, Chronopost, DPD, UPS, DHL…"
            />
          </div>

          <div className="mb-5">
            <Input
              id="numero_suivi"
              label="Numéro de suivi"
              type="text"
              value={numeroSuivi}
              onChange={(e) => setNumeroSuivi(e.target.value)}
              placeholder="Ex : 6A12345678901"
            />
          </div>

          <div className="mb-5">
            <Textarea
              id="notes"
              label="Notes vendeur"
              value={notesVendeur}
              onChange={(e) => setNotesVendeur(e.target.value)}
              rows={3}
              placeholder="Notes internes (optionnel)…"
            />
          </div>

          {mode === "amazon" && (
            <div className="mb-6">
              <label className={LABEL_CLASS}>Étiquettes FBA de l&apos;acheteur</label>
              {order.etiquettes_url ? (
                <div className="flex flex-wrap items-center gap-3 rounded-[4px] border border-green-200 bg-green-50 px-4 py-2.5">
                  <span className="text-sm font-semibold text-green-600">✓ Étiquettes reçues</span>
                  <Button type="button" variant="primary" size="sm" onClick={handleDownloadLabel}>
                    Télécharger les étiquettes
                  </Button>
                </div>
              ) : (
                <div className="rounded-[4px] border border-dashed border-orange-200 bg-orange-50 px-4 py-3 text-sm italic text-orange-800">
                  En attente des étiquettes de l&apos;acheteur.
                </div>
              )}
            </div>
          )}

          {toast && (
            <div
              className={[
                "mb-4 rounded-[4px] border px-4 py-3 text-sm",
                toast.error
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-green-200 bg-green-50 text-green-600",
              ].join(" ")}
            >
              {toast.text}
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            onClick={handleSave}
            disabled={saving}
            loading={saving}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </Card>
      )}

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
    </PageContainer>
  );
}
