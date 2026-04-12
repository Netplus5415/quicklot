"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function NouveauListing() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [form, setForm] = useState({
    titre: "",
    description: "",
    type: "Objet physique",
    prix: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.replace("/connexion");
          return;
        }
        setUserId(user.id);
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handlePhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 5);
    setPhotos(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  function removePhoto(index: number) {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPreviews(newPreviews);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

    // 2. Insérer le listing avec la première photo comme photo principale
    const { data: listingData, error: listingError } = await supabase
      .from("listings")
      .insert({
        seller_id: userId,
        titre: form.titre,
        description: form.description,
        type: form.type,
        prix: parseFloat(form.prix),
        status: "active",
        photo_url: firstPhotoUrl,
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

    setMessage({ text: "Listing publié avec succès !", error: false });
    setForm({ titre: "", description: "", type: "Objet physique", prix: "" });
    setPhotos([]);
    setPreviews([]);
    setLoading(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem 1rem",
    backgroundColor: "#111",
    border: "1px solid #333",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#9ca3af",
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
          backgroundColor: "#000",
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
        backgroundColor: "#000",
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
            color: "#9ca3af",
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
            color: "#fff",
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
          Publiez un article ou du contenu sur UniversPieds.
        </p>

        {message && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              marginBottom: "1.25rem",
              fontSize: "0.9rem",
              backgroundColor: message.error ? "#1f0a0a" : "#0a1f0f",
              color: message.error ? "#f87171" : "#4ade80",
              border: `1px solid ${message.error ? "#7f1d1d" : "#14532d"}`,
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label htmlFor="titre" style={labelStyle}>
              Titre
            </label>
            <input
              id="titre"
              name="titre"
              type="text"
              placeholder="Ex : Chaussettes portées 3 jours"
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
              placeholder="Décrivez votre article en détail…"
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
              <option value="Objet physique">Objet physique</option>
              <option value="Contenu digital">Contenu digital</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label htmlFor="photos" style={labelStyle}>
              Photos (max 5) — la première sera la photo principale
            </label>
            <input
              id="photos"
              name="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotosChange}
              style={{
                ...inputStyle,
                padding: "0.6rem 1rem",
                cursor: "pointer",
                color: "#9ca3af",
              }}
            />
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
                        border: i === 0 ? "2px solid #9f1239" : "1px solid #333",
                        display: "block",
                      }}
                    />
                    {i === 0 && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: "4px",
                          left: "4px",
                          backgroundColor: "#9f1239",
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
                        backgroundColor: "#000",
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
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.9rem",
              backgroundColor: loading ? "#6b1028" : "#9f1239",
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
        </form>
      </div>
    </div>
  );
}
