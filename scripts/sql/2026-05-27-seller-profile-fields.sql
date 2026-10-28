-- ==========================================================================
-- 2026-05-27 — Migration douce du flow vendeur :
-- séparer les infos vendeur (texte) du KYC documentaire (justificatif + ID).
-- ==========================================================================
-- Objectif :
--  - Permettre d'enregistrer les coordonnées entreprise sans documents.
--  - Garder kyc_status comme badge facultatif "Vendeur vérifié Quicklot".
--  - Ne rien supprimer (kyc_requests, kyc_status, endpoints admin restent).
--
-- À exécuter une seule fois dans Supabase SQL Editor.
-- Toutes les opérations sont idempotentes (IF NOT EXISTS, COALESCE...).
-- ==========================================================================

-- 1) Nouveaux champs vendeur sur public.users
--    (nom_entreprise, bio, ville existent déjà — on n'y touche pas.)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS numero_entreprise text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS adresse text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS code_postal text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pays text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS seller_profile_completed_at timestamptz;

-- 2) Backfill rétrocompatible depuis kyc_requests
--    Pour les anciens vendeurs ayant déjà soumis un KYC,
--    on récupère leurs coordonnées entreprise dans users si vides.
UPDATE public.users u
   SET numero_entreprise = COALESCE(u.numero_entreprise, k.numero_entreprise),
       adresse           = COALESCE(u.adresse,           k.adresse),
       code_postal       = COALESCE(u.code_postal,       k.code_postal),
       pays              = COALESCE(u.pays,              k.pays),
       ville             = COALESCE(u.ville,             k.ville_kyc),
       nom_entreprise    = COALESCE(u.nom_entreprise,    k.nom_entreprise)
  FROM public.kyc_requests k
 WHERE k.user_id = u.id
   AND (
        u.numero_entreprise IS NULL OR
        u.adresse           IS NULL OR
        u.code_postal       IS NULL OR
        u.pays              IS NULL OR
        u.ville             IS NULL OR
        u.nom_entreprise    IS NULL
   );

-- 3) Marquer les anciens vendeurs "avancés" comme profil complété.
--    Critère : kyc_status='verified' OU stripe_account_status='active'.
--    On évite de les forcer à re-remplir leur profil.
UPDATE public.users
   SET seller_profile_completed_at = COALESCE(seller_profile_completed_at, now())
 WHERE seller_profile_completed_at IS NULL
   AND (kyc_status = 'verified' OR stripe_account_status = 'active');
