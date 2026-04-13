"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PageContainer, Input, Badge, EmptyState } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";

interface Listing {
  id: string;
  titre: string;
  description: string;
  type: string;
  categorie: string | null;
  prix: number;
  photo_url: string | null;
}

const PAGE_SIZE = 24;

type Tri = "date_desc" | "date_asc" | "prix_asc" | "prix_desc";

export default function Boutique() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [searchActive, setSearchActive] = useState("");
  const [categorie, setCategorie] = useState("");
  const [tri, setTri] = useState<Tri>("date_desc");
  const [page, setPage] = useState(1);

  // Debounce 400ms sur le champ de recherche
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchActive(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page à 1 quand catégorie ou tri change
  useEffect(() => {
    setPage(1);
  }, [categorie, tri]);

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("listings")
        .select("*", { count: "exact" })
        .eq("status", "active");

      if (searchActive.trim()) {
        const term = searchActive.trim().replace(/[%,]/g, " ");
        query = query.or(`titre.ilike.%${term}%,description.ilike.%${term}%`);
      }

      if (categorie) {
        query = query.eq("categorie", categorie);
      }

      switch (tri) {
        case "date_asc":
          query = query.order("created_at", { ascending: true });
          break;
        case "prix_asc":
          query = query.order("prix", { ascending: true });
          break;
        case "prix_desc":
          query = query.order("prix", { ascending: false });
          break;
        case "date_desc":
        default:
          query = query.order("created_at", { ascending: false });
          break;
      }

      const { data, error, count } = await query.range(from, to);

      if (error) {
        console.error("[boutique] loadListings error:", error.message, error.details, error.hint);
      }

      setListings((data as Listing[]) ?? []);
      setTotalCount(count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [searchActive, categorie, tri, page]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Calcul des numéros de pages visibles (max 5 + ellipsis)
  function pageNumbers(): Array<number | "..."> {
    const pages: Array<number | "..."> = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    if (page <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = page - 1; i <= page + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }

  return (
    <PageContainer maxWidth="xl" background="white">
      <Link
        href="/"
        className="mb-6 inline-block text-sm text-gray-500 no-underline hover:text-gray-700"
      >
        ← Retour à l&apos;accueil
      </Link>

      <h1 className="mb-1 text-3xl font-bold text-gray-900">Catalogue</h1>
      <p className="mb-6 text-base text-gray-500">
        Découvrez tous les lots disponibles sur Quicklot.
      </p>

      {/* Filtres */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setSearchActive(searchInput);
                setPage(1);
              }
            }}
            placeholder="Rechercher par titre ou description…"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="categorie" className="text-sm font-medium text-gray-600">
            Catégorie
          </label>
          <select
            id="categorie"
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="h-[42px] cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-[#FF7D07]"
          >
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="tri" className="text-sm font-medium text-gray-600">
            Trier par
          </label>
          <select
            id="tri"
            value={tri}
            onChange={(e) => setTri(e.target.value as Tri)}
            className="h-[42px] cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-[#FF7D07]"
          >
            <option value="date_desc">Plus récents</option>
            <option value="date_asc">Plus anciens</option>
            <option value="prix_asc">Prix croissant</option>
            <option value="prix_desc">Prix décroissant</option>
          </select>
        </div>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        {loading ? "Chargement…" : `${totalCount} résultat${totalCount > 1 ? "s" : ""}`}
      </p>

      {loading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : listings.length === 0 ? (
        <EmptyState
          title={searchActive || categorie ? "Aucun résultat" : "Aucun lot disponible"}
          description={
            searchActive || categorie
              ? "Essayez d'autres mots-clés ou changez de catégorie."
              : "Aucun listing n'est disponible pour le moment. Revenez bientôt."
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
              >
                {listing.photo_url ? (
                  <img
                    src={listing.photo_url}
                    alt={listing.titre}
                    className="block h-[180px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-[180px] w-full items-center justify-center bg-gray-200">
                    <span className="text-sm text-gray-400">Pas de photo</span>
                  </div>
                )}

                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      <Badge variant="neutral" size="sm">
                        {listing.type}
                      </Badge>
                      {listing.categorie && (
                        <Badge variant="warning" size="sm" className="bg-[#fff7ed] text-[#FF7D07]">
                          {listing.categorie}
                        </Badge>
                      )}
                    </div>
                    <h2 className="mb-2 text-base font-semibold text-gray-900">
                      {listing.titre}
                    </h2>
                    <p className="m-0 text-sm leading-relaxed text-gray-500">
                      {listing.description.length > 50
                        ? listing.description.slice(0, 50) + "…"
                        : listing.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-gray-900">
                      {listing.prix.toFixed(2)} €
                    </span>
                    <Link
                      href={`/boutique/${listing.id}`}
                      className="rounded-lg bg-[#FF7D07] px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#e56c00]"
                    >
                      Voir
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination numérique */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Précédent
              </button>

              {pageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-2 text-sm text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[36px] rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                      p === page
                        ? "bg-[#FF7D07] text-white"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
