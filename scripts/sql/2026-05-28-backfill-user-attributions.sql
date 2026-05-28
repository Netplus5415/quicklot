-- Manual idempotent backfill: populate public.user_attributions from
-- auth.users.raw_user_meta_data->'attribution' for users that already have
-- attribution metadata stored at signup but no row in user_attributions.
--
-- DO NOT RUN AUTOMATICALLY. Run manually after review.
-- This script is read-mostly: it only INSERTs missing rows. It NEVER updates
-- or deletes existing user_attributions rows, so first-touch attribution is
-- preserved.
--
-- Usage (Supabase SQL editor, with service-role/db owner privileges):
--   1) Run the SELECT preview block first to confirm row counts.
--   2) Run the INSERT block to backfill.
--   3) Run the verification SELECT to confirm.

-- ---------------------------------------------------------------------------
-- 1) Preview: which auth users have attribution metadata but no row yet?
-- ---------------------------------------------------------------------------
-- SELECT count(*) AS candidates
-- FROM auth.users au
-- LEFT JOIN public.user_attributions ua ON ua.user_id = au.id
-- WHERE ua.user_id IS NULL
--   AND jsonb_typeof(au.raw_user_meta_data->'attribution') = 'object'
--   AND au.raw_user_meta_data->'attribution' <> '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 2) Backfill (idempotent: ON CONFLICT DO NOTHING preserves first-touch).
-- ---------------------------------------------------------------------------
INSERT INTO public.user_attributions (
  user_id,
  email,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_campaign_id,
  utm_adset,
  utm_adset_id,
  utm_ad,
  utm_ad_id,
  utm_placement,
  utm_id,
  utm_content,
  utm_term,
  fbclid,
  landing_page,
  referrer,
  first_seen_at,
  last_seen_at
)
SELECT
  au.id,
  au.email,
  NULLIF(au.raw_user_meta_data->'attribution'->>'utm_source', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'utm_medium', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'utm_campaign', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'utm_campaign_id', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'utm_adset', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'utm_adset_id', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'utm_ad', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'utm_ad_id', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'utm_placement', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'utm_id', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'utm_content', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'utm_term', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'fbclid', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'landing_page', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'referrer', ''),
  NULLIF(au.raw_user_meta_data->'attribution'->>'first_seen_at', '')::timestamptz,
  NULLIF(au.raw_user_meta_data->'attribution'->>'last_seen_at', '')::timestamptz
FROM auth.users au
LEFT JOIN public.user_attributions ua ON ua.user_id = au.id
WHERE ua.user_id IS NULL
  AND jsonb_typeof(au.raw_user_meta_data->'attribution') = 'object'
  AND au.raw_user_meta_data->'attribution' <> '{}'::jsonb
  -- Require at least one identifying field so we don't insert empty rows.
  AND (
        (au.raw_user_meta_data->'attribution'->>'utm_source') IS NOT NULL
     OR (au.raw_user_meta_data->'attribution'->>'utm_medium') IS NOT NULL
     OR (au.raw_user_meta_data->'attribution'->>'utm_campaign') IS NOT NULL
     OR (au.raw_user_meta_data->'attribution'->>'fbclid') IS NOT NULL
     OR (au.raw_user_meta_data->'attribution'->>'landing_page') IS NOT NULL
     OR (au.raw_user_meta_data->'attribution'->>'referrer') IS NOT NULL
  )
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Verification: count rows backfilled (should be > 0 on first run, 0 on
-- subsequent reruns since ON CONFLICT DO NOTHING is idempotent).
-- ---------------------------------------------------------------------------
-- SELECT count(*) AS total_attributions FROM public.user_attributions;
-- SELECT user_id, utm_source, utm_campaign, landing_page, created_at
-- FROM public.user_attributions
-- ORDER BY created_at DESC
-- LIMIT 20;
