-- Store first-touch marketing attribution for signups.
-- Written by the app with the service role from /api/users/setup and /auth/callback.

CREATE TABLE IF NOT EXISTS public.user_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_campaign_id text,
  utm_adset text,
  utm_adset_id text,
  utm_ad text,
  utm_ad_id text,
  utm_placement text,
  utm_id text,
  utm_content text,
  utm_term text,
  fbclid text,
  landing_page text,
  referrer text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_attributions_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS user_attributions_utm_source_idx
  ON public.user_attributions (utm_source);

CREATE INDEX IF NOT EXISTS user_attributions_created_at_idx
  ON public.user_attributions (created_at DESC);

ALTER TABLE public.user_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own attribution" ON public.user_attributions;
CREATE POLICY "Users can read own attribution"
  ON public.user_attributions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_user_attributions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_user_attributions_updated_at ON public.user_attributions;
CREATE TRIGGER set_user_attributions_updated_at
  BEFORE UPDATE ON public.user_attributions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_attributions_updated_at();
