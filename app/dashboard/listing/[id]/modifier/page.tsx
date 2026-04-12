"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ModifierListing() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [authLoading, setAuthLoading] = useState(true);
  const [form, setForm] = useState({ titre: "", description: "", type: "Objet physique", prix: "" });
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) { router.replace("/connexion"); return; }

        const { data: listing, error: listingError } = await supabase
          .from("listings")
          .select("titre, description, type, prix, seller_id")
          .eq("id", id)
          .single();

        if (listingError || !listing) { router.replace("/dashboard"); return; }
        if (listing.seller_id !== user.id) { router.replace("/dashboard"); return; }

        setForm({
          titre: listing.titre,
          description: listing.description,
          type: listing.type,
          prix: String(listing.prix),
        });
      } finally {
        setAuthLoading(false);
      }
    }
    if (id) load();
  }, [id, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    const { error } = await supabase
      .from("listings")
      .update({
        titre: form.titre,
        description: form.description,
        type: form.type,
        prix: parseFloat(form.prix),
      })
      .eq("id", id);

    if (error) {
      setMessage({ text: error.message, error: true });
    } else {
      setMessage({ text: "Listing mis à jour avec succès !", error: false });
    }
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.75rem 1rem", backgroundColor: "#111",
    border: "1px solid #333", borderRadius: "8px", color: "#fff",
    fontSize: "1rem", outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", color: "#9ca3af", fontSize: "0.875rem", marginBottom: "0.4rem",
  };

  if (authLoading) {
    return (
      <div style={{ backgroundColor: "#000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <p style={{ color: "#6b7280" }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#000", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "540px" }}>
        <Link href="/dashboard" style={{ color: "#9ca3af", fontSize: "0.875rem", textDecoration: "none", display: "inline-block", marginBottom: "1.5rem" }}>
          ← Retour au dashboard
        </Link>

        <h1 style={{ color: "#fff", fontSize: "1.75rem", fontWeight: "bold", margin: "0 0 0.5rem 0" }}>
          Modifier le listing
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: "0 0 2rem 0" }}>
          Mettez à jour les informations de votre listing.
        </p>

        <div style={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.5rem", color: "#9ca3af", fontSize: "0.875rem", lineHeight: "1.5" }}>
          📷 Pour modifier les photos de votre listing, supprimez-le et recréez-le avec les nouvelles photos.
        </div>

        {message && (
          <div style={{
            padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1.25rem", fontSize: "0.9rem",
            backgroundColor: message.error ? "#1f0a0a" : "#0a1f0f",
            color: message.error ? "#f87171" : "#4ade80",
            border: `1px solid ${message.error ? "#7f1d1d" : "#14532d"}`,
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="titre" style={labelStyle}>Titre</label>
            <input id="titre" name="titre" type="text" value={form.titre} onChange={handleChange} required style={inputStyle} />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="description" style={labelStyle}>Description</label>
            <textarea id="description" name="description" value={form.description} onChange={handleChange} required rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="type" style={labelStyle}>Type</label>
            <select id="type" name="type" value={form.type} onChange={handleChange} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="Objet physique">Objet physique</option>
              <option value="Contenu digital">Contenu digital</option>
            </select>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="prix" style={labelStyle}>Prix (€)</label>
            <input id="prix" name="prix" type="number" min="0" step="0.01" value={form.prix} onChange={handleChange} required style={inputStyle} />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%", padding: "0.9rem", backgroundColor: saving ? "#6b1028" : "#9f1239",
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
