"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readConsent, writeConsent, type ConsentValue } from "@/lib/consent";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState<"accept" | "deny" | null>(null);

  useEffect(() => {
    setVisible(readConsent() === null);
  }, []);

  if (!visible) return null;

  const decide = (value: ConsentValue) => {
    writeConsent(value);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Consentement aux cookies de mesure d'audience"
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "1rem",
        right: "1rem",
        maxWidth: "480px",
        margin: "0 auto",
        backgroundColor: "#111827",
        color: "#ffffff",
        padding: "1.25rem",
        borderRadius: "12px",
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
        zIndex: 9999,
        fontFamily: "sans-serif",
        fontSize: "0.875rem",
        lineHeight: 1.5,
      }}
    >
      <p style={{ margin: "0 0 1rem 0" }}>
        Pour améliorer votre expérience sur Quicklot, nous utilisons des
        cookies de mesure d&apos;audience.{" "}
        <Link
          href="/confidentialite"
          style={{ color: "#FF7D07", textDecoration: "underline" }}
        >
          En savoir plus
        </Link>
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={() => decide("denied")}
          onMouseEnter={() => setHover("deny")}
          onMouseLeave={() => setHover(null)}
          style={{
            flex: 1,
            backgroundColor: hover === "deny" ? "#1f2937" : "transparent",
            color: "#ffffff",
            border: "1px solid #ffffff",
            padding: "0.6rem 1rem",
            borderRadius: "8px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "background-color 0.15s ease",
          }}
        >
          Refuser
        </button>
        <button
          type="button"
          onClick={() => decide("granted")}
          onMouseEnter={() => setHover("accept")}
          onMouseLeave={() => setHover(null)}
          style={{
            flex: 1,
            backgroundColor: hover === "accept" ? "#e56f00" : "#FF7D07",
            color: "#ffffff",
            border: "none",
            padding: "0.6rem 1rem",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background-color 0.15s ease",
          }}
        >
          Accepter
        </button>
      </div>
    </div>
  );
}
