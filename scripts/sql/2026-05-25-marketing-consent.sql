-- ==========================================================================
-- 2026-05-25 — Consentement marketing email
-- ==========================================================================
-- À exécuter une seule fois dans Supabase SQL Editor AVANT le déploiement
-- du formulaire d'inscription avec opt-in marketing.
-- ==========================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_unsubscribed_at timestamptz;

CREATE INDEX IF NOT EXISTS users_marketing_opt_in_idx
  ON public.users (marketing_opt_in)
  WHERE marketing_opt_in = true;
