"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Navigation() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setConnected(!!user);
    }
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setConnected(!!session?.user);
    });

    function handleResize() {
      setMobile(window.innerWidth < 640);
    }
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const linkStyle: React.CSSProperties = {
    color: "#9ca3af",
    textDecoration: "none",
    fontSize: mobile ? "0.8rem" : "0.9rem",
    fontWeight: "500",
    whiteSpace: "nowrap",
  };

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: "#000",
        borderBottom: "1px solid #9f1239",
        height: "56px",
        display: "flex",
        alignItems: "center",
        padding: mobile ? "0 1rem" : "0 2rem",
        fontFamily: "sans-serif",
        gap: "0.5rem",
      }}
    >
      <Link
        href="/"
        style={{
          color: "#fff",
          textDecoration: "none",
          fontSize: mobile ? "0.95rem" : "1.1rem",
          fontWeight: "bold",
          letterSpacing: "-0.01em",
          marginRight: "auto",
          whiteSpace: "nowrap",
        }}
      >
        UniversPieds
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: mobile ? "0.75rem" : "1.5rem" }}>
        <Link href="/boutique" style={linkStyle}>
          Boutique
        </Link>

        {connected === null ? null : connected ? (
          <>
            <Link href="/dashboard" style={linkStyle}>
              Dashboard
            </Link>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
              style={{
                backgroundColor: "transparent",
                border: "1px solid #374151",
                borderRadius: "6px",
                color: "#9ca3af",
                fontSize: mobile ? "0.8rem" : "0.9rem",
                fontWeight: "500",
                padding: mobile ? "0.25rem 0.5rem" : "0.35rem 0.85rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Déconnexion
            </button>
          </>
        ) : (
          <Link href="/connexion" style={linkStyle}>
            Connexion
          </Link>
        )}
      </div>
    </nav>
  );
}
