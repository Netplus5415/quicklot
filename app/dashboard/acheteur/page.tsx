"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Badge, Button, Card, PageContainer } from "@/components/ui";
import type { BadgeProps } from "@/components/ui";

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

function statutBadge(statut: string | null): { label: string; variant: BadgeProps["variant"] } {
  switch (statut) {
    case "paid":      return { label: "Payée",          variant: "warning" };
    case "preparing": return { label: "En préparation", variant: "info" };
    case "shipped":   return { label: "Expédiée",       variant: "info" };
    case "delivered": return { label: "Livrée",         variant: "success" };
    case "cancelled": return { label: "Annulée",        variant: "neutral" };
    default:          return { label: statut ?? "—",    variant: "neutral" };
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
      <PageContainer background="white" maxWidth="lg">
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-sm text-gray-500">Chargement…</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer background="gray" maxWidth="lg">
      {toast && (
        <div
          role="status"
          className={[
            "fixed left-1/2 top-[72px] z-50 -translate-x-1/2 rounded-[4px] border px-5 py-3 text-sm font-medium",
            "max-w-[calc(100%-2rem)]",
            toast.error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-800",
          ].join(" ")}
        >
          {toast.text}
        </div>
      )}

      <Link
        href="/dashboard"
        className="mb-6 inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        ← Retour au dashboard
      </Link>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">Mes achats</h1>
      <p className="mb-8 text-sm text-gray-500">
        Toutes vos commandes passées sur Quicklot.
      </p>

      {purchases.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="mb-4 text-sm text-gray-500">
            Vous n&apos;avez pas encore passé de commande.
          </p>
          <Link href="/boutique">
            <Button variant="primary" size="md">
              Découvrir le catalogue
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {purchases.map((order) => {
            const currentStatut = order.statut;
            const badge = statutBadge(currentStatut);
            const sellerName = order.seller?.pseudo || order.seller?.prenom || "Vendeur";

            const isFba = order.shipping_mode === "amazon";
            const canUploadLabels = isFba && order.statut !== "delivered";
            const isUploading = uploadingId === order.id;

            return (
              <Card key={order.id} padding="sm" className="flex flex-wrap items-center gap-4 p-4">
                {order.listing?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={order.listing.photo_url}
                    alt={order.listing.titre}
                    className="h-[72px] w-[72px] flex-shrink-0 rounded-[4px] object-cover"
                  />
                ) : (
                  <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-[4px] bg-gray-100">
                    <span className="text-[0.65rem] text-gray-400">N/A</span>
                  </div>
                )}

                <div className="min-w-[200px] flex-1">
                  <p className="mb-1 truncate text-sm font-semibold text-gray-900">
                    {order.listing?.titre ?? "Listing supprimé"}
                  </p>
                  <p className="mb-1 text-xs text-gray-500">
                    Vendu par{" "}
                    <Link
                      href={`/vendeur/${order.seller_id}`}
                      className="font-semibold text-[#FF7D07] hover:underline"
                    >
                      {sellerName}
                    </Link>
                  </p>
                  <p className="text-[0.7rem] uppercase tracking-wide text-gray-400">
                    {formatDate(order.created_at)}
                  </p>
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-1.5 text-right">
                  <p className="text-base font-bold text-gray-900">
                    {(order.amount ?? 0).toFixed(2)} €
                  </p>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>

                <div className="flex flex-shrink-0 gap-2">
                  <Link href={`/messages?with=${order.seller_id}`}>
                    <Button variant="secondary" size="sm">
                      Contacter le vendeur
                    </Button>
                  </Link>
                  <Link href={`/dashboard/commandes/${order.id}`}>
                    <Button variant="primary" size="sm">
                      Voir détails →
                    </Button>
                  </Link>
                </div>

                {isFba && (
                  <div className="mt-3 flex basis-full flex-col gap-2 rounded-[6px] border border-dashed border-orange-200 bg-orange-50 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-orange-800">
                        📦 Préparation FBA
                      </span>
                      {order.etiquettes_url && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownloadLabels(order.etiquettes_url!)}
                        >
                          Voir mes étiquettes
                        </Button>
                      )}
                    </div>

                    {canUploadLabels && (
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          className={[
                            "inline-flex items-center rounded-[4px] border border-[#FF7D07] bg-white px-3 py-1.5 text-[0.7rem] font-semibold text-[#FF7D07]",
                            isUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-orange-50",
                          ].join(" ")}
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
                            className="hidden"
                          />
                        </label>

                        {pendingFiles[order.id] && (
                          <div className="flex items-center gap-1.5 rounded-[4px] border border-orange-200 bg-white px-2 py-1 text-[0.7rem] text-orange-800">
                            <span className="max-w-[180px] truncate">
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
                              className="text-orange-800 disabled:cursor-not-allowed"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => handleUploadLabels(order.id)}
                          disabled={!pendingFiles[order.id] || isUploading}
                          loading={isUploading}
                        >
                          {isUploading ? "Envoi…" : "Envoyer"}
                        </Button>
                      </div>
                    )}

                    {uploadErrors[order.id] && (
                      <p className="text-xs text-red-600">{uploadErrors[order.id]}</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
