"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Listing {
  id: string;
  titre: string;
  description: string;
  type: string;
  prix: number;
  photo_url: string | null;
  seller_id: string;
}

interface ListingPhoto {
  photo_url: string;
  ordre: number;
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [ordered, setOrdered] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [{ data: listingData, error: listingError }, { data: photosData }] =
          await Promise.all([
            supabase
              .from("listings")
              .select("*")
              .eq("id", id)
              .eq("status", "active")
              .single(),
            supabase
              .from("listing_photos")
              .select("photo_url, ordre")
              .eq("listing_id", id)
              .order("ordre", { ascending: true }),
          ]);

        if (listingError || !listingData) {
          setNotFound(true);
          return;
        }

        setListing(listingData);

        if (photosData && photosData.length > 0) {
          setPhotos((photosData as ListingPhoto[]).map((p) => p.photo_url));
        } else if (listingData.photo_url) {
          setPhotos([listingData.photo_url]);
        }
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchData();
  }, [id]);

  async function handleAcheter() {
    if (!listing) return;
    setOrderLoading(true);
    setOrderMessage(null);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      window.location.href = "/connexion";
      return;
    }

    const amount = listing.prix;
    const commission_amount = Math.round(amount * 0.15 * 100) / 100;
    const seller_amount = Math.round(amount * 0.85 * 100) / 100;

    const { error } = await supabase.from("orders").insert({
      buyer_id: user.id,
      seller_id: listing.seller_id,
      listing_id: listing.id,
      amount,
      commission_amount,
      seller_amount,
      status: "pending",
    });

    if (error) {
      setOrderMessage({ text: error.message, error: true });
      setOrderLoading(false);
      return;
    }

    setOrderMessage({ text: "Commande envoyée ! La vendeuse va vous contacter.", error: false });
    setOrdered(true);
    setOrderLoading(false);
  }

  if (loading) {
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

  if (notFound || !listing) {
    return (
      <div
        style={{
          backgroundColor: "#000",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "2rem",
        }}
      >
        <p style={{ color: "#f87171", fontSize: "1rem", marginBottom: "1rem" }}>
          Ce listing est introuvable ou n'est plus disponible.
        </p>
        <Link href="/boutique" style={{ color: "#9ca3af", textDecoration: "none", fontSize: "0.875rem" }}>
          ← Retour à la boutique
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#000",
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <Link
          href="/boutique"
          style={{
            color: "#9ca3af",
            fontSize: "0.875rem",
            textDecoration: "none",
            display: "inline-block",
            marginBottom: "1.5rem",
          }}
        >
          ← Retour à la boutique
        </Link>

        {/* Galerie photos */}
        {photos.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            {/* Photo principale */}
            <img
              src={photos[activeIndex]}
              alt={`${listing.titre} - photo ${activeIndex + 1}`}
              style={{
                width: "100%",
                height: "400px",
                objectFit: "cover",
                borderRadius: "12px",
                border: "1px solid #1f2937",
                display: "block",
              }}
            />

            {/* Miniatures */}
            {photos.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginTop: "0.75rem",
                  overflowX: "auto",
                  paddingBottom: "4px",
                }}
              >
                {photos.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Miniature ${i + 1}`}
                    onClick={() => setActiveIndex(i)}
                    style={{
                      width: "80px",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "6px",
                      flexShrink: 0,
                      cursor: "pointer",
                      border: i === activeIndex
                        ? "2px solid #9f1239"
                        : "2px solid transparent",
                      opacity: i === activeIndex ? 1 : 0.6,
                      transition: "opacity 0.15s, border-color 0.15s",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Titre + prix */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <h1
            style={{
              color: "#fff",
              fontSize: "1.75rem",
              fontWeight: "bold",
              margin: 0,
              flex: 1,
            }}
          >
            {listing.titre}
          </h1>
          <span
            style={{
              color: "#fff",
              fontSize: "1.5rem",
              fontWeight: "bold",
              whiteSpace: "nowrap",
            }}
          >
            {listing.prix.toFixed(2)} €
          </span>
        </div>

        <span
          style={{
            display: "inline-block",
            backgroundColor: "#1f2937",
            color: "#9ca3af",
            fontSize: "0.75rem",
            padding: "0.25rem 0.6rem",
            borderRadius: "999px",
            marginBottom: "1.5rem",
          }}
        >
          {listing.type}
        </span>

        <p
          style={{
            color: "#d1d5db",
            fontSize: "1rem",
            lineHeight: "1.75",
            margin: "0 0 2rem 0",
            whiteSpace: "pre-wrap",
          }}
        >
          {listing.description}
        </p>

        <button
          onClick={() => alert("Fonctionnalité bientôt disponible !")}
          style={{
            width: "100%",
            padding: "0.9rem",
            backgroundColor: "#9f1239",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: "pointer",
            marginBottom: "0.75rem",
          }}
        >
          Contacter la vendeuse
        </button>

        {orderMessage && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              marginBottom: "0.75rem",
              fontSize: "0.9rem",
              backgroundColor: orderMessage.error ? "#1f0a0a" : "#0a1f0f",
              color: orderMessage.error ? "#f87171" : "#4ade80",
              border: `1px solid ${orderMessage.error ? "#7f1d1d" : "#14532d"}`,
            }}
          >
            {orderMessage.text}
          </div>
        )}

        <button
          onClick={handleAcheter}
          disabled={orderLoading || ordered}
          style={{
            width: "100%",
            padding: "0.9rem",
            backgroundColor: ordered ? "#1f2937" : orderLoading ? "#6b1028" : "#be123c",
            color: ordered ? "#6b7280" : "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: ordered || orderLoading ? "not-allowed" : "pointer",
            opacity: orderLoading ? 0.7 : 1,
          }}
        >
          {ordered
            ? "Commande effectuée"
            : orderLoading
            ? "Traitement…"
            : `Acheter — ${listing.prix.toFixed(2)} €`}
        </button>
      </div>
    </div>
  );
}
