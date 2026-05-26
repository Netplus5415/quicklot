import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import MetaPixel from "@/components/MetaPixel";
import ConsentBanner from "@/components/ConsentBanner";
import SignupTracker from "@/components/SignupTracker";
import AttributionTracker from "@/components/AttributionTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quicklot — La marketplace #1 du déstockage en France",
  description:
    "Achetez et vendez des lots de déstockage, surplus et liquidations. Rejoignez des milliers de professionnels francophones sur Quicklot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navigation />
        <div style={{ paddingTop: "56px" }}>{children}</div>
        <Footer />
        <MetaPixel />
        <ConsentBanner />
        <AttributionTracker />
        <Suspense fallback={null}>
          <SignupTracker />
        </Suspense>
      </body>
    </html>
  );
}
