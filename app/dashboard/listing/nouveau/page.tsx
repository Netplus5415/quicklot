"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/categories";

export default function NouveauListing() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [form, setForm] = useState({
    titre: "",
    description: "",
    type: "Lot de produits",
    categorie: "",
    prix: "",
    ean_codes: "",
    etat: "neuf",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<string | null>(null);

  // Options de livraison
  const [shipping, setShipping] = useState({
    enlevement_sur_place: false,
    livraison_france: false,
    prix_livraison_france: "",
    livraison_belgique: false,
    prix_livraison_belgique: "",
    preparation_amazon: false,
    preparation_amazon_type: "" as "" | "gratuite" | "payante",
    prix_preparation_amazon: "",
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.replace("/connexion");
          return;
        }
        setUserId(user.id);

        // Vérification KYC : on ne peut publier que si kyc_status = 'verified'
        const { data: profile } = await supabase
          .from("users")
          .select("kyc_status, stripe_account_status")
          .eq("id", user.id)
          .maybeSingle();
        setKycStatus((profile as { kyc_status?: string | null } | null)?.kyc_status ?? null);
        setStripeStatus(
          (profile as { stripe_account_status?: string | null } | null)?.stripe_account_status ?? null
        );
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const isKycVerified = kycStatus === "verified";
  const isStripeActive = stripeStatus === "active";

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handlePhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    setPhotos((prev) => [...prev, ...newFiles].slice(0, 5));
    setPreviews((prev) => {
      const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
      return [...prev, ...newPreviews].slice(0, 5);
    });
    e.target.value = "";
  }

  function removePhoto(index: number) {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPreviews(newPreviews);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isKycVerified) {
      setMessage({ text: "Votre compte doit être vérifié avant de publier un listing.", error: true });
      return;
    }
    setMessage(null);
    setLoading(true);

    // 1. Insérer le listing et récupérer son id
    const timestamp = Date.now();
    let firstPhotoUrl: string | null = null;

    // Upload toutes les photos d'abord
    const uploadedUrls: string[] = [];
    if (photos.length > 0 && userId) {
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const filePath = `${userId}/${timestamp}_${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("listings-photos")
          .upload(filePath, file, { contentType: file.type, upsert: false });

        if (uploadError) {
          setMessage({ text: `Erreur upload photo ${i + 1} : ${uploadError.message}`, error: true });
          setLoading(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("listings-photos")
          .getPublicUrl(filePath);

        uploadedUrls.push(urlData.publicUrl);
      }
      firstPhotoUrl = uploadedUrls[0];
    }

    // Validations livraison
    if (!shipping.enlevement_sur_place && !shipping.livraison_france && !shipping.livraison_belgique && !shipping.preparation_amazon) {
      setMessage({ text: "Sélectionnez au moins une option de livraison.", error: true });
      setLoading(false);
      return;
    }
    if (shipping.livraison_france && !shipping.prix_livraison_france.trim()) {
      setMessage({ text: "Indiquez le prix de livraison France.", error: true });
      setLoading(false);
      return;
    }
    if (shipping.livraison_belgique && !shipping.prix_livraison_belgique.trim()) {
      setMessage({ text: "Indiquez le prix de livraison Belgique.", error: true });
      setLoading(false);
      return;
    }
    if (shipping.preparation_amazon && !shipping.preparation_amazon_type) {
      setMessage({ text: "Précisez si la préparation Amazon est gratuite ou payante.", error: true });
      setLoading(false);
      return;
    }
    if (
      shipping.preparation_amazon &&
      shipping.preparation_amazon_type === "payante" &&
      !shipping.prix_preparation_amazon.trim()
    ) {
      setMessage({ text: "Indiquez le prix de la préparation Amazon.", error: true });
      setLoading(false);
      return;
    }

    // 2. Insérer le listing avec la première photo comme photo principale
    const { data: listingData, error: listingError } = await supabase
      .from("listings")
      .insert({
        seller_id: userId,
        titre: form.titre,
        description: form.description,
        type: form.type,
        prix: parseFloat(form.prix),
        categorie: form.categorie,
        status: "pending_review",
        photo_url: firstPhotoUrl,
        ean_codes: form.ean_codes.trim() || null,
        etat: form.etat,
        enlevement_sur_place: shipping.enlevement_sur_place,
        livraison_france: shipping.livraison_france,
        prix_livraison_france: shipping.livraison_france
          ? parseFloat(shipping.prix_livraison_france)
          : null,
        livraison_belgique: shipping.livraison_belgique,
        prix_livraison_belgique: shipping.livraison_belgique
          ? parseFloat(shipping.prix_livraison_belgique)
          : null,
        preparation_amazon: shipping.preparation_amazon,
        preparation_amazon_type: shipping.preparation_amazon
          ? shipping.preparation_amazon_type
          : null,
        prix_preparation_amazon:
          shipping.preparation_amazon && shipping.preparation_amazon_type === "payante"
            ? parseFloat(shipping.prix_preparation_amazon)
            : null,
      })
      .select("id")
      .single();

    if (listingError || !listingData) {
      setMessage({ text: listingError?.message ?? "Erreur lors de la création du listing.", error: true });
      setLoading(false);
      return;
    }

    // 3. Insérer une ligne par photo dans listing_photos
    if (uploadedUrls.length > 0) {
      const listingPhotos = uploadedUrls.map((url, i) => ({
        listing_id: listingData.id,
        photo_url: url,
        ordre: i,
      }));

      const { error: photosError } = await supabase
        .from("listing_photos")
        .insert(listingPhotos);

      if (photosError) {
        setMessage({ text: photosError.message, error: true });
        setLoading(false);
        return;
      }
    }

    // Notifier l'admin (best-effort, on continue si l'email échoue)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch("/api/listing-notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "new", listingId: listingData.id }),
        });
      }
    } catch (err) {
      console.error("[nouveau listing] admin notify error:", err);
    }

    setMessage({
      text: "Listing soumis ! Il sera visible après validation par notre équipe (sous 24h).",
      error: false,
    });
    setForm({ titre: "", description: "", type: "Lot de produits", categorie: "", prix: "", ean_codes: "", etat: "neuf" });
    setPhotos([]);
    setPreviews([]);
    setShipping({
      enlevement_sur_place: false,
      livraison_france: false,
      prix_livraison_france: "",
      livraison_belgique: false,
      prix_livraison_belgique: "",
      preparation_amazon: false,
      preparation_amazon_type: "",
      prix_preparation_amazon: "",
    });
    setLoading(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem 1rem",
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    color: "#111827",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#6b7280",
    fontSize: "0.875rem",
    marginBottom: "0.4rem",
  };

  const fieldStyle: React.CSSProperties = {
    marginBottom: "1.25rem",
  };

  if (authLoading) {
    return (
      <div
        style={{
          backgroundColor: "#ffffff",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <p style={{ color: "#6b7280" }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: "540px" }}>
        <Link
          href="/dashboard"
          style={{
            color: "#6b7280",
            fontSize: "0.875rem",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: "1.5rem",
          }}
        >
          ← Retour au dashboard
        </Link>

        <h1
          style={{
            color: "#111827",
            fontSize: "1.75rem",
            fontWeight: "bold",
            margin: "0 0 0.5rem 0",
          }}
        >
          Nouveau listing
        </h1>
        <p
          style={{
            color: "#6b7280",
            fontSize: "0.95rem",
            margin: "0 0 2rem 0",
          }}
        >
          Publiez un lot ou un produit sur Quicklot.
        </p>

        {!isStripeActive && (
          <div
            style={{
              backgroundColor: "#fff7ed",
              border: "1px solid #FF7D07",
              borderRadius: "12px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <p style={{ color: "#111827", fontSize: "1rem", fontWeight: "700", margin: "0 0 0.4rem 0" }}>
              💳 Compte de paiement non activé
            </p>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0 0 1rem 0", lineHeight: "1.5" }}>
              Vous devez activer votre compte Stripe Connect avant de pouvoir vendre sur Quicklot.
            </p>
            <Link
              href="/dashboard/profil"
              style={{
                display: "inline-block",
                backgroundColor: "#FF7D07",
                color: "#ffffff",
                textDecoration: "none",
                padding: "0.55rem 1.25rem",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "600",
              }}
            >
              Activer mon compte →
            </Link>
          </div>
        )}

        {!isKycVerified && (
          <div
            style={{
              backgroundColor: "#fff7ed",
              border: "1px solid #FF7D07",
              borderRadius: "12px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <p style={{ color: "#111827", fontSize: "1rem", fontWeight: "700", margin: "0 0 0.4rem 0" }}>
              🔒 Compte non vérifié
            </p>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0 0 1rem 0", lineHeight: "1.5" }}>
              {kycStatus === "pending"
                ? "Votre demande de vérification KYC est en cours de traitement. Vous pourrez publier des listings dès que votre compte sera vérifié."
                : kycStatus === "rejected"
                ? "Votre demande de vérification a été refusée. Vous pouvez soumettre une nouvelle demande depuis votre dashboard."
                : "Votre KYC est en attente de validation. Vous pourrez publier des listings dès que votre compte sera vérifié."}
            </p>
            <Link
              href="/dashboard"
              style={{
                display: "inline-block",
                backgroundColor: "#FF7D07",
                color: "#ffffff",
                textDecoration: "none",
                padding: "0.55rem 1.25rem",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "600",
              }}
            >
              Vérifier mon compte →
            </Link>
          </div>
        )}

        {message && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              marginBottom: "1.25rem",
              fontSize: "0.9rem",
              backgroundColor: message.error ? "#fef2f2" : "#f0fdf4",
              color: message.error ? "#dc2626" : "#16a34a",
              border: `1px solid ${message.error ? "#fca5a5" : "#86efac"}`,
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <fieldset disabled={!isKycVerified} style={{ border: "none", padding: 0, margin: 0, opacity: isKycVerified ? 1 : 0.5 }}>
          <div style={fieldStyle}>
            <label htmlFor="titre" style={labelStyle}>
              Titre
            </label>
            <input
              id="titre"
              name="titre"
              type="text"
              placeholder="Ex : Lot de 50 t-shirts taille M"
              value={form.titre}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="description" style={labelStyle}>
              Description
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="Décrivez votre lot en détail…"
              value={form.description}
              onChange={handleChange}
              required
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="type" style={labelStyle}>
              Type
            </label>
            <select
              id="type"
              name="type"
              value={form.type}
              onChange={handleChange}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="Lot de produits">Lot de produits</option>
              <option value="Produit unique">Produit unique</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label htmlFor="categorie" style={labelStyle}>
              Catégorie
            </label>
            <select
              id="categorie"
              name="categorie"
              value={form.categorie}
              onChange={handleChange}
              required
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">— Choisir une catégorie —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Photos (max 5) — la première sera la photo principale
            </label>
            <input
              ref={photoInputRef}
              id="photos"
              name="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotosChange}
              style={{ display: "none" }}
            />
            {photos.length < 5 && (
              <div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
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
                  + {photos.length === 0 ? "Ajouter des photos" : "Ajouter une photo"}
                </button>
                <p style={{ margin: "0.4rem 0 0 0", color: "#6b7280", fontSize: "0.75rem" }}>
                  {photos.length}/5 photos
                </p>
              </div>
            )}
            {previews.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                  gap: "0.5rem",
                  marginTop: "0.75rem",
                }}
              >
                {previews.map((src, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img
                      src={src}
                      alt={`Photo ${i + 1}`}
                      style={{
                        width: "100%",
                        height: "90px",
                        objectFit: "cover",
                        borderRadius: "6px",
                        border: i === 0 ? "2px solid #FF7D07" : "1px solid #d1d5db",
                        display: "block",
                      }}
                    />
                    {i === 0 && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: "4px",
                          left: "4px",
                          backgroundColor: "#FF7D07",
                          color: "#fff",
                          fontSize: "0.6rem",
                          padding: "1px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        principale
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        backgroundColor: "#111827",
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        width: "18px",
                        height: "18px",
                        fontSize: "0.65rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={fieldStyle}>
            <label htmlFor="prix" style={labelStyle}>
              Prix (€)
            </label>
            <input
              id="prix"
              name="prix"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex : 19.90"
              value={form.prix}
              onChange={handleChange}
              required
              style={inputStyle}
            />
            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "4px" }}>
              Prix hors taxes (HT). La TVA sera calculée automatiquement.
            </p>
          </div>

          {/* Codes EAN */}
          <div style={fieldStyle}>
            <label htmlFor="ean_codes" style={labelStyle}>
              Codes EAN (optionnel — séparés par des virgules si plusieurs)
            </label>
            <input
              id="ean_codes"
              name="ean_codes"
              type="text"
              placeholder="Ex : 3760158300123, 4006381333931"
              value={form.ean_codes}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* État du produit */}
          <div style={fieldStyle}>
            <span style={labelStyle}>État du produit</span>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {([
                { value: "neuf",  label: "100% neuf" },
                { value: "abime", label: "Emballage abîmé" },
              ] as const).map(({ value, label }) => {
                const selected = form.etat === value;
                return (
                  <label
                    key={value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.65rem 1.1rem",
                      border: selected ? "2px solid #FF7D07" : "1px solid #d1d5db",
                      borderRadius: "8px",
                      cursor: "pointer",
                      backgroundColor: selected ? "#fff7ed" : "#ffffff",
                      color: selected ? "#FF7D07" : "#374151",
                      fontWeight: selected ? "600" : "400",
                      fontSize: "0.9rem",
                      userSelect: "none",
                      transition: "border-color 0.15s, background-color 0.15s",
                    }}
                  >
                    <input
                      type="radio"
                      name="etat"
                      value={value}
                      checked={selected}
                      onChange={handleChange}
                      required
                      style={{ accentColor: "#FF7D07", width: "15px", height: "15px" }}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            {form.etat === "abime" && (
              <p style={{ margin: "0.75rem 0 0 0", color: "#FF7D07", fontSize: "0.875rem", fontWeight: "500" }}>
                ⚠️ Des photos de l&apos;emballage abîmé sont requises — ajoutez-les ci-dessous
              </p>
            )}
          </div>

          {/* Options de livraison */}
          <div style={fieldStyle}>
            <span style={labelStyle}>Options de livraison</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* Enlèvement */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.65rem 1rem",
                  border: shipping.enlevement_sur_place ? "2px solid #FF7D07" : "1px solid #d1d5db",
                  borderRadius: "8px",
                  backgroundColor: shipping.enlevement_sur_place ? "#fff7ed" : "#ffffff",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={shipping.enlevement_sur_place}
                  onChange={(e) => setShipping((s) => ({ ...s, enlevement_sur_place: e.target.checked }))}
                  style={{ accentColor: "#FF7D07", width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "0.9rem", color: shipping.enlevement_sur_place ? "#FF7D07" : "#374151", fontWeight: shipping.enlevement_sur_place ? "600" : "400" }}>
                  Enlèvement sur place
                </span>
              </label>

              {/* Livraison France */}
              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.65rem 1rem",
                    border: shipping.livraison_france ? "2px solid #FF7D07" : "1px solid #d1d5db",
                    borderRadius: "8px",
                    backgroundColor: shipping.livraison_france ? "#fff7ed" : "#ffffff",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={shipping.livraison_france}
                    onChange={(e) => setShipping((s) => ({ ...s, livraison_france: e.target.checked }))}
                    style={{ accentColor: "#FF7D07", width: "16px", height: "16px" }}
                  />
                  <span style={{ fontSize: "0.9rem", color: shipping.livraison_france ? "#FF7D07" : "#374151", fontWeight: shipping.livraison_france ? "600" : "400" }}>
                    Livraison France
                  </span>
                </label>
                {shipping.livraison_france && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Prix livraison France (€)"
                    value={shipping.prix_livraison_france}
                    onChange={(e) => setShipping((s) => ({ ...s, prix_livraison_france: e.target.value }))}
                    style={{ ...inputStyle, marginTop: "0.5rem" }}
                  />
                )}
              </div>

              {/* Livraison Belgique */}
              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.65rem 1rem",
                    border: shipping.livraison_belgique ? "2px solid #FF7D07" : "1px solid #d1d5db",
                    borderRadius: "8px",
                    backgroundColor: shipping.livraison_belgique ? "#fff7ed" : "#ffffff",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={shipping.livraison_belgique}
                    onChange={(e) => setShipping((s) => ({ ...s, livraison_belgique: e.target.checked }))}
                    style={{ accentColor: "#FF7D07", width: "16px", height: "16px" }}
                  />
                  <span style={{ fontSize: "0.9rem", color: shipping.livraison_belgique ? "#FF7D07" : "#374151", fontWeight: shipping.livraison_belgique ? "600" : "400" }}>
                    Livraison Belgique
                  </span>
                </label>
                {shipping.livraison_belgique && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Prix livraison Belgique (€)"
                    value={shipping.prix_livraison_belgique}
                    onChange={(e) => setShipping((s) => ({ ...s, prix_livraison_belgique: e.target.value }))}
                    style={{ ...inputStyle, marginTop: "0.5rem" }}
                  />
                )}
              </div>
            </div>

            <a
              href="https://www.ups.com/fr/fr/support/shipping-support/shipping-costs-rates.page"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", marginTop: "0.75rem", color: "#6b7280", fontSize: "0.8rem", textDecoration: "underline" }}
            >
              Estimer le prix de livraison UPS →
            </a>
          </div>

          {/* Préparation Amazon (FBA) */}
          <div style={fieldStyle}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.65rem 1rem",
                border: shipping.preparation_amazon ? "2px solid #FF7D07" : "1px solid #d1d5db",
                borderRadius: "8px",
                backgroundColor: shipping.preparation_amazon ? "#fff7ed" : "#ffffff",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={shipping.preparation_amazon}
                onChange={(e) =>
                  setShipping((s) => ({
                    ...s,
                    preparation_amazon: e.target.checked,
                    preparation_amazon_type: e.target.checked ? s.preparation_amazon_type : "",
                    prix_preparation_amazon: e.target.checked ? s.prix_preparation_amazon : "",
                  }))
                }
                style={{ accentColor: "#FF7D07", width: "16px", height: "16px" }}
              />
              <span style={{ fontSize: "0.9rem", color: shipping.preparation_amazon ? "#FF7D07" : "#374151", fontWeight: shipping.preparation_amazon ? "600" : "400" }}>
                Préparation Amazon (FBA)
              </span>
            </label>

            {shipping.preparation_amazon && (
              <div style={{ marginTop: "0.75rem", paddingLeft: "0.5rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  {([
                    { value: "gratuite" as const, label: "Préparation gratuite" },
                    { value: "payante" as const, label: "Préparation payante" },
                  ]).map(({ value, label }) => {
                    const selected = shipping.preparation_amazon_type === value;
                    return (
                      <label
                        key={value}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.55rem 0.9rem",
                          border: selected ? "2px solid #FF7D07" : "1px solid #d1d5db",
                          borderRadius: "8px",
                          cursor: "pointer",
                          backgroundColor: selected ? "#fff7ed" : "#ffffff",
                          color: selected ? "#FF7D07" : "#374151",
                          fontWeight: selected ? "600" : "400",
                          fontSize: "0.875rem",
                          userSelect: "none",
                        }}
                      >
                        <input
                          type="radio"
                          name="preparation_amazon_type"
                          value={value}
                          checked={selected}
                          onChange={() => setShipping((s) => ({ ...s, preparation_amazon_type: value }))}
                          style={{ accentColor: "#FF7D07", width: "15px", height: "15px" }}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>

                {shipping.preparation_amazon_type === "payante" && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Prix préparation Amazon (€)"
                    value={shipping.prix_preparation_amazon}
                    onChange={(e) => setShipping((s) => ({ ...s, prix_preparation_amazon: e.target.value }))}
                    style={inputStyle}
                  />
                )}

                <p style={{ margin: "0.65rem 0 0 0", color: "#6b7280", fontSize: "0.8rem" }}>
                  ℹ️ L&apos;acheteur pourra uploader ses étiquettes après l&apos;achat.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.9rem",
              backgroundColor: "#FF7D07",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "0.5rem",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Publication…" : "Publier le listing"}
          </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
