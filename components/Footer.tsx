"use client";

import Link from "next/link";
import { useState } from "react";

const IG_COLOR = "#E1306C";
const IG_HOVER = "#b82458";
const FB_COLOR = "#1877F2";
const FB_HOVER = "#0d5fd4";

const LEGAL_LINKS: { href: string; label: string }[] = [
  { href: "/a-propos", label: "À propos" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgv", label: "CGV" },
  { href: "/conditions-vendeur", label: "Conditions vendeurs" },
  { href: "/confidentialite", label: "Politique de confidentialité" },
];

export default function Footer() {
  const [hover, setHover] = useState<"ig" | "fb" | null>(null);

  const igStyle: React.CSSProperties = {
    color: hover === "ig" ? IG_HOVER : IG_COLOR,
    transition: "color 0.15s ease",
    display: "inline-flex",
  };
  const fbStyle: React.CSSProperties = {
    color: hover === "fb" ? FB_HOVER : FB_COLOR,
    transition: "color 0.15s ease",
    display: "inline-flex",
  };

  return (
    <footer
      style={{
        backgroundColor: "#ffffff",
        padding: "1.25rem 1rem",
        textAlign: "center",
        fontFamily: "var(--font-geist-sans), sans-serif",
        borderTop: "1px solid #f3f4f6",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "1rem 1.25rem",
          marginBottom: "0.75rem",
        }}
      >
        {LEGAL_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              color: "#6b7280",
              fontSize: "0.75rem",
              textDecoration: "none",
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginBottom: "0.5rem",
        }}
      >
        <a
          href="https://www.instagram.com/quick_lot/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram Quicklot"
          style={igStyle}
          onMouseEnter={() => setHover("ig")}
          onMouseLeave={() => setHover(null)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        </a>
        <a
          href="https://www.facebook.com/share/1BFjpqRTig/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook Quicklot"
          style={fbStyle}
          onMouseEnter={() => setHover("fb")}
          onMouseLeave={() => setHover(null)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        </a>
      </div>
      <p
        style={{
          color: "#9ca3af",
          fontSize: "0.7rem",
          margin: 0,
        }}
      >
        © 2026 Quicklot
      </p>
    </footer>
  );
}
