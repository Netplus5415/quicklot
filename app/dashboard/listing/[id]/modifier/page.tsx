"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/categories";

interface ListingData {
  titre: string;
  description: string;
  type: string;
  categorie: string;
  prix: string;
  enlevement_sur_place: boolean;
  livraison_france: boolean;
  prix_livraison_france: string;
  livraison_belgique: boolean;
  prix_livraison_belgique: string;
  preparation_amazon: boolean;
  preparation_amazon_type: "" | "gratuite" | "payante";
  prix_preparation_amazon: string;
}

interface ExistingPhoto {
  id: string;
  photo_url: string;
  ordre: number;
}

const MAX_PHOTOS = 5;

export default function ModifierListing() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<ListingData>({
    titre: "",
    description: "",
    type: "Lot de produits",
    categorie: "",
    prix: "",
    enlevement_sur_place: false,
    livraison_france: false,
    prix_livraison_france: "",
    livraison_belgique: false,
    prix_livraison_belgique: "",
    preparation_amazon: false,
    preparation_amazon_type: "",
    prix_preparation_amazon: "",
  });
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const newPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) { router.replace("/connexion"); return; }
        setUserId(user.id);

        const [{ data: listing, error: listingError }, { data: photos }] = await Promise.all([
          supabase
            .from("listings")
            .select(
              "titre, description, type, categorie, prix, seller_id, enlevement_sur_place, livraison_france, prix_livraison_france, livraison_belgique, prix_livraison_belgique, preparation_amazon, preparation_amazon_type, prix_preparation_amazon"
            )
            .eq("id", id)
            .single(),
          supabase
            .from("listing_photos")
            .select("id, photo_url, ordre")
            .eq("listing_id", id)
            .order("ordre", { ascending: true }),
        ]);

        if (listingError || !listing) { router.replace("/dashboard"); return; }
        if (listing.seller_id !== user.id) { router.replace("/dashboard"); return; }

        setForm({
          titre: listing.titre ?? "",
          description: listing.description ?? "",
          type: listing.type ?? "Lot de produits",
          categorie: listing.categorie ?? "",
          prix: String(listing.prix ?? ""),
          enlevement_sur_place: !!listing.enlevement_sur_place,
          livraison_france: !!listing.livraison_france,
          prix_livraison_france: listing.prix_livraison_france != null ? String(listing.prix_livraison_france) : "",
          livraison_belgique: !!listing.livraison_belgique,
          prix_livraison_belgique: listing.prix_livraison_belgique != null ? String(listing.prix_livraison_belgique) : "",
          preparation_amazon: !!listing.preparation_amazon,
          preparation_amazon_type: (listing.preparation_amazon_type as "" | "gratuite" | "payante") ?? "",
          prix_preparation_amazon: listing.prix_preparation_amazon != null ? String(listing.prix_preparation_amazon) : "",
        });

        setExistingPhotos((photos as ExistingPhoto[]) ?? []);
      } finally {
        setAuthLoading(false);
      }
    }
    if (id) load();
  }, [id, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const target = e.target as HTMLInputElement;
    if (target.type === "checkbox") {
      setForm({ ...form, [target.name]: target.checked });
    } else {
      setForm({ ...form, [target.name]: target.value });
    }
  }

  function handleNewPhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_PHOTOS - existingPhotos.length - newPhotos.length;
    const accepted = files.slice(0, Math.max(0, remaining));
    setNewPhotos((prev) => [...prev, ...accepted]);
    setNewPreviews((prev) => [...prev, ...accepted.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  }

  function handleRemoveExistingPhoto(photo: ExistingPhoto) {
    setConfirmModal({
      open: true,
      title: "Supprimer cette photo ?",
      message: "Cette action est irréversible.",
      onConfirm: () => {
        setConfirmModal(null);
        void doRemoveExistingPhoto(photo);
      },
    });
  }

  async function doRemoveExistingPhoto(photo: ExistingPhoto) {
    const { error } = await supabase.from("listing_photos").delete().eq("id", photo.id);
    if (error) {
      setMessage({ text: `Erreur suppression photo : ${error.message}`, error: true });
      return;
    }
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }

  function handleRemoveNewPhoto(index: number) {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setMessage(null);
    setSaving(true);

    // Validations livraison (au moins un mode)
    if (
      !form.enlevement_sur_place &&
      !form.livraison_france &&
      !form.livraison_belgique &&
      !form.preparation_amazon
    ) {
      setMessage({ text: "Sélectionnez au moins une option de livraison.", error: true });
      setSaving(false);
      return;
    }
    if (form.livraison_france && !form.prix_livraison_france.trim()) {
      setMessage({ text: "Indiquez le prix de livraison France.", error: true });
      setSaving(false);
      return;
    }
    if (form.livraison_belgique && !form.prix_livraison_belgique.trim()) {
      setMessage({ text: "Indiquez le prix de livraison Belgique.", error: true });
      setSaving(false);
      return;
    }
    if (form.preparation_amazon && !form.preparation_amazon_type) {
      setMessage({ text: "Précisez si la préparation Amazon est gratuite ou payante.", error: true });
      setSaving(false);
      return;
    }
    if (
      form.preparation_amazon &&
      form.preparation_amazon_type === "payante" &&
      !form.prix_preparation_amazon.trim()
    ) {
      setMessage({ text: "Indiquez le prix de la préparation Amazon.", error: true });
      setSaving(false);
      return;
    }

    // Upload nouvelles photos
    const uploadedUrls: string[] = [];
    if (newPhotos.length > 0) {
      const timestamp = Date.now();
      for (let i = 0; i < newPhotos.length; i++) {
        const file = newPhotos[i];
        const filePath = `${userId}/${timestamp}_${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("listings-photos")
          .upload(filePath, file, { contentType: file.type, upsert: false });
        if (uploadError) {
          setMessage({ text: `Erreur upload photo ${i + 1} : ${uploadError.message}`, error: true });
          setSaving(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("listings-photos").getPublicUrl(filePath);
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    // Insérer les nouvelles photos dans listing_photos
    if (uploadedUrls.length > 0) {
      const startOrdre = existingPhotos.length;
      const rows = uploadedUrls.map((url, i) => ({
        listing_id: id,
        photo_url: url,
        ordre: startOrdre + i,
      }));
      const { error: photosError } = await supabase.from("listing_photos").insert(rows);
      if (photosError) {
        setMessage({ text: `Erreur insert photos : ${photosError.message}`, error: true });
        setSaving(false);
        return;
      }
    }

    // Déterminer la nouvelle photo_url principale
    const allPhotos = [...existingPhotos.map((p) => p.photo_url), ...uploadedUrls];
    const mainPhotoUrl = allPhotos[0] ?? null;

    // Update listing
    const { error } = await supabase
      .from("listings")
      .update({
        titre: form.titre,
        description: form.description,
        type: form.type,
        categorie: form.categorie,
        prix: parseFloat(form.prix),
        photo_url: mainPhotoUrl,
        enlevement_sur_place: form.enlevement_sur_place,
        livraison_france: form.livraison_france,
        prix_livraison_france: form.livraison_france ? parseFloat(form.prix_livraison_france) : null,
        livraison_belgique: form.livraison_belgique,
        prix_livraison_belgique: form.livraison_belgique ? parseFloat(form.prix_livraison_belgique) : null,
        preparation_amazon: form.preparation_amazon,
        preparation_amazon_type: form.preparation_amazon ? form.preparation_amazon_type : null,
        prix_preparation_amazon:
          form.preparation_amazon && form.preparation_amazon_type === "payante"
            ? parseFloat(form.prix_preparation_amazon)
            : null,
      })
      .eq("id", id);

    if (error) {
      setMessage({ text: error.message, error: true });
      setSaving(false);
      return;
    }

    // Reset nouveaux uploads + refresh existing photos
    setNewPhotos([]);
    setNewPreviews([]);
    const { data: refreshedPhotos } = await supabase
      .from("listing_photos")
      .select("id, photo_url, ordre")
      .eq("listing_id", id)
      .order("ordre", { ascending: true });
    setExistingPhotos((refreshedPhotos as ExistingPhoto[]) ?? []);

    setMessage({ text: "Listing mis à jour avec succès !", error: false });
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.75rem 1rem", backgroundColor: "#ffffff",
    border: "1px solid #d1d5db", borderRadius: "8px", color: "#111827",
    fontSize: "1rem", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.4rem",
  };
  const fieldStyle: React.CSSProperties = { marginBottom: "1.25rem" };

  if (authLoading) {
    return (
      <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <p style={{ color: "#6b7280" }}>Chargement…</p>
      </div>
    );
  }

  const totalPhotos = existingPhotos.length + newPhotos.length;

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", padding: "2rem", fontFamily: "sans-serif" }}>
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
      <div style={{ width: "100%", maxWidth: "540px", margin: "0 auto" }}>
        <Link href="/dashboard" style={{ color: "#6b7280", fontSize: "0.875rem", textDecoration: "none", display: "inline-block", marginBottom: "1.5rem" }}>
          ← Retour au dashboard
        </Link>

        <h1 style={{ color: "#111827", fontSize: "1.75rem", fontWeight: "bold", margin: "0 0 0.5rem 0" }}>
          Modifier le listing
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: "0 0 2rem 0" }}>
          Mettez à jour les informations de votre listing.
        </p>

        {message && (
          <div style={{
            padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1.25rem", fontSize: "0.9rem",
            backgroundColor: message.error ? "#fef2f2" : "#f0fdf4",
            color: message.error ? "#dc2626" : "#16a34a",
            border: `1px solid ${message.error ? "#fca5a5" : "#86efac"}`,
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label htmlFor="titre" style={labelStyle}>Titre</label>
            <input id="titre" name="titre" type="text" value={form.titre} onChange={handleChange} required style={inputStyle} />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="description" style={labelStyle}>Description</label>
            <textarea id="description" name="description" value={form.description} onChange={handleChange} required rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="type" style={labelStyle}>Type</label>
            <select id="type" name="type" value={form.type} onChange={handleChange} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="Lot de produits">Lot de produits</option>
              <option value="Produit unique">Produit unique</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label htmlFor="categorie" style={labelStyle}>Catégorie</label>
            <select id="categorie" name="categorie" value={form.categorie} onChange={handleChange} required style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">— Choisir une catégorie —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label htmlFor="prix" style={labelStyle}>Prix (€)</label>
            <input id="prix" name="prix" type="number" min="0" step="0.01" value={form.prix} onChange={handleChange} required style={inputStyle} />
          </div>

          {/* ── Photos ── */}
          <div style={fieldStyle}>
            <span style={labelStyle}>Photos ({totalPhotos}/{MAX_PHOTOS})</span>

            {/* Photos existantes */}
            {existingPhotos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
                {existingPhotos.map((photo, i) => (
                  <div key={photo.id} style={{ position: "relative" }}>
                    <img
                      src={photo.photo_url}
                      alt={`Photo ${i + 1}`}
                      style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "6px", border: i === 0 ? "2px solid #FF7D07" : "1px solid #d1d5db", display: "block" }}
                    />
                    {i === 0 && (
                      <span style={{ position: "absolute", bottom: "4px", left: "4px", backgroundColor: "#FF7D07", color: "#fff", fontSize: "0.6rem", padding: "1px 5px", borderRadius: "4px" }}>
                        principale
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingPhoto(photo)}
                      aria-label="Supprimer"
                      style={{ position: "absolute", top: "4px", right: "4px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "0.7rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Nouveaux uploads (non sauvegardés) */}
            {newPreviews.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
                {newPreviews.map((src, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img
                      src={src}
                      alt={`Nouveau ${i + 1}`}
                      style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "6px", border: "1px dashed #FF7D07", display: "block", opacity: 0.9 }}
                    />
                    <span style={{ position: "absolute", bottom: "4px", left: "4px", backgroundColor: "#111827", color: "#fff", fontSize: "0.55rem", padding: "1px 4px", borderRadius: "4px" }}>
                      nouveau
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewPhoto(i)}
                      aria-label="Supprimer"
                      style={{ position: "absolute", top: "4px", right: "4px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "0.7rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={newPhotoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleNewPhotosChange}
              style={{ display: "none" }}
            />
            {totalPhotos < MAX_PHOTOS && (
              <div>
                <button
                  type="button"
                  onClick={() => newPhotoInputRef.current?.click()}
                  style={{
                    display: "inline-block",
                    padding: "0.6rem 1.1rem",
                    backgroundColor: "#ffffff",
                    color: "#FF7D07",
                    border: "1px dashed #FF7D07",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + {totalPhotos === 0 ? "Ajouter des photos" : "Ajouter une photo"}
                </button>
                <p style={{ margin: "0.4rem 0 0 0", color: "#6b7280", fontSize: "0.75rem" }}>
                  {totalPhotos}/{MAX_PHOTOS} photos
                </p>
              </div>
            )}
            <p style={{ color: "#9ca3af", fontSize: "0.75rem", margin: "0.35rem 0 0 0" }}>
              La première photo est la photo principale. Les nouvelles photos sont ajoutées à la fin.
            </p>
          </div>

          {/* ── Options de livraison ── */}
          <div style={fieldStyle}>
            <span style={labelStyle}>Options de livraison</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.65rem 1rem", border: form.enlevement_sur_place ? "2px solid #FF7D07" : "1px solid #d1d5db", borderRadius: "8px", backgroundColor: form.enlevement_sur_place ? "#fff7ed" : "#ffffff", cursor: "pointer", userSelect: "none" }}>
                <input type="checkbox" name="enlevement_sur_place" checked={form.enlevement_sur_place} onChange={handleChange} style={{ accentColor: "#FF7D07", width: "16px", height: "16px" }} />
                <span style={{ fontSize: "0.9rem", color: form.enlevement_sur_place ? "#FF7D07" : "#374151", fontWeight: form.enlevement_sur_place ? "600" : "400" }}>
                  Enlèvement sur place
                </span>
              </label>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.65rem 1rem", border: form.livraison_france ? "2px solid #FF7D07" : "1px solid #d1d5db", borderRadius: "8px", backgroundColor: form.livraison_france ? "#fff7ed" : "#ffffff", cursor: "pointer", userSelect: "none" }}>
                  <input type="checkbox" name="livraison_france" checked={form.livraison_france} onChange={handleChange} style={{ accentColor: "#FF7D07", width: "16px", height: "16px" }} />
                  <span style={{ fontSize: "0.9rem", color: form.livraison_france ? "#FF7D07" : "#374151", fontWeight: form.livraison_france ? "600" : "400" }}>
                    Livraison France
                  </span>
                </label>
                {form.livraison_france && (
                  <input
                    type="number" min="0" step="0.01" name="prix_livraison_france" placeholder="Prix livraison France (€)"
                    value={form.prix_livraison_france} onChange={handleChange}
                    style={{ ...inputStyle, marginTop: "0.5rem" }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.65rem 1rem", border: form.livraison_belgique ? "2px solid #FF7D07" : "1px solid #d1d5db", borderRadius: "8px", backgroundColor: form.livraison_belgique ? "#fff7ed" : "#ffffff", cursor: "pointer", userSelect: "none" }}>
                  <input type="checkbox" name="livraison_belgique" checked={form.livraison_belgique} onChange={handleChange} style={{ accentColor: "#FF7D07", width: "16px", height: "16px" }} />
                  <span style={{ fontSize: "0.9rem", color: form.livraison_belgique ? "#FF7D07" : "#374151", fontWeight: form.livraison_belgique ? "600" : "400" }}>
                    Livraison Belgique
                  </span>
                </label>
                {form.livraison_belgique && (
                  <input
                    type="number" min="0" step="0.01" name="prix_livraison_belgique" placeholder="Prix livraison Belgique (€)"
                    value={form.prix_livraison_belgique} onChange={handleChange}
                    style={{ ...inputStyle, marginTop: "0.5rem" }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ── Préparation Amazon ── */}
          <div style={fieldStyle}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.65rem 1rem", border: form.preparation_amazon ? "2px solid #FF7D07" : "1px solid #d1d5db", borderRadius: "8px", backgroundColor: form.preparation_amazon ? "#fff7ed" : "#ffffff", cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                name="preparation_amazon"
                checked={form.preparation_amazon}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  preparation_amazon: e.target.checked,
                  preparation_amazon_type: e.target.checked ? f.preparation_amazon_type : "",
                  prix_preparation_amazon: e.target.checked ? f.prix_preparation_amazon : "",
                }))}
                style={{ accentColor: "#FF7D07", width: "16px", height: "16px" }}
              />
              <span style={{ fontSize: "0.9rem", color: form.preparation_amazon ? "#FF7D07" : "#374151", fontWeight: form.preparation_amazon ? "600" : "400" }}>
                Préparation Amazon (FBA)
              </span>
            </label>

            {form.preparation_amazon && (
              <div style={{ marginTop: "0.75rem", paddingLeft: "0.5rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  {[
                    { value: "gratuite" as const, label: "Préparation gratuite" },
                    { value: "payante" as const, label: "Préparation payante" },
                  ].map(({ value, label }) => {
                    const selected = form.preparation_amazon_type === value;
                    return (
                      <label key={value} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.9rem", border: selected ? "2px solid #FF7D07" : "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer", backgroundColor: selected ? "#fff7ed" : "#ffffff", color: selected ? "#FF7D07" : "#374151", fontWeight: selected ? "600" : "400", fontSize: "0.875rem", userSelect: "none" }}>
                        <input
                          type="radio"
                          name="preparation_amazon_type"
                          value={value}
                          checked={selected}
                          onChange={() => setForm((f) => ({ ...f, preparation_amazon_type: value }))}
                          style={{ accentColor: "#FF7D07", width: "15px", height: "15px" }}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>

                {form.preparation_amazon_type === "payante" && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="prix_preparation_amazon"
                    placeholder="Prix préparation Amazon (€)"
                    value={form.prix_preparation_amazon}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%", padding: "0.9rem", backgroundColor: "#FF7D07",
              color: "#fff", border: "none", borderRadius: "8px", fontSize: "1rem",
              fontWeight: "600", cursor: saving ? "not-allowed" : "pointer",
              marginTop: "0.5rem", opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </form>
      </div>
    </div>
  );
}
