"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export interface RatingModalProps {
  orderId: string;
  listingId: string | null;
  listingTitle: string;
  reviewerId: string;
  revieweeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RatingModal({
  orderId,
  listingId,
  listingTitle,
  reviewerId,
  revieweeId,
  onClose,
  onSuccess,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (rating === 0) {
      setError("Veuillez sélectionner une note.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const trimmed = comment.trim() || null;

    try {
      const { error: insertError } = await supabase.from("ratings").insert({
        order_id: orderId,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        listing_id: listingId,
        rating,
        comment: trimmed,
      });

      if (insertError) {
        if (insertError.message.includes("policy") || insertError.code === "42501") {
          setError("Vous ne pourrez laisser un avis qu'une fois la commande expédiée.");
        } else {
          setError(insertError.message);
        }
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      onSuccess();
    } catch {
      setError("Vous ne pourrez laisser un avis qu'une fois la commande expédiée.");
      setSubmitting(false);
    }
  }

  const active = hover || rating;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
      >
        <h2 className="mb-1 text-lg font-bold text-gray-900">Laisser un avis</h2>
        <p className="mb-5 truncate text-sm text-gray-500">{listingTitle}</p>

        {/* Étoiles */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Note</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                className="text-4xl leading-none transition-colors"
                style={{ color: n <= active ? "#FF7D07" : "#d1d5db" }}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Commentaire */}
        <div className="mb-3">
          <label htmlFor="rating-comment" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Commentaire (optionnel)
          </label>
          <textarea
            id="rating-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            rows={4}
            placeholder="Partagez votre expérience…"
            className="w-full resize-y rounded-lg border border-gray-300 p-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus-visible:ring-2 focus-visible:ring-[#FF7D07]"
          />
          <p className="mt-1 text-right text-xs text-gray-400">
            {500 - comment.length} caractères restants
          </p>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="rounded-lg bg-[#FF7D07] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e56c00] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting ? "Envoi…" : "Publier l'avis"}
          </button>
        </div>
      </div>
    </div>
  );
}
