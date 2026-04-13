import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: listing } = await supabase
      .from("listings")
      .select("titre, description, photo_url, prix")
      .eq("id", id)
      .maybeSingle();

    if (!listing) {
      return {
        title: "Listing introuvable — Quicklot",
        description: "Ce lot n'est plus disponible sur Quicklot.",
      };
    }

    const description =
      (listing.description as string | null)?.slice(0, 155) ??
      "Découvrez ce lot sur Quicklot, la marketplace du déstockage.";

    return {
      title: `${listing.titre} — Quicklot`,
      description,
      openGraph: {
        title: `${listing.titre} — Quicklot`,
        description,
        type: "website",
        url: `https://www.quicklot.fr/boutique/${id}`,
        images: listing.photo_url ? [{ url: listing.photo_url }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title: `${listing.titre} — Quicklot`,
        description,
        images: listing.photo_url ? [listing.photo_url] : [],
      },
    };
  } catch (err) {
    console.error("[boutique/[id]] generateMetadata error:", err);
    return {
      title: "Quicklot — Marketplace du déstockage",
    };
  }
}

export default function BoutiqueListingLayout({ children }: { children: ReactNode }) {
  return children;
}
