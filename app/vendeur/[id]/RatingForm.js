'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function RatingForm({ sellerId, sellerName }) {
  const [currentUser, setCurrentUser] = useState(undefined); // undefined = chargement
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [note, setNote] = useState(0);
  const [hoveredNote, setHoveredNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user && user.id !== sellerId) {
        const { data } = await supabase
          .from('ratings')
          .select('id')
          .eq('reviewee_id', sellerId)
          .eq('reviewer_id', user.id)
          .maybeSingle();
        setAlreadyRated(!!data);
      }
    }
    checkAuth();
  }, [sellerId]);

  // Chargement en cours
  if (currentUser === undefined) return null;

  // Non connecté
  if (!currentUser) return null;

  // Le vendeur lui-même
  if (currentUser.id === sellerId) return null;

  // Déjà noté
  if (alreadyRated) {
    return (
      <section style={{ borderTop: '1px solid #e5e7eb', paddingTop: '2rem', marginTop: '1rem' }}>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
          Vous avez déjà laissé un avis pour ce vendeur.
        </p>
      </section>
    );
  }

  if (submitted) {
    return (
      <section style={{ borderTop: '1px solid #e5e7eb', paddingTop: '2rem', marginTop: '1rem' }}>
        <p style={{ color: '#16a34a', fontSize: '0.95rem', margin: 0, fontWeight: '500' }}>
          Merci pour votre avis !
        </p>
      </section>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (note === 0) {
      setMessage({ text: 'Veuillez sélectionner une note.', error: true });
      return;
    }
    setSubmitting(true);
    setMessage(null);

    const trimmed = commentaire.trim() || null;
    const { error } = await supabase.from('ratings').insert({
      reviewer_id: currentUser.id,
      reviewee_id: sellerId,
      rating: note,
      comment: trimmed,
    });

    if (error) {
      setMessage({ text: error.message, error: true });
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  const activeNote = hoveredNote || note;

  return (
    <section style={{ borderTop: '1px solid #e5e7eb', paddingTop: '2rem', marginTop: '1rem' }}>
      <h2
        style={{
          color: '#111827',
          fontSize: '1.25rem',
          fontWeight: '600',
          margin: '0 0 1.25rem 0',
        }}
      >
        Laisser un avis pour {sellerName}
      </h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          maxWidth: '480px',
        }}
      >
        {/* Étoiles */}
        <div>
          <p
            style={{
              color: '#374151',
              fontSize: '0.875rem',
              margin: '0 0 0.5rem 0',
              fontWeight: '500',
            }}
          >
            Note *
          </p>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setNote(star)}
                onMouseEnter={() => setHoveredNote(star)}
                onMouseLeave={() => setHoveredNote(0)}
                aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '2rem',
                  padding: '0 0.1rem',
                  color: star <= activeNote ? '#FF7D07' : '#d1d5db',
                  lineHeight: 1,
                }}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Commentaire */}
        <div>
          <label
            htmlFor="commentaire"
            style={{
              display: 'block',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
            }}
          >
            Commentaire (optionnel)
          </label>
          <textarea
            id="commentaire"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows={4}
            placeholder="Partagez votre expérience avec ce vendeur…"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: '#111827',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'sans-serif',
              lineHeight: '1.5',
            }}
          />
        </div>

        {/* Message d'erreur */}
        {message && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              backgroundColor: message.error ? '#fef2f2' : '#f0fdf4',
              color: message.error ? '#dc2626' : '#16a34a',
              border: `1px solid ${message.error ? '#fca5a5' : '#86efac'}`,
            }}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || note === 0}
          style={{
            backgroundColor: submitting || note === 0 ? '#e5e7eb' : '#FF7D07',
            color: submitting || note === 0 ? '#9ca3af' : '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.5rem',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: submitting || note === 0 ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {submitting ? 'Envoi…' : 'Envoyer mon avis'}
        </button>
      </form>
    </section>
  );
}
