"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function InscriptionVendeur() {
  const [form, setForm] = useState({
    prenom: "",
    email: "",
    motDePasse: "",
    confirmation: "",
    nom_entreprise: "",
  });
  const [typeVendeur, setTypeVendeur] = useState<"amazon" | "destockeur" | "">("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (form.motDePasse !== form.confirmation) {
      setMessage({ text: "Les mots de passe ne correspondent pas.", error: true });
      return;
    }

    if (!typeVendeur) {
      setMessage({ text: "Veuillez sélectionner votre type de vendeur.", error: true });
      return;
    }

    if (!form.nom_entreprise.trim()) {
      setMessage({
        text: "Veuillez renseigner le nom de votre entreprise ou enseigne (ou votre prénom et nom).",
        error: true,
      });
      return;
    }

    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.motDePasse,
      options: {
        data: { prenom: form.prenom },
      },
    });

    if (signUpError) {
      setMessage({ text: signUpError.message, error: true });
      setLoading(false);
      return;
    }

    if (signUpData?.user) {
      const nomEntreprise = form.nom_entreprise.trim();
      const prenomTrim = form.prenom.trim();
      const apiPayload = {
        userId: signUpData.user.id,
        prenom: prenomTrim,
        pseudo: nomEntreprise || prenomTrim,
        nom_entreprise: nomEntreprise,
        type_vendeur: typeVendeur,
      };
      console.log("[inscription] users/setup payload:", {
        userId: apiPayload.userId,
        pseudo: apiPayload.pseudo,
        nom_entreprise: apiPayload.nom_entreprise,
        type_vendeur: apiPayload.type_vendeur,
      });

      try {
        const res = await fetch("/api/users/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiPayload),
        });
        const result = await res.json();
        if (!res.ok) {
          console.error("[inscription] users/setup failed:", result);
          setMessage({
            text: `Compte auth créé mais profil vendeur non enregistré : ${result.error ?? "erreur inconnue"}. Contactez le support.`,
            error: true,
          });
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("[inscription] users/setup network error:", err);
        setMessage({
          text: "Compte auth créé mais profil vendeur non enregistré (erreur réseau). Contactez le support.",
          error: true,
        });
        setLoading(false);
        return;
      }
    }

    setMessage({ text: "Compte créé ! Vérifie ton email.", error: false });
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
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <Link
          href="/"
          style={{
            color: "#6b7280",
            fontSize: "0.875rem",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: "1.5rem",
          }}
        >
          ← Retour à l'accueil
        </Link>

        <h1
          style={{
            color: "#111827",
            fontSize: "1.75rem",
            fontWeight: "bold",
            margin: "0 0 0.5rem 0",
          }}
        >
          Créer mon compte
        </h1>
        <p
          style={{
            color: "#6b7280",
            fontSize: "0.95rem",
            margin: "0 0 2rem 0",
          }}
        >
          Rejoignez Quicklot pour acheter et vendre des lots.
        </p>

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
          <div style={fieldStyle}>
            <label htmlFor="prenom" style={labelStyle}>
              Prénom
            </label>
            <input
              id="prenom"
              name="prenom"
              type="text"
              placeholder="Votre prénom"
              value={form.prenom}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="email" style={labelStyle}>
              Adresse email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="vous@exemple.com"
              value={form.email}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="motDePasse" style={labelStyle}>
              Mot de passe
            </label>
            <input
              id="motDePasse"
              name="motDePasse"
              type="password"
              placeholder="••••••••"
              value={form.motDePasse}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="confirmation" style={labelStyle}>
              Confirmer le mot de passe
            </label>
            <input
              id="confirmation"
              name="confirmation"
              type="password"
              placeholder="••••••••"
              value={form.confirmation}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="nom_entreprise" style={labelStyle}>
              Nom de votre entreprise ou enseigne (si non existant, votre prénom et nom) *
            </label>
            <input
              id="nom_entreprise"
              name="nom_entreprise"
              type="text"
              placeholder="Ma Société SARL"
              value={form.nom_entreprise}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Type de vendeur *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {[
                { value: "amazon" as const, label: "Amazon Seller" },
                { value: "destockeur" as const, label: "Vendeur déstockeur" },
              ].map((opt) => {
                const active = typeVendeur === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTypeVendeur(opt.value)}
                    style={{
                      padding: "0.75rem 0.85rem",
                      borderRadius: "8px",
                      border: `2px solid ${active ? "#FF7D07" : "#d1d5db"}`,
                      backgroundColor: active ? "#fff7ed" : "#ffffff",
                      color: active ? "#FF7D07" : "#374151",
                      fontSize: "0.9rem",
                      fontWeight: active ? "700" : "500",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.1s",
                      fontFamily: "sans-serif",
                    }}
                  >
                    {active ? "✓ " : ""}{opt.label}
                  </button>
                );
              })}
            </div>
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
            {loading ? "Création en cours…" : "Créer mon compte"}
          </button>
        </form>
      </div>
    </div>
  );
}
