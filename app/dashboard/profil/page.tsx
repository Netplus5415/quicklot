"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PageContainer, Button, Card, Badge, Input, Textarea } from "@/components/ui";
import {
  hasAllRequiredSellerFields,
  SELLER_PROFILE_COLUMNS,
} from "@/lib/seller-profile";

interface PublicProfile {
  pseudo: string;
  avatar_url: string | null;
}

interface SellerInfo {
  bio: string;
  nom_entreprise: string;
  numero_entreprise: string;
  adresse: string;
  code_postal: string;
  ville: string;
  pays: string;
}

type StripeAccountStatus = "none" | "pending" | "active";
type StripeCountry = "FR" | "BE" | "ES" | "IT" | "LU";

const EMPTY_SELLER_INFO: SellerInfo = {
  bio: "",
  nom_entreprise: "",
  numero_entreprise: "",
  adresse: "",
  code_postal: "",
  ville: "",
  pays: "France",
};

export default function ProfilEdit() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Identité publique (avatar + pseudo)
  const [profile, setProfile] = useState<PublicProfile>({ pseudo: "", avatar_url: null });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Informations vendeur (séparé des docs KYC)
  const [sellerInfo, setSellerInfo] = useState<SellerInfo>(EMPTY_SELLER_INFO);
  const [sellerSaving, setSellerSaving] = useState(false);
  const [sellerMessage, setSellerMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [sellerProfileCompletedAt, setSellerProfileCompletedAt] = useState<string | null>(null);

  // Stripe Connect
  const [stripeStatus, setStripeStatus] = useState<StripeAccountStatus>("none");
  const [stripeBalance, setStripeBalance] = useState<{ available: number; pending: number } | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeToast, setStripeToast] = useState<{ text: string; error: boolean } | null>(null);
  const [stripeCountryModal, setStripeCountryModal] = useState(false);
  const [stripeCountry, setStripeCountry] = useState<StripeCountry | "">("");
  const stripeToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stripeRefreshHandledRef = useRef(false);

  // KYC (badge facultatif "Vendeur vérifié Quicklot")
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [kycNoteAdmin, setKycNoteAdmin] = useState<string | null>(null);
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycIdFile, setKycIdFile] = useState<File | null>(null);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycMessage, setKycMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.replace("/connexion");
          return;
        }
        setUserId(user.id);

        const { data: profileData } = await supabase
          .from("users")
          .select(`pseudo, avatar_url, ${SELLER_PROFILE_COLUMNS}`)
          .eq("id", user.id)
          .single();

        if (profileData) {
          const p = profileData as {
            pseudo?: string | null;
            avatar_url?: string | null;
            bio?: string | null;
            nom_entreprise?: string | null;
            numero_entreprise?: string | null;
            adresse?: string | null;
            code_postal?: string | null;
            ville?: string | null;
            pays?: string | null;
            seller_profile_completed_at?: string | null;
            kyc_status?: string | null;
            stripe_account_status?: string | null;
          };
          setProfile({
            pseudo: p.pseudo ?? "",
            avatar_url: p.avatar_url ?? null,
          });
          setSellerInfo({
            bio: p.bio ?? "",
            nom_entreprise: p.nom_entreprise ?? "",
            numero_entreprise: p.numero_entreprise ?? "",
            adresse: p.adresse ?? "",
            code_postal: p.code_postal ?? "",
            ville: p.ville ?? "",
            pays: p.pays ?? "France",
          });
          setSellerProfileCompletedAt(p.seller_profile_completed_at ?? null);
          setKycStatus(p.kyc_status ?? null);
          const rawStripe = p.stripe_account_status ?? null;
          const resolvedStripe: StripeAccountStatus =
            rawStripe === "active" || rawStripe === "pending" ? rawStripe : "none";
          setStripeStatus(resolvedStripe);
        }

        const { data: kycReq } = await supabase
          .from("kyc_requests")
          .select("statut, note_admin")
          .eq("user_id", user.id)
          .maybeSingle();
        if (kycReq) {
          const r = kycReq as { note_admin?: string | null; statut?: string };
          setKycNoteAdmin(r.note_admin ?? null);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  function showStripeToast(text: string, error = false) {
    setStripeToast({ text, error });
    if (stripeToastTimerRef.current) clearTimeout(stripeToastTimerRef.current);
    stripeToastTimerRef.current = setTimeout(() => setStripeToast(null), 5000);
  }

  useEffect(() => {
    return () => {
      if (stripeToastTimerRef.current) clearTimeout(stripeToastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (stripeStatus !== "active") {
      setStripeBalance(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const res = await fetch("/api/stripe-connect/balance", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { available?: number; pending?: number };
        if (!cancelled && typeof data.available === "number" && typeof data.pending === "number") {
          setStripeBalance({ available: data.available, pending: data.pending });
        }
      } catch {
        // silencieux : le solde est un enrichissement non critique
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stripeStatus]);

  async function reloadStripeStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("users")
      .select("stripe_account_status")
      .eq("id", user.id)
      .maybeSingle();
    const raw = (data as { stripe_account_status?: string | null } | null)?.stripe_account_status ?? null;
    const resolved: StripeAccountStatus =
      raw === "active" || raw === "pending" ? raw : "none";
    setStripeStatus(resolved);
  }

  async function runStripeConnect(country?: StripeCountry) {
    setStripeLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showStripeToast("Session expirée. Veuillez vous reconnecter.", true);
        setStripeLoading(false);
        return;
      }
      const body: { country?: string } = {};
      if (country) {
        body.country = country;
      }
      const res = await fetch("/api/stripe-connect/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "Impossible de récupérer le lien Stripe.");
      }
      window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("[stripe-connect] onboard error:", msg);
      showStripeToast(msg, true);
      setStripeLoading(false);
    }
  }

  function handleStripeConnect() {
    if (stripeStatus === "none") {
      setStripeCountry("");
      setStripeCountryModal(true);
      return;
    }
    void runStripeConnect();
  }

  function handleStripeCountryConfirm() {
    if (!stripeCountry) return;
    setStripeCountryModal(false);
    void runStripeConnect(stripeCountry);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URL(window.location.href).searchParams;
    const stripeParam = params.get("stripe");
    if (!stripeParam) return;

    if (stripeParam === "success") {
      showStripeToast("Compte bancaire connecté avec succès", false);
      void reloadStripeStatus();
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe");
      window.history.replaceState({}, "", url.toString());
    } else if (stripeParam === "refresh" && !stripeRefreshHandledRef.current) {
      stripeRefreshHandledRef.current = true;
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe");
      window.history.replaceState({}, "", url.toString());
      void runStripeConnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSaveProfile() {
    if (!userId) return;

    setProfileSaving(true);
    setProfileMessage(null);

    let avatarUrl = profile.avatar_url;

    if (avatarFile) {
      const path = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

      if (uploadError) {
        setProfileMessage({ text: uploadError.message, error: true });
        setProfileSaving(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = publicUrl;
    }

    const { error } = await supabase
      .from("users")
      .update({
        pseudo: profile.pseudo.trim() || null,
        avatar_url: avatarUrl,
      })
      .eq("id", userId);

    if (error) {
      setProfileMessage({ text: error.message, error: true });
    } else {
      setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));
      setAvatarFile(null);
      setProfileMessage({ text: "Profil sauvegardé !", error: false });
    }
    setProfileSaving(false);
  }

  async function handleSaveSellerInfo() {
    if (!userId) return;
    setSellerMessage(null);

    const trimmed: SellerInfo = {
      bio: sellerInfo.bio.trim(),
      nom_entreprise: sellerInfo.nom_entreprise.trim(),
      numero_entreprise: sellerInfo.numero_entreprise.trim(),
      adresse: sellerInfo.adresse.trim(),
      code_postal: sellerInfo.code_postal.trim(),
      ville: sellerInfo.ville.trim(),
      pays: sellerInfo.pays.trim() || "France",
    };

    if (!trimmed.bio) {
      setSellerMessage({ text: "Veuillez renseigner la description de votre activité.", error: true });
      return;
    }
    if (!trimmed.nom_entreprise || !trimmed.numero_entreprise) {
      setSellerMessage({ text: "Veuillez remplir le nom et le numéro d'entreprise.", error: true });
      return;
    }
    if (!trimmed.adresse || !trimmed.code_postal || !trimmed.ville) {
      setSellerMessage({ text: "Veuillez remplir l'adresse, le code postal et la ville.", error: true });
      return;
    }

    setSellerSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setSellerMessage({ text: "Session expirée. Veuillez vous reconnecter.", error: true });
      setSellerSaving(false);
      return;
    }

    const res = await fetch("/api/seller-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(trimmed),
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { error?: string };
      setSellerMessage({
        text: errData.error ?? "Erreur lors de la sauvegarde.",
        error: true,
      });
      setSellerSaving(false);
      return;
    }

    const data = (await res.json().catch(() => ({}))) as {
      seller_profile_completed_at?: string | null;
    };
    setSellerInfo(trimmed);
    if (data.seller_profile_completed_at) {
      setSellerProfileCompletedAt(data.seller_profile_completed_at);
    }
    setSellerMessage({ text: "Informations vendeur sauvegardées !", error: false });
    setSellerSaving(false);
  }

  async function handleKycSubmit() {
    if (!userId) return;

    if (!hasAllRequiredSellerFields(sellerInfo)) {
      setKycMessage({
        text: "Remplissez et sauvegardez d'abord vos informations vendeur ci-dessus.",
        error: true,
      });
      return;
    }
    if (!sellerProfileCompletedAt) {
      setKycMessage({
        text: "Sauvegardez vos informations vendeur avant d'envoyer la demande de vérification.",
        error: true,
      });
      return;
    }
    if (!kycFile) {
      setKycMessage({ text: "Veuillez joindre un document justificatif.", error: true });
      return;
    }
    const docTypeOk = kycFile.type.startsWith("image/") || kycFile.type === "application/pdf";
    if (!docTypeOk) {
      setKycMessage({ text: "Le document justificatif doit être une image ou un PDF.", error: true });
      return;
    }
    if (kycFile.size > 10 * 1024 * 1024) {
      setKycMessage({ text: "Le document justificatif ne doit pas dépasser 10 Mo.", error: true });
      return;
    }
    if (!kycIdFile) {
      setKycMessage({ text: "Veuillez joindre une pièce d'identité.", error: true });
      return;
    }
    if (!["image/jpeg", "image/png"].includes(kycIdFile.type)) {
      setKycMessage({ text: "La pièce d'identité doit être au format JPEG ou PNG.", error: true });
      return;
    }
    if (kycIdFile.size > 5 * 1024 * 1024) {
      setKycMessage({ text: "La pièce d'identité ne doit pas dépasser 5 Mo.", error: true });
      return;
    }

    setKycSubmitting(true);
    setKycMessage(null);

    const docExt = kycFile.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const docPath = `${userId}/document.${docExt}`;
    const { error: docUploadError } = await supabase.storage
      .from("kyc-documents")
      .upload(docPath, kycFile, { upsert: true, contentType: kycFile.type });

    if (docUploadError) {
      setKycMessage({ text: docUploadError.message, error: true });
      setKycSubmitting(false);
      return;
    }

    const idExt = kycIdFile.type === "image/png" ? "png" : "jpg";
    const idPath = `${userId}/identite.${idExt}`;
    const { error: idUploadError } = await supabase.storage
      .from("kyc-documents")
      .upload(idPath, kycIdFile, { upsert: true, contentType: kycIdFile.type });

    if (idUploadError) {
      setKycMessage({ text: idUploadError.message, error: true });
      setKycSubmitting(false);
      return;
    }

    const { data: { session: kycSession } } = await supabase.auth.getSession();
    if (!kycSession?.access_token) {
      setKycMessage({ text: "Session expirée. Veuillez vous reconnecter.", error: true });
      setKycSubmitting(false);
      return;
    }

    const submitRes = await fetch("/api/kyc/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${kycSession.access_token}`,
      },
      body: JSON.stringify({
        nom_entreprise: sellerInfo.nom_entreprise.trim(),
        numero_entreprise: sellerInfo.numero_entreprise.trim(),
        adresse: sellerInfo.adresse.trim(),
        code_postal: sellerInfo.code_postal.trim(),
        ville_kyc: sellerInfo.ville.trim(),
        pays: sellerInfo.pays.trim() || "France",
        bio: sellerInfo.bio.trim(),
      }),
    });

    if (!submitRes.ok) {
      const errData = await submitRes.json().catch(() => ({}));
      setKycMessage({
        text: (errData as { error?: string }).error ?? "Erreur lors de la soumission.",
        error: true,
      });
      setKycSubmitting(false);
      return;
    }

    setKycStatus("pending");
    setKycFile(null);
    setKycIdFile(null);
    setKycMessage({ text: "Demande envoyée ! Elle sera traitée sous 48h.", error: false });
    setKycSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-white">
        <p className="text-gray-500">Chargement…</p>
      </div>
    );
  }

  return (
    <PageContainer maxWidth="lg" background="gray">
      {stripeCountryModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !stripeLoading && setStripeCountryModal(false)}
          className="fixed inset-0 z-[1003] flex items-center justify-center bg-black/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] rounded-[6px] border border-gray-200 bg-white p-6 shadow-lg"
          >
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Dans quel pays est enregistrée votre entreprise ?
            </h3>
            <p className="mb-5 text-sm text-gray-500">
              Stripe utilisera ce pays pour créer votre compte de reversement.
            </p>

            <label htmlFor="stripe-country" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Pays
            </label>
            <select
              id="stripe-country"
              value={stripeCountry}
              onChange={(e) => setStripeCountry(e.target.value as StripeCountry | "")}
              disabled={stripeLoading}
              className="mb-6 w-full cursor-pointer rounded-[4px] border-[1.5px] border-[#D1D5DB] bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#FF7D07] focus:outline-none focus:shadow-[0_0_0_3px_rgba(255,125,7,0.12)]"
            >
              <option value="" disabled>
                Sélectionnez un pays…
              </option>
              <option value="FR">France</option>
              <option value="BE">Belgique</option>
              <option value="ES">Espagne</option>
              <option value="IT">Italie</option>
              <option value="LU">Luxembourg</option>
            </select>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStripeCountryModal(false)}
                disabled={stripeLoading}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleStripeCountryConfirm}
                loading={stripeLoading}
                disabled={!stripeCountry || stripeLoading}
              >
                Continuer
              </Button>
            </div>
          </div>
        </div>
      )}

      <Link
        href="/dashboard"
        className="mb-6 inline-block text-sm text-gray-500 no-underline hover:text-gray-700"
      >
        ← Retour au dashboard
      </Link>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-3xl font-bold text-gray-900">Mon profil</h1>
        {userId && (
          <Link
            href={`/vendeur/${userId}`}
            className="text-sm font-semibold text-[#FF7D07] no-underline hover:underline"
          >
            Voir mon profil public →
          </Link>
        )}
      </div>

      {/* ── Identité publique ── */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Identité publique</h2>
        <Card padding="lg">
          <div className="mb-6 flex items-center gap-5">
            {avatarPreview || profile.avatar_url ? (
              <img
                src={avatarPreview ?? profile.avatar_url!}
                alt="Avatar"
                className="h-20 w-20 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-[#FF7D07]">
                <span className="text-3xl font-bold text-white">
                  {(profile.pseudo || "V").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <label
                htmlFor="avatar-upload"
                className="inline-block cursor-pointer rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700"
              >
                Changer la photo
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              {avatarFile && <p className="mt-1 text-xs text-gray-500">{avatarFile.name}</p>}
            </div>
          </div>

          {profileMessage && (
            <div
              className={`mb-4 max-w-md rounded-lg border px-4 py-2.5 text-sm ${
                profileMessage.error
                  ? "border-red-300 bg-red-50 text-red-600"
                  : "border-green-300 bg-green-50 text-green-700"
              }`}
            >
              {profileMessage.text}
            </div>
          )}

          <Button
            variant="primary"
            loading={profileSaving}
            onClick={handleSaveProfile}
          >
            {profileSaving ? "Sauvegarde…" : "Sauvegarder"}
          </Button>
        </Card>
      </section>

      {/* ── Informations vendeur (obligatoires, sans documents) ── */}
      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Informations vendeur</h2>
        <p className="mb-4 text-sm text-gray-500">
          Coordonnées de votre activité. Aucun document n&apos;est requis ici — la
          vérification avec justificatifs est facultative et se fait plus bas.
        </p>
        <Card padding="lg">
          <div className="mb-5 max-w-lg">
            <Textarea
              id="seller_bio"
              label="Description de votre activité *"
              maxLength={300}
              rows={4}
              value={sellerInfo.bio}
              onChange={(e) => setSellerInfo((s) => ({ ...s, bio: e.target.value }))}
              placeholder="Décrivez votre activité, vos types de produits, votre zone géographique…"
              helperText={`${300 - sellerInfo.bio.length} caractères restants`}
            />
          </div>
          <div className="mb-5 max-w-md">
            <Input
              id="seller_nom_entreprise"
              label="Nom de l'entreprise *"
              type="text"
              value={sellerInfo.nom_entreprise}
              onChange={(e) => setSellerInfo((s) => ({ ...s, nom_entreprise: e.target.value }))}
              placeholder="Ma Société SARL"
            />
          </div>
          <div className="mb-5 max-w-md">
            <Input
              id="seller_numero_entreprise"
              label="Numéro d'entreprise (SIRET / TVA / RCS) *"
              type="text"
              value={sellerInfo.numero_entreprise}
              onChange={(e) => setSellerInfo((s) => ({ ...s, numero_entreprise: e.target.value }))}
              placeholder="123 456 789 00012"
            />
          </div>
          <div className="mb-5 max-w-md">
            <Input
              id="seller_adresse"
              label="Adresse *"
              type="text"
              value={sellerInfo.adresse}
              onChange={(e) => setSellerInfo((s) => ({ ...s, adresse: e.target.value }))}
              placeholder="12 rue de la République"
            />
          </div>
          <div className="mb-5 flex max-w-md flex-wrap gap-3">
            <div className="w-32">
              <Input
                id="seller_code_postal"
                label="Code postal *"
                type="text"
                maxLength={10}
                value={sellerInfo.code_postal}
                onChange={(e) => setSellerInfo((s) => ({ ...s, code_postal: e.target.value }))}
                placeholder="69000"
              />
            </div>
            <div className="min-w-[180px] flex-1">
              <Input
                id="seller_ville"
                label="Ville *"
                type="text"
                value={sellerInfo.ville}
                onChange={(e) => setSellerInfo((s) => ({ ...s, ville: e.target.value }))}
                placeholder="Lyon"
              />
            </div>
          </div>
          <div className="mb-6 max-w-md">
            <Input
              id="seller_pays"
              label="Pays *"
              type="text"
              value={sellerInfo.pays}
              onChange={(e) => setSellerInfo((s) => ({ ...s, pays: e.target.value }))}
              placeholder="France"
            />
          </div>

          {sellerMessage && (
            <div
              className={`mb-4 max-w-md rounded-lg border px-4 py-2.5 text-sm ${
                sellerMessage.error
                  ? "border-red-300 bg-red-50 text-red-600"
                  : "border-green-300 bg-green-50 text-green-700"
              }`}
            >
              {sellerMessage.text}
            </div>
          )}

          <Button
            variant="primary"
            loading={sellerSaving}
            onClick={handleSaveSellerInfo}
          >
            {sellerSaving ? "Sauvegarde…" : "Sauvegarder mes informations"}
          </Button>
        </Card>
      </section>

      {/* ── Stripe Connect (requis pour vendre) ── */}
      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">
          Compte bancaire &amp; reversements
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Indispensable pour encaisser vos ventes sur Quicklot.
        </p>
        <Card padding="lg">
          {stripeToast && (
            <div
              className={`mb-4 max-w-md rounded-[4px] border px-4 py-2.5 text-sm ${
                stripeToast.error
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-green-200 bg-green-50 text-green-700"
              }`}
            >
              {stripeToast.text}
            </div>
          )}

          {stripeStatus === "active" ? (
            <>
              <div className="flex flex-wrap items-center gap-4">
                <Badge variant="success">✓ Compte bancaire connecté</Badge>
                <p className="m-0 flex-1 text-sm text-gray-500">
                  Les reversements sont envoyés automatiquement après chaque vente confirmée.
                </p>
                <Button
                  variant="secondary"
                  loading={stripeLoading}
                  onClick={handleStripeConnect}
                >
                  Gérer mon compte bancaire
                </Button>
              </div>
              {stripeBalance && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "0.75rem",
                    marginTop: "1.25rem",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "8px",
                      padding: "0.9rem 1rem",
                    }}
                  >
                    <p
                      style={{
                        color: "#166534",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        margin: "0 0 0.35rem 0",
                      }}
                    >
                      Solde disponible
                    </p>
                    <p
                      style={{
                        color: "#16a34a",
                        fontSize: "1.375rem",
                        fontWeight: 700,
                        margin: 0,
                      }}
                    >
                      {stripeBalance.available.toFixed(2)} €
                    </p>
                  </div>
                  <div
                    style={{
                      backgroundColor: "#fff7ed",
                      border: "1px solid #fed7aa",
                      borderRadius: "8px",
                      padding: "0.9rem 1rem",
                    }}
                  >
                    <p
                      style={{
                        color: "#9a3412",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        margin: "0 0 0.35rem 0",
                      }}
                    >
                      En attente
                    </p>
                    <p
                      style={{
                        color: "#d97706",
                        fontSize: "1.375rem",
                        fontWeight: 700,
                        margin: 0,
                      }}
                    >
                      {stripeBalance.pending.toFixed(2)} €
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : stripeStatus === "pending" ? (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <Badge variant="warning">En cours de vérification</Badge>
              </div>
              <p className="mb-5 max-w-lg text-sm text-gray-500">
                Stripe a bien reçu votre demande mais des informations sont encore nécessaires pour activer les reversements. Complétez votre dossier pour finaliser.
              </p>
              <Button
                variant="primary"
                loading={stripeLoading}
                onClick={handleStripeConnect}
              >
                Compléter mon dossier
              </Button>
            </div>
          ) : (
            <div>
              <p className="mb-5 max-w-lg text-sm text-gray-500">
                Connectez votre compte bancaire pour recevoir vos reversements automatiquement après chaque vente.
              </p>
              <Button
                variant="primary"
                loading={stripeLoading}
                onClick={handleStripeConnect}
              >
                Connecter mon compte bancaire
              </Button>
            </div>
          )}
        </Card>
      </section>

      {/* ── Badge "Vendeur vérifié Quicklot" (facultatif) ── */}
      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">
          Badge Vendeur vérifié Quicklot{" "}
          <span className="text-sm font-normal text-gray-500">(facultatif)</span>
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Faites vérifier votre activité par notre équipe pour rassurer les
          acheteurs et afficher un badge sur votre profil.
        </p>
        <Card padding="lg">
          {kycStatus === "verified" ? (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <Badge variant="success">✓ Profil vérifié</Badge>
                <p className="m-0 text-sm text-gray-500">
                  Votre entreprise a été vérifiée par l&apos;équipe Quicklot.
                </p>
              </div>
              {sellerInfo.bio && (
                <div className="mb-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Description</p>
                  <p className="m-0 max-w-lg whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{sellerInfo.bio}</p>
                </div>
              )}
              {sellerInfo.ville && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Ville</p>
                  <p className="m-0 text-sm text-gray-700">{sellerInfo.ville}</p>
                </div>
              )}
            </div>
          ) : kycStatus === "pending" ? (
            <div>
              <p className="mb-1 text-sm font-semibold text-amber-600">
                ⏳ Demande en cours de traitement
              </p>
              <p className="m-0 text-sm text-gray-500">
                Notre équipe examine votre demande. Vous serez notifié sous 48h.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-5 text-sm text-gray-500">
                Joignez un justificatif d&apos;activité et une pièce d&apos;identité
                pour obtenir le badge{" "}
                <Badge variant="warning" size="sm" className="bg-[#FF7D07] text-white">✓ Vendeur vérifié</Badge>
                {" "}sur votre profil. Vos informations vendeur (renseignées ci-dessus)
                sont reprises automatiquement.
              </p>

              {kycStatus === "rejected" && kycNoteAdmin && (
                <div className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">
                  <p className="mb-1 font-semibold">Demande refusée</p>
                  <p className="m-0">{kycNoteAdmin}</p>
                </div>
              )}

              <div className="mb-5">
                <p className="mb-1.5 text-sm font-medium text-gray-600">
                  Document justificatif (Kbis, extrait RC, K-bis…)
                </p>
                <label
                  htmlFor="kyc-doc"
                  className="inline-block cursor-pointer rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700"
                >
                  {kycFile ? kycFile.name : "Choisir un fichier"}
                </label>
                <input
                  id="kyc-doc"
                  type="file"
                  accept=".pdf,image/jpeg,image/png"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f) {
                      const typeOk = f.type.startsWith("image/") || f.type === "application/pdf";
                      if (!typeOk) {
                        setKycMessage({ text: "Format invalide — acceptés : image ou PDF.", error: true });
                        e.target.value = "";
                        return;
                      }
                      if (f.size > 10 * 1024 * 1024) {
                        setKycMessage({ text: "Fichier trop lourd — 10 Mo max.", error: true });
                        e.target.value = "";
                        return;
                      }
                      setKycMessage(null);
                    }
                    setKycFile(f);
                  }}
                  className="hidden"
                />
                <p className="mt-1.5 text-xs text-gray-400">PDF, JPEG ou PNG — 10 Mo max.</p>
              </div>

              <div className="mb-6">
                <p className="mb-1.5 text-sm font-medium text-gray-600">
                  Pièce d&apos;identité (CNI, passeport…)
                </p>
                <label
                  htmlFor="kyc-id"
                  className="inline-block cursor-pointer rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700"
                >
                  {kycIdFile ? kycIdFile.name : "Choisir un fichier"}
                </label>
                <input
                  id="kyc-id"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f) {
                      if (!["image/jpeg", "image/png"].includes(f.type)) {
                        setKycMessage({ text: "La pièce d'identité doit être au format JPEG ou PNG.", error: true });
                        e.target.value = "";
                        return;
                      }
                      if (f.size > 5 * 1024 * 1024) {
                        setKycMessage({ text: "La pièce d'identité ne doit pas dépasser 5 Mo.", error: true });
                        e.target.value = "";
                        return;
                      }
                      setKycMessage(null);
                    }
                    setKycIdFile(f);
                  }}
                  className="hidden"
                />
                <p className="mt-1.5 text-xs text-gray-400">JPEG ou PNG — 5 Mo max.</p>
              </div>

              {kycMessage && (
                <div
                  className={`mb-4 max-w-md rounded-lg border px-4 py-2.5 text-sm ${
                    kycMessage.error
                      ? "border-red-300 bg-red-50 text-red-600"
                      : "border-green-300 bg-green-50 text-green-700"
                  }`}
                >
                  {kycMessage.text}
                </div>
              )}

              <Button
                variant="primary"
                loading={kycSubmitting}
                onClick={handleKycSubmit}
              >
                {kycSubmitting ? "Envoi…" : "Envoyer ma demande"}
              </Button>
            </>
          )}
        </Card>
      </section>
    </PageContainer>
  );
}
