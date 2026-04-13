"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Badge, Button, Card, PageContainer } from "@/components/ui";
import type { BadgeProps } from "@/components/ui";

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
      <PageContainer background="white" maxWidth="lg">
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-sm text-gray-500">Chargement…</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer background="gray" maxWidth="lg">
      <Link
        href="/dashboard"
        className="mb-6 inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        ← Retour au dashboard
      </Link>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">Mes ventes</h1>
      <p className="mb-8 text-sm text-gray-500">
        Toutes vos ventes reçues sur Quicklot.
      </p>

      {orders.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-sm text-gray-500">
            Aucune commande reçue pour le moment.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const statut = order.statut;
            const badge = statutBadge(statut);
            const buyerName =
              order.buyer?.pseudo ||
              order.buyer?.prenom ||
              order.buyer?.email?.split("@")[0] ||
              "Acheteur";
            const mode = order.livraison_mode ?? order.shipping_mode;

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
                    {buyerName} · {formatDate(order.created_at)}
                  </p>
                  <p className="text-[0.7rem] uppercase tracking-wide text-gray-400">
                    {shippingLabel(mode)}
                  </p>
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-1.5 text-right">
                  <p className="text-base font-bold text-gray-900">
                    {(order.seller_amount ?? 0).toFixed(2)} €
                  </p>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(`/dashboard/commandes/${order.id}`)}
                  className="flex-shrink-0"
                >
                  Gérer →
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
