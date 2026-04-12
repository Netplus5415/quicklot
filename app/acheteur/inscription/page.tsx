"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function InscriptionAcheteur() {
  const [form, setForm] = useState({
    prenom: "",
    email: "",
    motDePasse: "",
    confirmation: "",
  });
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

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
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

    const userId = data.user?.id;
    if (userId) {
      const { error: insertError } = await supabase.from("users").insert({
        id: userId,
        prenom: form.prenom,
        email: form.email,
        role: "buyer",
      });

      if (insertError) {
        setMessage({ text: insertError.message, error: true });
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
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <Link
          href="/"
          style={{
            color: "#9ca3af",
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
            color: "#fff",
            fontSize: "1.75rem",
            fontWeight: "bold",
            margin: "0 0 0.5rem 0",
          }}
        >
          Créer un compte acheteur
        </h1>
        <p
          style={{
            color: "#6b7280",
            fontSize: "0.95rem",
            margin: "0 0 2rem 0",
          }}
        >
          Rejoignez UniversPieds et découvrez du contenu exclusif.
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
            {loading ? "Création en cours…" : "Créer mon compte acheteur"}
          </button>
        </form>
      </div>
    </div>
  );
}
