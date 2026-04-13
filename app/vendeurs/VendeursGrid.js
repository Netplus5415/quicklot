'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const BATCH = 12;

function renderStars(avg) {
  const rounded = Math.round(avg);
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
}

function displayName(seller) {
  return seller.pseudo ?? seller.prenom ?? 'Vendeur';
}

function SellerCard({ seller }) {
  const name = displayName(seller);
  const initiale = name.charAt(0).toUpperCase();

  return (
    <div
      style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        textAlign: 'center',
      }}
    >
      {/* Avatar */}
      {seller.avatar_url ? (
        <img
          src={seller.avatar_url}
          alt={name}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#FF7D07',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#ffffff', fontSize: '2rem', fontWeight: 'bold' }}>
            {initiale}
          </span>
        </div>
      )}

      {/* Nom + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <h2 style={{ color: '#111827', fontSize: '1rem', fontWeight: '600', margin: 0 }}>
          {name}
        </h2>
        {seller.kyc_status === 'verified' && (
          <span style={{ backgroundColor: '#FF7D07', color: '#ffffff', fontSize: '0.65rem', fontWeight: '700', padding: '0.15rem 0.45rem', borderRadius: '999px' }}>
            ✓ Vérifié
          </span>
        )}
      </div>

      {/* Rating */}
      {seller.ratingAvg !== null ? (
        <p style={{ color: '#FF7D07', fontSize: '0.95rem', margin: 0 }}>
          {renderStars(seller.ratingAvg)}{' '}
          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
            ({seller.ratingCount} avis)
          </span>
        </p>
      ) : (
        <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0 }}>Aucun avis</p>
      )}

      {/* Listings */}
      <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
        {seller.listingCount} lot{seller.listingCount !== 1 ? 's' : ''} actif
        {seller.listingCount !== 1 ? 's' : ''}
      </p>

      {/* CTA */}
      <Link
        href={`/vendeur/${seller.id}`}
        style={{
          marginTop: '0.25rem',
          backgroundColor: '#FF7D07',
          color: '#ffffff',
          textDecoration: 'none',
          padding: '0.5rem 1.25rem',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: '600',
          display: 'inline-block',
        }}
      >
        Voir le profil
      </Link>
    </div>
  );
}

export default function VendeursGrid({ initialSellers, total }) {
  const [sellers, setSellers] = useState(initialSellers);
  const [offset, setOffset] = useState(initialSellers.length);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const hasMore = offset < total;

  async function loadMore() {
    setLoading(true);
    try {
      const { data: newSellers } = await supabase
        .from('users')
        .select('id, pseudo, prenom, avatar_url, created_at, kyc_status')
        .eq('role', 'seller')
        .order('created_at', { ascending: false })
        .range(offset, offset + BATCH - 1);

      if (!newSellers || newSellers.length === 0) {
        setOffset(total); // force hasMore = false
        return;
      }

      const ids = newSellers.map((s) => s.id);
      const [{ data: listings }, { data: ratings }] = await Promise.all([
        supabase
          .from('listings')
          .select('seller_id')
          .eq('status', 'active')
          .in('seller_id', ids),
        supabase.from('ratings').select('seller_id, score').in('seller_id', ids),
      ]);

      const enriched = newSellers.map((seller) => {
        const sellerListings = (listings || []).filter((l) => l.seller_id === seller.id);
        const sellerRatings = (ratings || []).filter((r) => r.seller_id === seller.id);
        const ratingCount = sellerRatings.length;
        const ratingAvg =
          ratingCount > 0
            ? sellerRatings.reduce((sum, r) => sum + r.score, 0) / ratingCount
            : null;
        return { ...seller, listingCount: sellerListings.length, ratingCount, ratingAvg };
      });

      setSellers((prev) => [...prev, ...enriched]);
      setOffset((prev) => prev + newSellers.length);
    } finally {
      setLoading(false);
    }
  }

  // Filtrage client sur les résultats chargés
  const query = search.trim().toLowerCase();
  const filtered = query
    ? sellers.filter((s) => {
        const name = (s.pseudo ?? s.prenom ?? '').toLowerCase();
        return name.includes(query);
      })
    : sellers;

  return (
    <div>
      {/* Barre de recherche */}
      <div style={{ marginBottom: '1.75rem' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un vendeur…"
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '0.65rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '0.9rem',
            color: '#111827',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'sans-serif',
          }}
        />
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <p
          style={{
            color: '#6b7280',
            fontSize: '1rem',
            textAlign: 'center',
            marginTop: '3rem',
          }}
        >
          {query ? 'Aucun vendeur ne correspond à cette recherche.' : 'Aucun vendeur pour le moment.'}
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem',
          }}
        >
          {filtered.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}

      {/* Charger plus */}
      {hasMore && !query && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            onClick={loadMore}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#e5e7eb' : '#FF7D07',
              color: loading ? '#9ca3af' : '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 2rem',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Chargement…' : 'Charger plus'}
          </button>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            {sellers.length} / {total} vendeurs affichés
          </p>
        </div>
      )}
    </div>
  );
}
