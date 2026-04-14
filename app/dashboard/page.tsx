"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PageContainer, Button, Card, Badge, Input } from "@/components/ui";

const GENERIC_ERROR = "Une erreur est survenue, veuillez réessayer.";

interface SaleOrder {
  id: string;
  listing_id: string;
  amount: number;
  seller_amount: number;
  statut: string | null;
  created_at: string;
  transporteur: string | null;
  numero_suivi: string | null;
  etiquettes_url: string | null;
  notes_vendeur: string | null;
  shipping_mode: string | null;
  listing: { titre: string; photo_url: string | null; preparation_amazon: boolean | null } | null;
  buyer: { prenom: string | null; email: string } | null;
}

interface Listing {
  id: string;
  titre: string;
  prix: number;
  status: string;
  photo_url: string | null;
}

export default function Dashboard() {
  const router = useRouter();
  const [prenom, setPrenom] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Gestion commandes
  const [expandShipment, setExpandShipment] = useState<string | null>(null);
  const [shipmentForm, setShipmentForm] = useState<Record<string, { transporteur: string; numero_suivi: string }>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Toast + modale suppression
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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

  useEffect(() => {
    async function load() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.replace("/connexion");
          return;
        }

        setPrenom(user.user_metadata?.prenom ?? user.email?.split("@")[0] ?? "là");
        setUserId(user.id);

        const [
          { data: listings, error: listingsErr },
          { data: saleOrders, error: salesErr },
          { count: unreadCount },
        ] = await Promise.all([
          supabase.from("listings").select("id, titre, prix, status, photo_url").eq("seller_id", user.id).neq("status", "removed").order("created_at", { ascending: false }),
          supabase
            .from("orders")
            .select(
              `id, listing_id, amount, seller_amount, statut, created_at, transporteur, numero_suivi, etiquettes_url, notes_vendeur, shipping_mode, listing:listing_id!left (titre, photo_url, preparation_amazon), buyer:buyer_id!left (prenom, email)`
            )
            .eq("seller_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("recipient_id", user.id)
            .eq("lu", false),
        ]);

        if (listingsErr) console.error("[dashboard] listings query error:", listingsErr);
        if (salesErr) console.error("[dashboard] sales query error:", salesErr);

        setListings((listings as Listing[]) ?? []);
        setSales((saleOrders as unknown as SaleOrder[]) ?? []);
        setUnreadMessages(unreadCount ?? 0);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  }

  const listingsActifs = listings.filter((l) => l.status === "active").length;

  const ACTIVE_SALE_STATUSES = ["paid", "preparing", "shipped", "delivered"];
  const isActiveSale = (o: SaleOrder) => {
    return o.statut != null && ACTIVE_SALE_STATUSES.includes(o.statut);
  };

  const commandesRecues = sales.filter(isActiveSale).length;

  const totalVentes = sales
    .filter(isActiveSale)
    .reduce((sum: number, o: SaleOrder) => sum + (o.seller_amount ?? 0), 0);

  // ── Gestion commandes vendeur ──

  async function reloadSales(uid: string) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `id, listing_id, amount, seller_amount, statut, created_at, transporteur, numero_suivi, etiquettes_url, notes_vendeur, shipping_mode, listing:listing_id!left (titre, photo_url, preparation_amazon), buyer:buyer_id!left (prenom, email)`
      )
      .eq("seller_id", uid)
      .order("created_at", { ascending: false });
    if (error) console.error("[dashboard] reloadSales error:", error);
    setSales((data as unknown as SaleOrder[]) ?? []);
  }

  function setBusy(orderId: string, v: boolean) {
    setActionLoading((prev) => ({ ...prev, [orderId]: v }));
  }

  async function handleMarkPreparing(orderId: string) {
    if (!userId) return;
    setBusy(orderId, true);
    const order = sales.find((o) => o.id === orderId);
    const { error } = await supabase
      .from("orders")
      .update({ statut: "preparing" })
      .eq("id", orderId)
      .select();
    if (error) {
      console.error("[dashboard] markPreparing:", error);
      showToast(GENERIC_ERROR, true);
    } else {
      if (order?.buyer?.email && order.listing?.titre) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await fetch("/api/send-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                to: order.buyer.email,
                template: "preparation-acheteur",
                data: {
                  prenom: order.buyer.prenom,
                  titreListing: order.listing.titre,
                },
              }),
            });
          }
        } catch (err) {
          console.error("[dashboard] preparation notify error:", err);
        }
      }
      await reloadSales(userId);
    }
    setBusy(orderId, false);
  }

  async function handleMarkShipped(orderId: string) {
    if (!userId) return;
    const form = shipmentForm[orderId];
    if (!form?.transporteur || !form?.numero_suivi?.trim()) {
      showToast("Transporteur et numéro de suivi requis.", true);
      return;
    }
    setBusy(orderId, true);

    const { data: updated, error } = await supabase
      .from("orders")
      .update({
        statut: "shipped",
        transporteur: form.transporteur,
        numero_suivi: form.numero_suivi.trim(),
      })
      .eq("id", orderId)
      .select();

    if (error || !updated || updated.length === 0) {
      console.error("[dashboard] markShipped:", error);
      showToast(GENERIC_ERROR, true);
      setBusy(orderId, false);
      return;
    }

    const sale = sales.find((s) => s.id === orderId);
    if (sale?.buyer?.email) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              to: sale.buyer.email,
              template: "expedition-acheteur",
              data: {
                prenom: sale.buyer.prenom,
                titreListing: sale.listing?.titre ?? "votre commande",
                transporteur: form.transporteur,
                numeroSuivi: form.numero_suivi.trim(),
                trackingUrl: trackingUrl(form.transporteur, form.numero_suivi.trim()),
              },
            }),
          });
        }
      } catch (err) {
        console.error("[dashboard] send expedition email:", err);
      }
    }

    setExpandShipment(null);
    setShipmentForm((prev) => { const n = { ...prev }; delete n[orderId]; return n; });
    await reloadSales(userId);
    setBusy(orderId, false);
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

  async function handleDownloadLabels(raw: string) {
    const paths = parseLabelPaths(raw);
    for (const path of paths) {
      const { data, error } = await supabase.storage
        .from("order-labels")
        .createSignedUrl(path, 60 * 5);
      if (error || !data) {
        console.error("[dashboard] download labels:", error);
        showToast(GENERIC_ERROR, true);
        return;
      }
      window.open(data.signedUrl, "_blank");
    }
  }

  type StatutBadge = { label: string; classes: string };
  function statutBadge(statut: string | null): StatutBadge {
    switch (statut) {
      case "paid":      return { label: "Payée",          classes: "bg-blue-100 text-blue-700" };
      case "preparing": return { label: "En préparation", classes: "bg-amber-100 text-amber-700" };
      case "shipped":   return { label: "Expédiée",       classes: "bg-indigo-100 text-indigo-700" };
      case "delivered": return { label: "Livrée",         classes: "bg-green-100 text-green-700" };
      case "cancelled": return { label: "Annulée",        classes: "bg-red-100 text-red-700" };
      case "pending":   return { label: "En attente",     classes: "bg-amber-100 text-amber-700" };
      default:          return { label: statut ?? "—",    classes: "bg-gray-100 text-gray-600" };
    }
  }

  function trackingUrl(transporteur: string, numero: string): string {
    const t = transporteur.toLowerCase();
    if (t.includes("colissimo")) return `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(numero)}`;
    if (t.includes("chronopost")) return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodeURIComponent(numero)}`;
    if (t.includes("dpd")) return `https://www.dpd.fr/trace/${encodeURIComponent(numero)}`;
    if (t.includes("ups")) return `https://www.ups.com/track?tracknum=${encodeURIComponent(numero)}`;
    if (t.includes("dhl")) return `https://www.dhl.com/fr-fr/home/tracking/tracking-express.html?tracking-id=${encodeURIComponent(numero)}`;
    return "#";
  }

  function handleSupprimer(id: string) {
    setDeleteTarget(id);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    const { error } = await supabase.from("listings").update({ status: "removed" }).eq("id", id);
    if (error) {
      console.error("[dashboard] delete listing:", error);
      showToast(GENERIC_ERROR, true);
      return;
    }
    setListings((prev) => prev.filter((l) => l.id !== id));
    showToast("Listing supprimé", false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-white">
        <p className="text-gray-500">Chargement…</p>
      </div>
    );
  }

  const sectionTitleClass = "mb-4 text-lg font-semibold text-gray-900";

  return (
    <PageContainer maxWidth="xl" background="gray">
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

      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1001,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "1.5rem",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 20px 48px rgba(0,0,0,0.25)",
            }}
          >
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem", fontWeight: 600, color: "#111827" }}>
              Supprimer ce listing ?
            </h3>
            <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.9rem", color: "#6b7280" }}>
              Cette action est irréversible.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
                Annuler
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDelete}>
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl font-bold text-gray-900">Bonjour {prenom} 👋</h1>
          <p className="text-base text-gray-500">Voici un aperçu de votre activité.</p>
        </div>
        <Button
          variant="secondary"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
        >
          Déconnexion
        </Button>
      </div>

      {/* Bannière messages non lus */}
      {unreadMessages > 0 && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FF7D07] bg-[#fff7ed] px-5 py-4">
          <p className="m-0 text-sm font-medium text-gray-900">
            📬 Vous avez <strong>{unreadMessages}</strong> message{unreadMessages > 1 ? "s" : ""} non lu{unreadMessages > 1 ? "s" : ""}
          </p>
          <Link
            href="/messages"
            className="rounded-lg bg-[#FF7D07] px-4 py-2 text-sm font-semibold text-white no-underline"
          >
            Voir mes messages
          </Link>
        </div>
      )}

      {/* ── Stats vendeur ── */}
      <section className="mb-10">
        <h2 className={sectionTitleClass}>Statistiques</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
          {[
            { label: "Listings actifs", value: String(listingsActifs) },
            { label: "Commandes reçues", value: String(commandesRecues) },
            { label: "Total des ventes", value: `${totalVentes.toFixed(2)} €` },
          ].map((s) => (
            <Card key={s.label} padding="md">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                {s.label}
              </p>
              <p className="m-0 text-2xl font-bold text-gray-900">{s.value}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Section Mes listings ── */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 text-lg font-semibold text-gray-900">Mes listings</h2>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/dashboard/listing/nouveau")}
          >
            + Nouveau
          </Button>
        </div>

        {listings.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun listing pour le moment.</p>
        ) : (
          <Card padding="none">
            {listings.map((listing, i) => (
              <div
                key={listing.id}
                className={`flex flex-wrap items-center justify-between gap-2 px-5 py-4 ${i > 0 ? "border-t border-gray-100" : ""}`}
              >
                {listing.photo_url ? (
                  <img
                    src={listing.photo_url}
                    alt={listing.titre}
                    className="h-[60px] w-[60px] flex-shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center rounded-md bg-gray-100">
                    <span className="text-[10px] text-gray-400">N/A</span>
                  </div>
                )}

                <div className="min-w-0 flex-1 px-3">
                  <p className="mb-0.5 truncate text-sm font-semibold text-gray-900">
                    {listing.titre}
                  </p>
                  <span className="text-xs font-semibold text-gray-500">
                    {listing.status}
                  </span>
                </div>

                <p className="mr-4 whitespace-nowrap text-[15px] font-bold text-gray-900">
                  {listing.prix.toFixed(2)} €
                </p>

                <div className="flex flex-shrink-0 items-center gap-2">
                  {listing.status === "sold" ? (
                    <>
                      <Badge variant="success">✓ Vendu</Badge>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const sale = sales.find((s) => s.listing_id === listing.id && isActiveSale(s));
                          if (sale) router.push(`/dashboard/commandes/${sale.id}`);
                          else router.push("/dashboard/commandes");
                        }}
                      >
                        Traiter la commande →
                      </Button>
                    </>
                  ) : listing.status === "pending_review" ? (
                    <Badge variant="warning">⏳ En validation</Badge>
                  ) : listing.status === "rejected" ? (
                    <>
                      <Badge variant="error">✕ Refusée</Badge>
                      <Button variant="danger" size="sm" onClick={() => handleSupprimer(listing.id)}>
                        Supprimer
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => router.push(`/dashboard/listing/${listing.id}/modifier`)}
                      >
                        Modifier
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleSupprimer(listing.id)}>
                        Supprimer
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* ── Section Mes ventes ── */}
      {(listingsActifs > 0 || sales.length > 0) && (
        <section id="mes-ventes" className="mb-10 scroll-mt-20">
          <h2 className={sectionTitleClass}>Commandes reçues</h2>

          {sales.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune commande reçue pour le moment.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {sales.map((order) => {
                const currentStatut = order.statut ?? "paid";
                const badge = statutBadge(currentStatut);
                const busy = !!actionLoading[order.id];
                const hasFba = order.shipping_mode === "amazon";
                const buyerName = order.buyer?.prenom || order.buyer?.email?.split("@")[0] || "Acheteur";
                const expanded = expandShipment === order.id;
                const form = shipmentForm[order.id] ?? { transporteur: "", numero_suivi: "" };

                return (
                  <Card key={order.id} id={`sale-${order.id}`} padding="md" className="transition-[outline] duration-200">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-[200px] flex-1">
                        <p className="mb-1 text-base font-semibold text-gray-900">
                          {order.listing?.titre ?? "Listing supprimé"}
                        </p>
                        <p className="mb-0.5 text-xs text-gray-500">
                          {buyerName}
                          {order.buyer?.email && <span className="text-gray-400"> · {order.buyer.email}</span>}
                        </p>
                        <p className="m-0 text-[11px] text-gray-400">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="mb-1.5 text-lg font-bold text-gray-900">
                          {order.amount.toFixed(2)} €
                        </p>
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    {currentStatut === "shipped" && order.transporteur && order.numero_suivi && (
                      <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                        📦 {order.transporteur} · <span className="font-mono">{order.numero_suivi}</span>
                      </div>
                    )}

                    {hasFba && currentStatut === "paid" && (
                      <div className="mb-3 rounded-lg border border-dashed border-[#FF7D07] bg-[#fff7ed] px-4 py-3">
                        <p className="mb-2 text-xs font-semibold text-gray-900">📦 Préparation FBA</p>
                        {order.etiquettes_url ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleDownloadLabels(order.etiquettes_url!)}
                          >
                            📄 Télécharger les étiquettes
                          </Button>
                        ) : (
                          <p className="m-0 text-xs italic text-gray-600">
                            En attente des étiquettes de l&apos;acheteur.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                      {currentStatut === "paid" && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={busy}
                          onClick={() => handleMarkPreparing(order.id)}
                        >
                          Marquer en préparation
                        </Button>
                      )}
                      {currentStatut === "preparing" && !expanded && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={busy}
                          onClick={() => setExpandShipment(order.id)}
                        >
                          Marquer comme expédié
                        </Button>
                      )}
                      {currentStatut === "shipped" && (
                        <span className="self-center text-xs italic text-gray-500">
                          En attente de confirmation par l&apos;acheteur
                        </span>
                      )}
                    </div>

                    {expanded && (
                      <div className="mt-3 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                            Transporteur
                          </label>
                          <select
                            value={form.transporteur}
                            onChange={(e) => setShipmentForm((p) => ({ ...p, [order.id]: { ...form, transporteur: e.target.value } }))}
                            className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
                          >
                            <option value="">— Choisir —</option>
                            <option value="Colissimo">Colissimo</option>
                            <option value="Chronopost">Chronopost</option>
                            <option value="DPD">DPD</option>
                            <option value="UPS">UPS</option>
                            <option value="DHL">DHL</option>
                            <option value="Autre">Autre</option>
                          </select>
                        </div>
                        <Input
                          label="Numéro de suivi"
                          type="text"
                          value={form.numero_suivi}
                          onChange={(e) => setShipmentForm((p) => ({ ...p, [order.id]: { ...form, numero_suivi: e.target.value } }))}
                          placeholder="Ex : 6A12345678901"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={busy || !form.transporteur || !form.numero_suivi.trim()}
                            onClick={() => handleMarkShipped(order.id)}
                          >
                            {busy ? "Envoi…" : "Confirmer l'expédition"}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setExpandShipment(null);
                              setShipmentForm((p) => { const n = { ...p }; delete n[order.id]; return n; });
                            }}
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}
    </PageContainer>
  );
}
