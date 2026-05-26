"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Bienvenue() {
  const [optIn, setOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(value: boolean) {
    setError(null);
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.replace("/connexion");
        return;
      }
      const res = await fetch("/api/users/marketing-opt-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ opt_in: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Impossible d'enregistrer votre choix.");
        setLoading(false);
        return;
      }
      router.replace("/dashboard");
    } catch {
      setError("Erreur réseau. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <h1
          style={{
            color: "#111827",
            fontSize: "1.75rem",
            fontWeight: "bold",
            margin: "0 0 0.5rem 0",
          }}
        >
          Bienvenue sur Quicklot
        </h1>
        <p
          style={{
            color: "#6b7280",
            fontSize: "0.95rem",
            margin: "0 0 2rem 0",
            lineHeight: 1.5,
          }}
        >
          Une dernière chose avant d&apos;accéder à votre tableau de bord.
        </p>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              marginBottom: "1.25rem",
              fontSize: "0.9rem",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fca5a5",
            }}
          >
            {error}
          </div>
        )}

        <label
          htmlFor="opt_in"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.65rem",
            color: "#374151",
            fontSize: "0.95rem",
            lineHeight: 1.5,
            margin: "0 0 1.5rem 0",
            cursor: "pointer",
            backgroundColor: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "1rem",
          }}
        >
          <input
            id="opt_in"
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            style={{
              width: "1.1rem",
              height: "1.1rem",
              marginTop: "0.15rem",
              accentColor: "#FF7D07",
              cursor: "pointer",
              flexShrink: 0,
            }}
          />
          <span>
            J&apos;accepte de recevoir les conseils, nouveautés et opportunités
            de lots par email. Je peux me désinscrire à tout moment.
          </span>
        </label>

        <button
          type="button"
          onClick={() => submit(optIn)}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.9rem",
            backgroundColor: "#FF7D07",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            marginBottom: "0.75rem",
          }}
        >
          {loading ? "Enregistrement…" : "Continuer"}
        </button>

        <button
          type="button"
          onClick={() => submit(false)}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "transparent",
            color: "#6b7280",
            border: "none",
            fontSize: "0.875rem",
            cursor: loading ? "not-allowed" : "pointer",
            textDecoration: "underline",
          }}
        >
          Passer cette étape
        </button>
      </div>
    </div>
  );
}
