"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Connexion() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", motDePasse: "" });
  const [erreur, setErreur] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.motDePasse,
    });

    if (error) {
      setErreur(error.message);
      setLoading(false);
      return;
    }

    const email = data.user?.email;

    if (email === "contact@universpieds.fr") {
      router.push("/admin");
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user?.id)
      .single();

    if (profile?.role === "seller") {
      router.push("/dashboard");
    } else if (profile?.role === "buyer") {
      router.push("/dashboard/acheteur");
    } else {
      router.push("/boutique");
    }
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
        <h1
          style={{
            color: "#fff",
            fontSize: "1.75rem",
            fontWeight: "bold",
            margin: "0 0 0.5rem 0",
          }}
        >
          Connexion
        </h1>
        <p
          style={{
            color: "#6b7280",
            fontSize: "0.95rem",
            margin: "0 0 2rem 0",
          }}
        >
          Bienvenue sur UniversPieds.
        </p>

        {erreur && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              marginBottom: "1.25rem",
              fontSize: "0.9rem",
              backgroundColor: "#1f0a0a",
              color: "#f87171",
              border: "1px solid #7f1d1d",
            }}
          >
            {erreur}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.25rem" }}>
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

          <div style={{ marginBottom: "1.25rem" }}>
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
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p
          style={{
            color: "#6b7280",
            fontSize: "0.875rem",
            textAlign: "center",
            marginTop: "1.5rem",
          }}
        >
          Pas encore de compte ?{" "}
          <Link
            href="/"
            style={{ color: "#f9a8d4", textDecoration: "none" }}
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
