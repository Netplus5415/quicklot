"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Badge, Button, Card, Input, PageContainer } from "@/components/ui";
import type { BadgeProps } from "@/components/ui";

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

interface DisputeRow {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  raison: string;
  description: string;
  statut: string;
  resolution: string | null;
  note_admin: string | null;
  created_at: string;
  buyer_email?: string;
  seller_email?: string;
}

const LABEL_STRONG = "text-xs font-semibold uppercase tracking-wide text-gray-500";
const TH_CLASS =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap border-b border-gray-200";
const TD_CLASS = "px-4 py-3 text-sm text-gray-700 border-b border-gray-100 align-middle";

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
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({});
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

  async function loadDisputes(usersMap?: Record<string, string>) {
    const { data, error } = await supabase
      .from("disputes")
      .select("id, order_id, buyer_id, seller_id, raison, description, statut, resolution, note_admin, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin] loadDisputes error:", error);
      showToast(GENERIC_ERROR, true);
      return;
    }

    let map = usersMap;
    if (!map) {
      const { data: usersData } = await supabase.from("users").select("id, email");
      map = {};
      (usersData ?? []).forEach((u: { id: string; email: string }) => { map![u.id] = u.email; });
    }

    const enriched = ((data ?? []) as DisputeRow[]).map((d) => ({
      ...d,
      buyer_email: map![d.buyer_id] ?? d.buyer_id.slice(0, 8) + "…",
      seller_email: map![d.seller_id] ?? d.seller_id.slice(0, 8) + "…",
    }));

    const priority: Record<string, number> = { ouvert: 0, en_cours: 1, resolu: 2, clos: 3 };
    enriched.sort((a, b) => {
      const pa = priority[a.statut] ?? 99;
      const pb = priority[b.statut] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setDisputes(enriched);
  }

  useEffect(() => {
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.replace("/");
          return;
        }

        // Vérification du rôle via public.users.role = 'admin'
        const { data: me } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if ((me as { role?: string | null } | null)?.role !== "admin") {
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
          loadDisputes(usersMap),
        ]);
      } finally {
        setAuthLoading(false);
      }
    }

    load();
  }, [router]);

  async function handleKycApprove(req: KycRequest) {
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

  async function handleDisputeTakeOver(d: DisputeRow) {
    const { error } = await supabase
      .from("disputes")
      .update({ statut: "en_cours", updated_at: new Date().toISOString() })
      .eq("id", d.id);
    if (error) {
      console.error("[admin] dispute take over:", error);
      showToast(GENERIC_ERROR, true);
      return;
    }
    showToast("Litige pris en charge", false);
    await loadDisputes();
  }

  async function handleDisputeResolve(d: DisputeRow) {
    const note = disputeNotes[d.id]?.trim();
    if (!note) {
      showToast("Veuillez saisir une note de résolution.", true);
      return;
    }
    const { error } = await supabase
      .from("disputes")
      .update({
        statut: "resolu",
        note_admin: note,
        resolution: note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", d.id);
    if (error) {
      console.error("[admin] dispute resolve:", error);
      showToast(GENERIC_ERROR, true);
      return;
    }
    setDisputeNotes((prev) => { const n = { ...prev }; delete n[d.id]; return n; });
    showToast("Litige marqué comme résolu", false);
    await loadDisputes();
  }

  async function handleDisputeClose(d: DisputeRow) {
    const { error } = await supabase
      .from("disputes")
      .update({ statut: "clos", updated_at: new Date().toISOString() })
      .eq("id", d.id);
    if (error) {
      console.error("[admin] dispute close:", error);
      showToast(GENERIC_ERROR, true);
      return;
    }
    showToast("Litige clos", false);
    await loadDisputes();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  function statusBadgeVariant(status: string): BadgeProps["variant"] {
    switch (status) {
      case "active":    return "success";
      case "pending":   return "warning";
      case "removed":
      case "cancelled": return "error";
      case "completed": return "info";
      default:          return "neutral";
    }
  }

  function roleBadgeVariant(role: string): BadgeProps["variant"] {
    if (role === "admin") return "warning";
    if (role === "seller") return "info";
    return "neutral";
  }

  function disputeStatutVariant(statut: string): BadgeProps["variant"] {
    switch (statut) {
      case "ouvert":   return "error";
      case "en_cours": return "warning";
      case "resolu":   return "success";
      case "clos":     return "neutral";
      default:         return "error";
    }
  }

  function disputeStatutLabel(statut: string): string {
    switch (statut) {
      case "ouvert":   return "Ouvert";
      case "en_cours": return "En cours";
      case "resolu":   return "Résolu";
      case "clos":     return "Clos";
      default:         return statut;
    }
  }

  if (authLoading) {
    return (
      <PageContainer background="white" maxWidth="2xl">
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-sm text-gray-500">Vérification des accès…</p>
        </div>
      </PageContainer>
    );
  }

  const raisonLabels: Record<string, string> = {
    non_expedition: "Non-expédition dans les délais",
    non_conformite: "Lot non conforme",
  };
  const activeDisputeCount = disputes.filter((d) => d.statut === "ouvert" || d.statut === "en_cours").length;

  return (
    <PageContainer background="white" maxWidth="2xl">
      {toast && (
        <div
          role="status"
          className={[
            "fixed left-1/2 top-[72px] z-50 -translate-x-1/2 rounded-[4px] border px-5 py-3 text-sm font-medium max-w-[calc(100%-2rem)]",
            toast.error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-800",
          ].join(" ")}
        >
          {toast.text}
        </div>
      )}

      <h1 className="mb-8 text-2xl font-bold text-gray-900">Panel Admin</h1>

      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Demandes de vérification ({kycRequests.length})
      </h2>
      {kycRequests.length === 0 ? (
        <p className="mb-10 text-sm text-gray-500">Aucune demande en attente.</p>
      ) : (
        <div className="mb-10 flex flex-col gap-4">
          {kycRequests.map((req) => (
            <Card key={req.id} padding="md" className="p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[200px] flex-1">
                  <p className="mb-1 text-base font-semibold text-gray-900">{req.nom_entreprise}</p>
                  <p className="mb-1 text-sm text-gray-500">
                    N° : <span className="font-mono">{req.numero_entreprise}</span>
                  </p>
                  {(req.adresse || req.code_postal || req.ville_kyc || req.pays) && (
                    <p className="mb-1 text-xs text-gray-500">
                      📍 {[req.adresse, [req.code_postal, req.ville_kyc].filter(Boolean).join(" "), req.pays].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {req.user_email} · {formatDate(req.created_at)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col gap-1.5">
                  {req.document_url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownloadDocument(req.document_url!)}
                    >
                      📄 Voir le document
                    </Button>
                  )}
                  {req.piece_identite_url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownloadDocument(req.piece_identite_url!)}
                    >
                      🪪 Voir la pièce d&apos;identité
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
                <div className="min-w-[200px] flex-1">
                  <Input
                    type="text"
                    value={rejectNote[req.id] ?? ""}
                    onChange={(e) => setRejectNote((prev) => ({ ...prev, [req.id]: e.target.value }))}
                    placeholder="Raison du refus (si rejet)"
                  />
                </div>
                <Button variant="danger" size="md" onClick={() => handleKycReject(req)}>
                  Rejeter
                </Button>
                <Button variant="primary" size="md" onClick={() => handleKycApprove(req)}>
                  ✓ Approuver
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Litiges ({activeDisputeCount} actif{activeDisputeCount > 1 ? "s" : ""} · {disputes.length} total)
      </h2>
      {disputes.length === 0 ? (
        <p className="mb-10 text-sm text-gray-500">Aucun litige.</p>
      ) : (
        <div className="mb-10 flex flex-col gap-4">
          {disputes.map((d) => (
            <Card key={d.id} padding="md" className="p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[200px] flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant={disputeStatutVariant(d.statut)}>
                      {disputeStatutLabel(d.statut)}
                    </Badge>
                    <span className="text-sm font-semibold text-gray-900">
                      {raisonLabels[d.raison] ?? d.raison}
                    </span>
                  </div>
                  <p className="mb-1 font-mono text-xs text-gray-500">
                    order: {d.order_id.slice(0, 8)}…
                  </p>
                  <p className="mb-1 text-xs text-gray-500">
                    Acheteur : {d.buyer_email} · Vendeur : {d.seller_email}
                  </p>
                  <p className="text-[0.7rem] uppercase tracking-wide text-gray-400">
                    {formatDate(d.created_at)}
                  </p>
                </div>
              </div>

              <div className="mb-3 whitespace-pre-wrap rounded-[4px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {d.description}
              </div>

              {d.note_admin && (
                <div className="mb-3 rounded-[4px] border border-green-200 bg-green-50 px-4 py-2.5 text-xs text-green-800">
                  <strong>Note admin :</strong> {d.note_admin}
                </div>
              )}

              {(d.statut === "ouvert" || d.statut === "en_cours") && (
                <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
                  <div className="min-w-[200px] flex-1">
                    <Input
                      type="text"
                      value={disputeNotes[d.id] ?? ""}
                      onChange={(e) => setDisputeNotes((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      placeholder="Note de résolution (requise pour 'Marquer résolu')"
                    />
                  </div>
                  {d.statut === "ouvert" && (
                    <Button variant="secondary" size="md" onClick={() => handleDisputeTakeOver(d)}>
                      Prendre en charge
                    </Button>
                  )}
                  <Button variant="primary" size="md" onClick={() => handleDisputeResolve(d)}>
                    Marquer résolu
                  </Button>
                  <Button variant="secondary" size="md" onClick={() => handleDisputeClose(d)}>
                    Clore
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Listings en attente ({pendingListings.length})
      </h2>
      {pendingListings.length === 0 ? (
        <p className="mb-10 text-sm text-gray-500">Aucun listing en attente de validation.</p>
      ) : (
        <div className="mb-10 flex flex-col gap-4">
          {pendingListings.map((l) => (
            <Card key={l.id} padding="md" className="p-5">
              <div className="mb-4 flex flex-wrap gap-4">
                {l.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.photo_url}
                    alt={l.titre}
                    className="h-[120px] w-[120px] flex-shrink-0 rounded-[4px] object-cover"
                  />
                ) : (
                  <div className="flex h-[120px] w-[120px] flex-shrink-0 items-center justify-center rounded-[4px] bg-gray-100">
                    <span className="text-xs text-gray-400">Pas de photo</span>
                  </div>
                )}
                <div className="min-w-[200px] flex-1">
                  <p className="mb-1 text-base font-bold text-gray-900">{l.titre}</p>
                  <p className="mb-2 text-base font-bold text-[#FF7D07]">
                    {Number(l.prix).toFixed(2)} €
                    <span className="ml-2 text-xs font-medium text-gray-400">· {l.type}</span>
                  </p>
                  <p className="mb-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {l.description.length > 300 ? l.description.slice(0, 300) + "…" : l.description}
                  </p>
                  <p className="text-[0.7rem] uppercase tracking-wide text-gray-400">
                    {l.seller_email} · {formatDate(l.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
                <div className="min-w-[200px] flex-1">
                  <Input
                    type="text"
                    value={listingRejectNote[l.id] ?? ""}
                    onChange={(e) => setListingRejectNote((prev) => ({ ...prev, [l.id]: e.target.value }))}
                    placeholder="Raison du refus (obligatoire si rejet)"
                  />
                </div>
                <Button variant="danger" size="md" onClick={() => handleListingReject(l)}>
                  Refuser
                </Button>
                <Button variant="primary" size="md" onClick={() => handleListingApprove(l)}>
                  ✓ Approuver
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-4 text-lg font-semibold text-gray-900">Listings ({listings.length})</h2>
      <div className="mb-10 overflow-x-auto rounded-[6px] border border-gray-200 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className={TH_CLASS}>ID</th>
              <th className={TH_CLASS}>Titre</th>
              <th className={TH_CLASS}>Vendeur</th>
              <th className={TH_CLASS}>Prix</th>
              <th className={TH_CLASS}>Statut</th>
              <th className={TH_CLASS}>Action</th>
            </tr>
          </thead>
          <tbody>
            {listings.length === 0 ? (
              <tr>
                <td colSpan={6} className={`${TD_CLASS} text-center text-gray-500`}>
                  Aucun listing.
                </td>
              </tr>
            ) : listings.map((l) => (
              <tr key={l.id}>
                <td className={`${TD_CLASS} font-mono text-xs text-gray-500`}>{l.id.slice(0, 8)}…</td>
                <td className={TD_CLASS}>{l.titre}</td>
                <td className={`${TD_CLASS} text-xs text-gray-500`}>{l.seller_email}</td>
                <td className={`${TD_CLASS} font-semibold text-gray-900`}>{l.prix.toFixed(2)} €</td>
                <td className={TD_CLASS}>
                  <Badge variant={statusBadgeVariant(l.status)}>{l.status}</Badge>
                </td>
                <td className={TD_CLASS}>
                  {l.status !== "removed" ? (
                    <Button variant="danger" size="sm" onClick={() => handleSupprimer(l.id)}>
                      Supprimer
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-400">Supprimé</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-gray-900">Utilisateurs ({users.length})</h2>
      <div className="mb-10 overflow-x-auto rounded-[6px] border border-gray-200 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className={TH_CLASS}>Email</th>
              <th className={TH_CLASS}>Rôle</th>
              <th className={TH_CLASS}>Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={3} className={`${TD_CLASS} text-center text-gray-500`}>
                  Aucun utilisateur.
                </td>
              </tr>
            ) : users.map((u) => (
              <tr key={u.id}>
                <td className={TD_CLASS}>{u.email}</td>
                <td className={TD_CLASS}>
                  <Badge variant={roleBadgeVariant(u.role)}>{u.role}</Badge>
                </td>
                <td className={`${TD_CLASS} text-gray-500`}>{formatDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-gray-900">Commandes ({orders.length})</h2>
      <div className="mb-10 overflow-x-auto rounded-[6px] border border-gray-200 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className={TH_CLASS}>ID</th>
              <th className={TH_CLASS}>Montant</th>
              <th className={TH_CLASS}>Statut</th>
              <th className={TH_CLASS}>Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={4} className={`${TD_CLASS} text-center text-gray-500`}>
                  Aucune commande.
                </td>
              </tr>
            ) : orders.map((o) => (
              <tr key={o.id}>
                <td className={`${TD_CLASS} font-mono text-xs text-gray-500`}>{o.id.slice(0, 8)}…</td>
                <td className={`${TD_CLASS} font-semibold text-gray-900`}>{o.amount.toFixed(2)} €</td>
                <td className={TD_CLASS}>
                  <Badge variant={statusBadgeVariant(o.status)}>{o.status}</Badge>
                </td>
                <td className={`${TD_CLASS} text-gray-500`}>{formatDate(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
