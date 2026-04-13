"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PageContainer, Button, Card, Badge, Input, Textarea } from "@/components/ui";

interface Profile {
  pseudo: string;
  bio: string;
  ville: string;
  avatar_url: string | null;
}

export default function ProfilEdit() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Profil
  const [profile, setProfile] = useState<Profile>({ pseudo: "", bio: "", ville: "", avatar_url: null });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; error: boolean } | null>(null);

  // KYC
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [kycNoteAdmin, setKycNoteAdmin] = useState<string | null>(null);
  const [kycForm, setKycForm] = useState({
    nom_entreprise: "",
    numero_entreprise: "",
    adresse: "",
    code_postal: "",
    ville_kyc: "",
    pays: "France",
  });
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
          .select("pseudo, bio, ville, avatar_url, kyc_status")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile({
            pseudo: (profileData as { pseudo?: string | null }).pseudo ?? "",
            bio: (profileData as { bio?: string | null }).bio ?? "",
            ville: (profileData as { ville?: string | null }).ville ?? "",
            avatar_url: (profileData as { avatar_url?: string | null }).avatar_url ?? null,
          });
          setKycStatus((profileData as { kyc_status?: string | null }).kyc_status ?? null);
        }

        const { data: kycReq } = await supabase
          .from("kyc_requests")
          .select("statut, note_admin, nom_entreprise, numero_entreprise, adresse, code_postal, ville_kyc, pays")
          .eq("user_id", user.id)
          .maybeSingle();
        if (kycReq) {
          const r = kycReq as {
            note_admin?: string | null;
            statut?: string;
            nom_entreprise?: string | null;
            numero_entreprise?: string | null;
            adresse?: string | null;
            code_postal?: string | null;
            ville_kyc?: string | null;
            pays?: string | null;
          };
          setKycNoteAdmin(r.note_admin ?? null);
          if (r.statut === "rejected") {
            setKycForm({
              nom_entreprise: r.nom_entreprise ?? "",
              numero_entreprise: r.numero_entreprise ?? "",
              adresse: r.adresse ?? "",
              code_postal: r.code_postal ?? "",
              ville_kyc: r.ville_kyc ?? "",
              pays: r.pays ?? "France",
            });
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

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
        bio: profile.bio.trim() || null,
        ville: profile.ville.trim() || null,
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

  async function handleKycSubmit() {
    if (!userId) return;
    if (!profile.bio.trim()) {
      setKycMessage({
        text: "Veuillez d'abord renseigner la description de votre activité dans votre profil avant de soumettre votre KYC.",
        error: true,
      });
      return;
    }
    if (!kycForm.nom_entreprise.trim() || !kycForm.numero_entreprise.trim()) {
      setKycMessage({ text: "Veuillez remplir le nom et le numéro d'entreprise.", error: true });
      return;
    }
    if (!kycForm.adresse.trim() || !kycForm.code_postal.trim() || !kycForm.ville_kyc.trim()) {
      setKycMessage({ text: "Veuillez remplir l'adresse, le code postal et la ville.", error: true });
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

    const { error: upsertError } = await supabase
      .from("kyc_requests")
      .upsert(
        {
          user_id: userId,
          nom_entreprise: kycForm.nom_entreprise.trim(),
          numero_entreprise: kycForm.numero_entreprise.trim(),
          adresse: kycForm.adresse.trim(),
          code_postal: kycForm.code_postal.trim(),
          ville_kyc: kycForm.ville_kyc.trim(),
          pays: kycForm.pays.trim() || "France",
          document_url: docPath,
          piece_identite_url: idPath,
          statut: "pending",
          note_admin: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      setKycMessage({ text: upsertError.message, error: true });
      setKycSubmitting(false);
      return;
    }

    await supabase.from("users").update({ kyc_status: "pending" }).eq("id", userId);

    setKycStatus("pending");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch("/api/kyc-notify-admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        });
      }
    } catch (err) {
      console.error("[kyc] admin notify error:", err);
    }

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

      {/* ── Profil ── */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Informations publiques</h2>
        <Card padding="lg">
          {/* Avatar */}
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

          <div className="mb-5 max-w-lg">
            <Textarea
              id="bio"
              label="Description de votre activité *"
              maxLength={300}
              rows={4}
              value={profile.bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Décrivez votre activité, vos types de produits, votre zone géographique…"
              helperText={`${300 - profile.bio.length} caractères restants`}
            />
          </div>

          <div className="mb-6 max-w-xs">
            <Input
              id="ville"
              label="Ville"
              type="text"
              value={profile.ville}
              onChange={(e) => setProfile((p) => ({ ...p, ville: e.target.value }))}
              placeholder="ex : Lyon, Marseille…"
            />
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

      {/* ── KYC ── */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Vérification du profil</h2>
        <Card padding="lg">
          {kycStatus === "verified" ? (
            <div className="flex items-center gap-3">
              <Badge variant="success">✓ Profil vérifié</Badge>
              <p className="m-0 text-sm text-gray-500">
                Votre entreprise a été vérifiée par l&apos;équipe Quicklot.
              </p>
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
                Faites vérifier votre entreprise pour obtenir le badge{" "}
                <Badge variant="warning" size="sm" className="bg-[#FF7D07] text-white">✓ Vendeur vérifié</Badge>
                {" "}sur votre profil et rassurer les acheteurs.
              </p>

              {kycStatus === "rejected" && kycNoteAdmin && (
                <div className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">
                  <p className="mb-1 font-semibold">Demande refusée</p>
                  <p className="m-0">{kycNoteAdmin}</p>
                </div>
              )}

              <div className="mb-5 max-w-md">
                <Input
                  id="nom_entreprise"
                  label="Nom de l'entreprise"
                  type="text"
                  value={kycForm.nom_entreprise}
                  onChange={(e) => setKycForm((f) => ({ ...f, nom_entreprise: e.target.value }))}
                  placeholder="Ma Société SARL"
                />
              </div>
              <div className="mb-5 max-w-md">
                <Input
                  id="numero_entreprise"
                  label="Numéro d'entreprise (SIRET / TVA / RCS)"
                  type="text"
                  value={kycForm.numero_entreprise}
                  onChange={(e) => setKycForm((f) => ({ ...f, numero_entreprise: e.target.value }))}
                  placeholder="123 456 789 00012"
                />
              </div>
              <div className="mb-5 max-w-md">
                <Input
                  id="kyc_adresse"
                  label="Adresse"
                  type="text"
                  value={kycForm.adresse}
                  onChange={(e) => setKycForm((f) => ({ ...f, adresse: e.target.value }))}
                  placeholder="12 rue de la République"
                />
              </div>
              <div className="mb-5 flex max-w-md flex-wrap gap-3">
                <div className="w-32">
                  <Input
                    id="kyc_code_postal"
                    label="Code postal"
                    type="text"
                    maxLength={10}
                    value={kycForm.code_postal}
                    onChange={(e) => setKycForm((f) => ({ ...f, code_postal: e.target.value }))}
                    placeholder="69000"
                  />
                </div>
                <div className="min-w-[180px] flex-1">
                  <Input
                    id="kyc_ville"
                    label="Ville"
                    type="text"
                    value={kycForm.ville_kyc}
                    onChange={(e) => setKycForm((f) => ({ ...f, ville_kyc: e.target.value }))}
                    placeholder="Lyon"
                  />
                </div>
              </div>
              <div className="mb-6 max-w-md">
                <Input
                  id="kyc_pays"
                  label="Pays"
                  type="text"
                  value={kycForm.pays}
                  onChange={(e) => setKycForm((f) => ({ ...f, pays: e.target.value }))}
                  placeholder="France"
                />
              </div>

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
