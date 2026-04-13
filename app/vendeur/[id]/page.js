import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import RatingForm from './RatingForm';
import { computeRatingStats, ratingValue, ratingComment, ratingReviewerName, renderStarsString } from '@/lib/ratings';
import { Badge, Card, PageContainer } from '@/components/ui';

export default async function VendeurProfile({ params }) {
  const { id } = await params;

  const { data: vendeurArr, error: vendeurError } = await supabase
    .from('users')
    .select('id, pseudo, bio, ville, avatar_url, prenom, created_at, role, kyc_status')
    .eq('id', id);

  if (vendeurError) console.error('[vendeur page] query error:', vendeurError);
  console.log('[vendeur page] id:', id, 'result:', vendeurArr);

  const vendeur = vendeurArr?.[0] ?? null;

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

  const { avg: ratingAvg, count: ratingCount } = computeRatingStats(ratings);

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
    <PageContainer background="white" maxWidth="lg">
      <Link
        href="/vendeurs"
        className="mb-6 inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        ← Retour aux vendeurs
      </Link>

      {!vendeur && (
        <div className="mb-6 rounded-[4px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
          <p className="mb-1 font-semibold">Profil non disponible</p>
          <p className="text-xs text-red-800">
            Impossible de récupérer les informations de ce vendeur. Les lots et avis sont toutefois visibles ci-dessous.
          </p>
        </div>
      )}

      <div className="mb-10 flex flex-wrap items-start gap-6">
        {vendeur?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vendeur.avatar_url}
            alt={displayName}
            className="h-[100px] w-[100px] flex-shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-[100px] w-[100px] flex-shrink-0 items-center justify-center rounded-full bg-[#FF7D07]">
            <span className="text-4xl font-bold text-white">{initiale}</span>
          </div>
        )}

        <div className="min-w-[200px] flex-1">
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Nom de l&apos;entreprise
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              {vendeur?.kyc_status === 'verified' && (
                <Badge variant="verified">✓ Vendeur vérifié</Badge>
              )}
            </div>
          </div>

          {vendeur?.bio && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Description
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {vendeur.bio}
              </p>
            </div>
          )}

          {vendeur?.ville && (
            <p className="mb-3 text-sm text-gray-500">📍 {vendeur.ville}</p>
          )}

          <div className="flex flex-wrap gap-6">
            {membreDepuis && (
              <span className="text-sm text-gray-500">Membre depuis {membreDepuis}</span>
            )}
            <span className="text-sm text-gray-500">
              {activeCount} lot{activeCount !== 1 ? 's' : ''} actif{activeCount !== 1 ? 's' : ''}
            </span>
            {ratingAvg !== null && (
              <span className="text-sm text-gray-500">
                <span className="text-[#FF7D07]">
                  {'★'.repeat(Math.round(ratingAvg))}
                  {'☆'.repeat(5 - Math.round(ratingAvg))}
                </span>{' '}
                {ratingAvg.toFixed(1)} ({ratingCount} avis)
              </span>
            )}
          </div>
        </div>
      </div>

      {activeCount > 0 && (
        <section className="mb-12">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">Lots en vente</h2>
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
            {listings.map((listing) => (
              <Card key={listing.id} padding="none" className="flex flex-col overflow-hidden bg-gray-50">
                {listing.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
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
                    <div className="mb-3">
                      <Badge variant="neutral">{listing.type}</Badge>
                    </div>
                    <h3 className="mb-2 text-base font-semibold text-gray-900">
                      {listing.titre}
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-500">
                      {listing.description?.length > 50
                        ? listing.description.slice(0, 50) + '…'
                        : listing.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-gray-900">
                      {listing.prix.toFixed(2)} €
                    </span>
                    <Link
                      href={`/boutique/${listing.id}`}
                      className="rounded-[4px] bg-[#FF7D07] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e56c00]"
                    >
                      Voir
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {ratingCount > 0 && (
        <section className="mb-12">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">Derniers avis</h2>
          <div className="flex flex-col gap-3">
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
                <Card key={r.id} padding="md" className="px-5 py-4">
                  <div
                    className={`flex flex-wrap items-center justify-between gap-3 ${cmt ? 'mb-2' : ''}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base tracking-widest text-[#FF7D07]">
                        {renderStarsString(val)}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{reviewer}</span>
                    </div>
                    <span className="text-[0.7rem] uppercase tracking-wide text-gray-400">
                      {date}
                    </span>
                  </div>
                  {cmt && (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                      {cmt}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <RatingForm sellerId={id} sellerName={displayName} />
    </PageContainer>
  );
}
