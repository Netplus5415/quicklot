-- ==========================================================================
-- 2026-04-16 — Phase 3 : cycle de vie paiement + race condition listing
-- ==========================================================================
-- A executer dans Supabase SQL Editor AVANT le deploiement du code Phase 3.
-- ==========================================================================

-- 1) Colonne stripe_payment_intent sur orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent text;
CREATE INDEX IF NOT EXISTS orders_stripe_payment_intent_idx ON orders(stripe_payment_intent);

-- 2) Etendre le CHECK sur listings.status pour autoriser pending_payment
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft','pending_review','active','pending_payment','sold','removed','rejected'));

-- 3) Colonne pending_until pour le verrou temporaire
ALTER TABLE listings ADD COLUMN IF NOT EXISTS pending_until timestamptz;

-- 4) Verifier que le trigger listings_protect_status autorise service_role
--    Si le trigger existe, on le recree pour inclure le bypass service_role.
--    Si vous n'avez pas ce trigger, ignorez cette section.
CREATE OR REPLACE FUNCTION listings_protect_status_fn()
RETURNS trigger AS $$
BEGIN
  -- Le service_role (webhooks, API serveur) peut faire toutes les transitions
  IF current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Les utilisateurs normaux ne peuvent passer qu'en draft ou removed
  IF NEW.status NOT IN ('draft', 'removed') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Transition de statut non autorisee pour cet utilisateur';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS listings_protect_status ON listings;
CREATE TRIGGER listings_protect_status
  BEFORE UPDATE OF status ON listings
  FOR EACH ROW
  EXECUTE FUNCTION listings_protect_status_fn();
