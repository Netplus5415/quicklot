"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Listing {
  id: string;
  titre: string;
  description: string;
  type: string;
  prix: number;
  photo_url: string | null;
}

export default function Boutique() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      try {
        const { data } = await supabase
          .from("listings")
          .select("*")
          .eq("status", "active");

        setListings(data ?? []);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, []);

  return (
    <div
      style={{
        backgroundColor: "#000",
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
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
            fontSize: "2rem",
            fontWeight: "bold",
            margin: "0 0 0.5rem 0",
          }}
        >
          Boutique
        </h1>
        <p
          style={{
            color: "#6b7280",
            fontSize: "0.95rem",
            margin: "0 0 2rem 0",
          }}
        >
          Découvrez tous les listings disponibles sur UniversPieds.
        </p>

        {loading ? (
          <p style={{ color: "#6b7280" }}>Chargement…</p>
        ) : listings.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: "1rem", marginTop: "3rem", textAlign: "center" }}>
            Aucun listing disponible pour le moment.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {listings.map((listing) => (
              <div
                key={listing.id}
                style={{
                  backgroundColor: "#111",
                  border: "1px solid #1f2937",
                  borderRadius: "12px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {listing.photo_url ? (
                  <img
                    src={listing.photo_url}
                    alt={listing.titre}
                    style={{
                      width: "100%",
                      height: "180px",
                      objectFit: "cover",
                      borderRadius: "8px 8px 0 0",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "180px",
                      backgroundColor: "#1f2937",
                      borderRadius: "8px 8px 0 0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ color: "#4b5563", fontSize: "0.875rem" }}>
                      Pas de photo
                    </span>
                  </div>
                )}

                <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      backgroundColor: "#1f2937",
                      color: "#9ca3af",
                      fontSize: "0.75rem",
                      padding: "0.25rem 0.6rem",
                      borderRadius: "999px",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {listing.type}
                  </span>
                  <h2
                    style={{
                      color: "#fff",
                      fontSize: "1rem",
                      fontWeight: "600",
                      margin: "0 0 0.5rem 0",
                    }}
                  >
                    {listing.titre}
                  </h2>
                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: "0.875rem",
                      margin: 0,
                      lineHeight: "1.5",
                    }}
                  >
                    {listing.description.length > 50
                      ? listing.description.slice(0, 50) + "…"
                      : listing.description}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >

                  <span
                    style={{
                      color: "#fff",
                      fontSize: "1.25rem",
                      fontWeight: "bold",
                    }}
                  >
                    {listing.prix.toFixed(2)} €
                  </span>
                  <Link
                    href={`/boutique/${listing.id}`}
                    style={{
                      backgroundColor: "#9f1239",
                      color: "#fff",
                      textDecoration: "none",
                      padding: "0.5rem 1.1rem",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                    }}
                  >
                    Voir
                  </Link>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
