-- ==========================================================================
-- 2026-04-14 — Sécurité : rôle admin + rate limiting
-- ==========================================================================
-- À exécuter une seule fois dans Supabase SQL Editor.
-- ==========================================================================

-- 1) Colonne role sur public.users (si elle n'existe pas déjà)
--    (le code utilise déjà les valeurs 'seller' / 'buyer')
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- 2) Attribuer le rôle admin au compte de contact
UPDATE public.users
   SET role = 'admin'
 WHERE email = 'contact@quicklot.fr';

-- 3) Table pour le rate limiting persistant
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_events_key_created_idx
  ON public.rate_limit_events (key, created_at DESC);

-- Optionnel : cron de nettoyage des événements > 24h
-- (peut être implémenté via pg_cron ou un job côté app)
-- DELETE FROM public.rate_limit_events WHERE created_at < now() - interval '24 hours';

-- 4) (Optionnel mais recommandé) Mettre à jour les policies RLS qui
--    utilisaient `auth.jwt() ->> 'email' = 'contact@quicklot.fr'` pour
--    les remplacer par un check basé sur le rôle.
--
--    Exemple — à adapter table par table dans Supabase Studio :
--
--    DROP POLICY IF EXISTS "admin_all" ON public.disputes;
--    CREATE POLICY "admin_all" ON public.disputes
--      FOR ALL
--      USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' )
--      WITH CHECK ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' );
