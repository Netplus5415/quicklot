"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PageContainer, Badge, Button } from "@/components/ui";

interface Listing {
  id: string;
  titre: string;
  description: string;
  type: string;
  categorie: string | null;
  prix: number;
  photo_url: string | null;
  seller_id: string;
  created_at: string;
  status: string;
  sold_at: string | null;
  enlevement_sur_place: boolean | null;
  livraison_france: boolean | null;
  prix_livraison_france: number | null;
  livraison_belgique: boolean | null;
  prix_livraison_belgique: number | null;
  preparation_amazon: boolean | null;
  preparation_amazon_type: string | null;
  prix_preparation_amazon: number | null;
}

interface Seller {
  pseudo: string | null;
  prenom: string | null;
  ville: string | null;
  kyc_status: string | null;
  rating_avg?: number | null;
  rating_count?: number;
}

interface ListingPhoto {
  photo_url: string;
  ordre: number;
}

type ShippingChoice = "enlevement" | "france" | "belgique" | "amazon";

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [orderMessage, setOrderMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [shippingChoice, setShippingChoice] = useState<ShippingChoice | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        const [{ data: listingData, error: listingError }, { data: photosData }] =
          await Promise.all([
            supabase
              .from("listings")
              .select("*")
              .eq("id", id)
              .or(`status.eq.active,and(status.eq.sold,sold_at.gt.${cutoff48h})`)
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

        const available: ShippingChoice[] = [];
        if (listingData.enlevement_sur_place) available.push("enlevement");
        if (listingData.livraison_france) available.push("france");
        if (listingData.livraison_belgique) available.push("belgique");
        if (listingData.preparation_amazon) available.push("amazon");
        if (available.length === 1) setShippingChoice(available[0]);

        const [{ data: sellerData }, { data: sellerRatings }] = await Promise.all([
          supabase
            .from("users")
            .select("pseudo, prenom, ville, kyc_status")
            .eq("id", listingData.seller_id)
            .single(),
          supabase
            .from("ratings")
            .select("rating, score")
            .or(`seller_id.eq.${listingData.seller_id},reviewee_id.eq.${listingData.seller_id}`),
        ]);

        if (sellerData) {
          const values = (sellerRatings ?? [])
            .map((r: { rating?: number | null; score?: number | null }) => r.rating ?? r.score)
            .filter((v): v is number => typeof v === "number");
          const rating_count = values.length;
          const rating_avg = rating_count > 0 ? values.reduce((s, v) => s + v, 0) / rating_count : null;
          setSeller({ ...(sellerData as Seller), rating_avg, rating_count });
        } else {
          setSeller(null);
        }

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
    if (!listing || !shippingChoice) return;
    setOrderLoading(true);
    setOrderMessage(null);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      window.location.href = `/connexion?redirect=${encodeURIComponent(`/boutique/${listing.id}`)}`;
      return;
    }

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          listingId: listing.id,
          shippingChoice,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Impossible de créer la session de paiement.");
      }

      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setOrderMessage({ text: message, error: true });
      setOrderLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-white">
        <p className="text-gray-500">Chargement…</p>
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center bg-white p-8">
        <p className="mb-4 text-base text-red-600">
          Ce listing est introuvable ou n&apos;est plus disponible.
        </p>
        <Link href="/boutique" className="text-sm text-gray-500 no-underline hover:text-gray-700">
          ← Retour au catalogue
        </Link>
      </div>
    );
  }

  const isSold = listing.status === "sold";
  const hasShippingOptions =
    !!listing.enlevement_sur_place ||
    !!listing.livraison_france ||
    !!listing.livraison_belgique ||
    !!listing.preparation_amazon;

  // Options livraison
  type Opt = {
    value: ShippingChoice;
    label: string;
    price: number;
    priceLabel: string;
  };
  const shippingOptions: Opt[] = [];
  if (listing.enlevement_sur_place) {
    shippingOptions.push({ value: "enlevement", label: "📦 Enlèvement sur place", price: 0, priceLabel: "Gratuit" });
  }
  if (listing.livraison_france && listing.prix_livraison_france != null) {
    shippingOptions.push({
      value: "france",
      label: "🇫🇷 Livraison France",
      price: listing.prix_livraison_france,
      priceLabel: `${listing.prix_livraison_france.toFixed(2)} €`,
    });
  }
  if (listing.livraison_belgique && listing.prix_livraison_belgique != null) {
    shippingOptions.push({
      value: "belgique",
      label: "🇧🇪 Livraison Belgique",
      price: listing.prix_livraison_belgique,
      priceLabel: `${listing.prix_livraison_belgique.toFixed(2)} €`,
    });
  }
  if (listing.preparation_amazon) {
    const amazonPrice =
      listing.preparation_amazon_type === "payante" && listing.prix_preparation_amazon != null
        ? listing.prix_preparation_amazon
        : 0;
    shippingOptions.push({
      value: "amazon",
      label: "📦 Préparation FBA par le vendeur — vous enverrez vos étiquettes après achat",
      price: amazonPrice,
      priceLabel: amazonPrice === 0 ? "Gratuit" : `${amazonPrice.toFixed(2)} €`,
    });
  }

  const selectedOpt = shippingOptions.find((o) => o.value === shippingChoice);
  const shippingPrice = selectedOpt?.price ?? 0;
  const total = listing.prix + shippingPrice;

  const recapLabel =
    shippingChoice === "amazon"
      ? "Préparation Amazon"
      : shippingChoice === "enlevement"
      ? "Enlèvement"
      : "Livraison";
  const recapValue = !shippingChoice
    ? "—"
    : shippingChoice === "enlevement"
    ? "Sur place"
    : shippingPrice === 0
    ? "Gratuit"
    : `${shippingPrice.toFixed(2)} €`;

  const needsShippingChoice = hasShippingOptions && !shippingChoice;
  const buyDisabled = orderLoading || ordered || needsShippingChoice || isSold;

  return (
    <PageContainer maxWidth="md" background="white">
      <Link
        href="/boutique"
        className="mb-6 inline-block text-sm text-gray-500 no-underline hover:text-gray-700"
      >
        ← Retour au catalogue
      </Link>

      {/* Galerie photos */}
      {photos.length > 0 && (
        <div className="mb-6">
          {/* Photo principale */}
          <div className="relative">
            <img
              src={photos[activeIndex]}
              alt={`${listing.titre} - photo ${activeIndex + 1}`}
              className={`block h-[400px] w-full rounded-xl border border-gray-200 object-cover ${isSold ? "opacity-60" : ""}`}
            />
            {isSold && (
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] rounded-lg border-4 border-white bg-red-600 px-10 py-3 text-4xl font-black uppercase tracking-widest text-white shadow-2xl"
              >
                Vendu
              </div>
            )}
          </div>

          {/* Miniatures */}
          {photos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {photos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Miniature ${i + 1}`}
                  onClick={() => setActiveIndex(i)}
                  className={`h-20 w-20 flex-shrink-0 cursor-pointer rounded-md object-cover transition-all ${
                    i === activeIndex ? "border-2 border-[#FF7D07] opacity-100" : "border-2 border-transparent opacity-60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Titre + prix */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <h1 className="m-0 flex-1 text-3xl font-bold text-gray-900">{listing.titre}</h1>
        <span className="whitespace-nowrap text-2xl font-bold text-gray-900">
          {listing.prix.toFixed(2)} €
        </span>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge variant="neutral" size="sm">{listing.type}</Badge>
        {listing.categorie && (
          <Badge variant="warning" size="sm" className="bg-[#fff7ed] text-[#FF7D07]">
            {listing.categorie}
          </Badge>
        )}
      </div>

      <p className="mb-8 whitespace-pre-wrap text-base leading-relaxed text-gray-700">
        {listing.description}
      </p>

      <p className="mb-3 text-xs text-gray-400">
        Publié le{" "}
        {new Date(listing.created_at).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      {/* Vendeur */}
      {seller && (
        <p className="mb-5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span>
            Vendu par{" "}
            <Link
              href={`/vendeur/${listing.seller_id}`}
              className="font-semibold text-[#FF7D07] no-underline"
            >
              {seller.pseudo ?? seller.prenom ?? "Vendeur"}
            </Link>
            {seller.ville ? ` · ${seller.ville}` : ""}
          </span>
          {seller.kyc_status === "verified" && (
            <Badge variant="warning" size="sm" className="bg-[#FF7D07] text-white">
              ✓ Vérifié
            </Badge>
          )}
          {seller.rating_avg != null && seller.rating_count != null && seller.rating_count > 0 && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#FF7D07]">
              ★ {seller.rating_avg.toFixed(1)}
              <span className="font-normal text-gray-400">({seller.rating_count} avis)</span>
            </span>
          )}
        </p>
      )}

      {/* Sélecteur de mode de livraison */}
      {hasShippingOptions && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Mode de livraison
          </p>
          <div className="flex flex-col gap-2">
            {shippingOptions.map((opt) => {
              const active = shippingChoice === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setShippingChoice(opt.value)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3.5 text-left font-sans transition-colors ${
                    active
                      ? "border-2 border-[#FF7D07] bg-[#FFF7F0]"
                      : "border border-gray-300 bg-white"
                  }`}
                >
                  {/* Radio custom */}
                  <span
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 bg-white ${
                      active ? "border-[#FF7D07]" : "border-gray-300"
                    }`}
                  >
                    {active && <span className="h-2.5 w-2.5 rounded-full bg-[#FF7D07]" />}
                  </span>
                  <span
                    className={`flex-1 text-sm ${
                      active ? "font-semibold text-[#FF7D07]" : "font-medium text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span
                    className={`whitespace-nowrap text-sm font-bold ${
                      active ? "text-[#FF7D07]" : "text-gray-900"
                    }`}
                  >
                    {opt.priceLabel}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Récapitulatif */}
          <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-1.5 flex justify-between text-sm text-gray-700">
              <span>Prix du lot</span>
              <span className="font-semibold">{listing.prix.toFixed(2)} €</span>
            </div>
            <div className="mb-2.5 flex justify-between text-sm text-gray-700">
              <span>{recapLabel}</span>
              <span className="font-semibold">{recapValue}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2.5 text-base font-bold text-gray-900">
              <span>Total à payer</span>
              <span>{total.toFixed(2)} € TTC</span>
            </div>
            <p className="mt-2 text-right text-[11px] text-gray-400">
              TVA selon conditions du vendeur
            </p>
          </div>
        </div>
      )}

      {/* Contacter le vendeur */}
      <Button
        variant="primary"
        fullWidth
        size="lg"
        disabled={isSold}
        className="mb-3"
        onClick={async () => {
          if (isSold) return;
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            window.location.href = `/connexion?redirect=${encodeURIComponent(`/boutique/${listing.id}`)}`;
            return;
          }
          window.location.href = `/messages?with=${listing.seller_id}&listing=${listing.id}`;
        }}
      >
        {isSold ? "Lot déjà vendu" : "Contacter le vendeur"}
      </Button>

      {orderMessage && (
        <div
          className={`mb-3 rounded-lg border px-4 py-3 text-sm ${
            orderMessage.error
              ? "border-red-300 bg-red-50 text-red-600"
              : "border-green-300 bg-green-50 text-green-700"
          }`}
        >
          {orderMessage.text}
        </div>
      )}

      {/* Acheter */}
      <Button
        variant="primary"
        fullWidth
        size="lg"
        disabled={buyDisabled}
        loading={orderLoading}
        onClick={handleAcheter}
      >
        {isSold
          ? "Lot déjà vendu"
          : ordered
          ? "Commande effectuée"
          : orderLoading
          ? "Redirection…"
          : needsShippingChoice
          ? "Sélectionnez un mode de livraison"
          : `Acheter — ${total.toFixed(2)} €`}
      </Button>
    </PageContainer>
  );
}
