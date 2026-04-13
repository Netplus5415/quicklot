"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function HeroButtons() {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setConnected(!!user);
    });
  }, []);

  if (connected === null) return null;

  if (connected) {
    return (
      <Link
        href="/boutique"
        style={{
          display: "inline-block",
          backgroundColor: "#FF7D07",
          color: "#fff",
          textDecoration: "none",
          padding: "0.9rem 2.25rem",
          borderRadius: "8px",
          fontSize: "1rem",
          fontWeight: "700",
          letterSpacing: "0.01em",
        }}
      >
        Accéder au catalogue
      </Link>
    );
  }

  return (
    <Link
      href="/vendeur/inscription"
      style={{
        display: "inline-block",
        backgroundColor: "#FF7D07",
        color: "#fff",
        textDecoration: "none",
        padding: "0.9rem 2.5rem",
        borderRadius: "8px",
        fontSize: "1rem",
        fontWeight: "700",
        letterSpacing: "0.01em",
      }}
    >
      Acheter ou vendre des lots
    </Link>
  );
}
