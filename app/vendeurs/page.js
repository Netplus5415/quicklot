import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import VendeursGrid from './VendeursGrid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function enrichSellers(sellers, listings, ratings) {
  return sellers.map((seller) => {
    const sellerListings = (listings || []).filter((l) => l.seller_id === seller.id);
    const sellerRatings = (ratings || []).filter((r) => r.reviewee_id === seller.id);
    const ratingCount = sellerRatings.length;
    const ratingAvg =
      ratingCount > 0
        ? sellerRatings.reduce((sum, r) => sum + r.rating, 0) / ratingCount
        : null;
    return {
      ...seller,
      listingCount: sellerListings.length,
      ratingCount,
      ratingAvg,
    };
  });
}

export default async function VendeursPage() {
  // Compte total de vendeurs
  const { count } = await supabase
    .from('public_user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'seller');

  // Premiers 12 vendeurs
  const { data: sellers } = await supabase
    .from('public_user_profiles')
    .select('id, pseudo, prenom, avatar_url, created_at, kyc_status')
    .eq('role', 'seller')
    .order('created_at', { ascending: false })
    .range(0, 11);

  const initial = sellers ?? [];

  let enriched = [];
  if (initial.length > 0) {
    const ids = initial.map((s) => s.id);
    const [{ data: listings }, { data: ratings }] = await Promise.all([
      supabase.from('listings').select('seller_id').eq('status', 'active').in('seller_id', ids),
      supabase.from('ratings').select('reviewee_id, rating').in('reviewee_id', ids),
    ]);
    enriched = enrichSellers(initial, listings, ratings);
  }

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        padding: '2rem',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <Link
          href="/"
          style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: '1.5rem',
          }}
        >
          ← Retour à l'accueil
        </Link>

        <h1
          style={{
            color: '#111827',
            fontSize: '2rem',
            fontWeight: 'bold',
            margin: '0 0 0.5rem 0',
          }}
        >
          Nos vendeurs
        </h1>
        <p
          style={{
            color: '#6b7280',
            fontSize: '0.95rem',
            margin: '0 0 2rem 0',
          }}
        >
          Découvrez tous les vendeurs présents sur Quicklot.
        </p>

        <VendeursGrid initialSellers={enriched} total={count ?? 0} />
      </div>
    </div>
  );
}
