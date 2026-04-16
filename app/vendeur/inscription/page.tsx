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
  const [googleLoading, setGoogleLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleGoogleSignIn() {
    setMessage(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://www.quicklot.fr/auth/callback" },
    });
    if (error) {
      setMessage({ text: error.message, error: true });
      setGoogleLoading(false);
    }
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

      try {
        const { data: { session: newSession } } = await supabase.auth.getSession();
        const res = await fetch("/api/users/setup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(newSession?.access_token ? { Authorization: `Bearer ${newSession.access_token}` } : {}),
          },
          body: JSON.stringify(apiPayload),
        });
        const result = await res.json();
        if (!res.ok) {
          setMessage({
            text: `Compte auth créé mais profil vendeur non enregistré : ${result.error ?? "erreur inconnue"}. Contactez le support.`,
            error: true,
          });
          setLoading(false);
          return;
        }
      } catch {
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

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "#ffffff",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            color: "#374151",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: googleLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            fontFamily: "sans-serif",
            opacity: googleLoading ? 0.7 : 1,
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {googleLoading ? "Redirection…" : "Continuer avec Google"}
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            margin: "1.25rem 0",
          }}
        >
          <div style={{ flex: 1, height: 1, backgroundColor: "#e5e7eb" }} />
          <span style={{ color: "#9ca3af", fontSize: "0.8rem", fontWeight: 500 }}>ou</span>
          <div style={{ flex: 1, height: 1, backgroundColor: "#e5e7eb" }} />
        </div>

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
              Nom de l&apos;entreprise *
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
