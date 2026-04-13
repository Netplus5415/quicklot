import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import RatingForm from './RatingForm';
import { computeRatingStats, ratingValue, ratingComment, ratingReviewerName, renderStarsString } from '@/lib/ratings';

export default async function VendeurProfile({ params }) {
  const { id } = await params;

  // Query vendeur isolée (debug)
  const { data: vendeurArr, error: vendeurError } = await supabase
    .from('users')
    .select('id, pseudo, bio, ville, avatar_url, prenom, created_at, role, kyc_status')
    .eq('id', id);

  if (vendeurError) console.error('[vendeur page] query error:', vendeurError);
  console.log('[vendeur page] id:', id, 'result:', vendeurArr);

  const vendeur = vendeurArr?.[0] ?? null;

  // Listings + ratings en parallèle (inchangé)
  const [listingsRes, ratingsRes] = await Promise.all([
    supabase
      .from('listings')
      .select('id, titre, description, type, prix, photo_url')
      .eq('seller_id', id)
      .eq('status', 'active'),
    supabase
      .from('ratings')
      .select('id, score, rating, commentaire, comment, created_at, reviewer:reviewer_id (pseudo, prenom), buyer:buyer_id (pseudo, prenom)')
      .or(`seller_id.eq.${id},reviewee_id.eq.${id}`)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const listings = listingsRes.data;
  const ratings = ratingsRes.data ?? [];

  // Stats ratings (helper : gère rating + score)
  const { avg: ratingAvg, count: ratingCount } = computeRatingStats(ratings);

  // Date formatée en français (fallback si pas de profil)
  const membreDepuis = vendeur?.created_at
    ? new Date(vendeur.created_at).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  const displayName = vendeur?.pseudo ?? vendeur?.prenom ?? 'Vendeur';
  const initiale = displayName.charAt(0).toUpperCase();
  const activeCount = listings?.length ?? 0;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        padding: '2rem',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link
          href="/vendeurs"
          style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: '1.5rem',
          }}
        >
          ← Retour aux vendeurs
        </Link>

        {/* Bannière d'erreur si profil introuvable */}
        {!vendeur && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fca5a5',
              color: '#dc2626',
              padding: '1rem 1.25rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
            }}
          >
            <p style={{ margin: '0 0 0.35rem 0', fontWeight: '600' }}>
              Profil non disponible
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#991b1b' }}>
              Impossible de récupérer les informations de ce vendeur. Les lots et avis sont toutefois visibles ci-dessous.
            </p>
          </div>
        )}

        {/* En-tête vendeur */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1.5rem',
            marginBottom: '2.5rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Avatar */}
          {vendeur?.avatar_url ? (
            <img
              src={vendeur.avatar_url}
              alt={displayName}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: '#FF7D07',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 'bold' }}>
                {initiale}
              </span>
            </div>
          )}

          <div style={{ flex: 1, minWidth: '200px' }}>
            {/* Nom de l'entreprise + badge */}
            <div style={{ marginBottom: '1rem' }}>
              <p
                style={{
                  color: '#6b7280',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: '0 0 0.25rem 0',
                }}
              >
                Nom de l&apos;entreprise
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <h1
                  style={{
                    color: '#111827',
                    fontSize: '1.75rem',
                    fontWeight: 'bold',
                    margin: 0,
                  }}
                >
                  {displayName}
                </h1>
                {vendeur?.kyc_status === 'verified' && (
                  <span
                    style={{
                      backgroundColor: '#FF7D07',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '999px',
                    }}
                  >
                    ✓ Vendeur vérifié
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {vendeur?.bio && (
              <div style={{ marginBottom: '0.75rem' }}>
                <p
                  style={{
                    color: '#6b7280',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0 0 0.25rem 0',
                  }}
                >
                  Description
                </p>
                <p
                  style={{
                    color: '#374151',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {vendeur.bio}
                </p>
              </div>
            )}

            {/* Ville */}
            {vendeur?.ville && (
              <p
                style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  margin: '0 0 0.75rem 0',
                }}
              >
                📍 {vendeur.ville}
              </p>
            )}

            {/* Méta */}
            <div
              style={{
                display: 'flex',
                gap: '1.5rem',
                flexWrap: 'wrap',
              }}
            >
              {membreDepuis && (
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  Membre depuis {membreDepuis}
                </span>
              )}
              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {activeCount} lot{activeCount !== 1 ? 's' : ''} actif{activeCount !== 1 ? 's' : ''}
              </span>
              {ratingAvg !== null && (
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  {'★'.repeat(Math.round(ratingAvg))}
                  {'☆'.repeat(5 - Math.round(ratingAvg))}{' '}
                  {ratingAvg.toFixed(1)} ({ratingCount} avis)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Listings actifs */}
        {activeCount > 0 && (
          <section style={{ marginBottom: '3rem' }}>
            <h2
              style={{
                color: '#111827',
                fontSize: '1.25rem',
                fontWeight: '600',
                margin: '0 0 1.25rem 0',
              }}
            >
              Lots en vente
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {listing.photo_url ? (
                    <img
                      src={listing.photo_url}
                      alt={listing.titre}
                      style={{
                        width: '100%',
                        height: '180px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '180px',
                        backgroundColor: '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                        Pas de photo
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      flex: 1,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#e5e7eb',
                          color: '#6b7280',
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px',
                          marginBottom: '0.75rem',
                        }}
                      >
                        {listing.type}
                      </span>
                      <h3
                        style={{
                          color: '#111827',
                          fontSize: '1rem',
                          fontWeight: '600',
                          margin: '0 0 0.5rem 0',
                        }}
                      >
                        {listing.titre}
                      </h3>
                      <p
                        style={{
                          color: '#6b7280',
                          fontSize: '0.875rem',
                          margin: 0,
                          lineHeight: '1.5',
                        }}
                      >
                        {listing.description?.length > 50
                          ? listing.description.slice(0, 50) + '…'
                          : listing.description}
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span
                        style={{
                          color: '#111827',
                          fontSize: '1.25rem',
                          fontWeight: 'bold',
                        }}
                      >
                        {listing.prix.toFixed(2)} €
                      </span>
                      <Link
                        href={`/boutique/${listing.id}`}
                        style={{
                          backgroundColor: '#FF7D07',
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '0.5rem 1.1rem',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                        }}
                      >
                        Voir
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Derniers avis */}
        {ratingCount > 0 && (
          <section style={{ marginBottom: '3rem' }}>
            <h2
              style={{
                color: '#111827',
                fontSize: '1.25rem',
                fontWeight: '600',
                margin: '0 0 1.25rem 0',
              }}
            >
              Derniers avis
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {ratings.map((r) => {
                const val = ratingValue(r) ?? 0;
                const cmt = ratingComment(r);
                const reviewer = ratingReviewerName(r);
                const date = r.created_at
                  ? new Date(r.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '';
                return (
                  <div
                    key={r.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '1rem 1.25rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        marginBottom: cmt ? '0.5rem' : 0,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={{ color: '#FF7D07', fontSize: '1rem', letterSpacing: '0.1em' }}>
                          {renderStarsString(val)}
                        </span>
                        <span style={{ color: '#111827', fontSize: '0.9rem', fontWeight: '600' }}>
                          {reviewer}
                        </span>
                      </div>
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{date}</span>
                    </div>
                    {cmt && (
                      <p
                        style={{
                          margin: 0,
                          color: '#374151',
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {cmt}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Formulaire de rating (Client Component) */}
        <RatingForm sellerId={id} sellerName={displayName} />
      </div>
    </div>
  );
}
