export const ATTRIBUTION_STORAGE_KEY = "quicklot_attribution";
export const ATTRIBUTION_COOKIE_NAME = "quicklot_attribution";

export type AttributionData = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_campaign_id?: string;
  utm_adset?: string;
  utm_adset_id?: string;
  utm_ad?: string;
  utm_ad_id?: string;
  utm_placement?: string;
  utm_id?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  landing_page?: string;
  referrer?: string;
  first_seen_at?: string;
  last_seen_at?: string;
};

export const ATTRIBUTION_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_campaign_id",
  "utm_adset",
  "utm_adset_id",
  "utm_ad",
  "utm_ad_id",
  "utm_placement",
  "utm_id",
  "utm_content",
  "utm_term",
  "fbclid",
] as const;

const MAX_VALUE_LENGTH = 500;
const MAX_URL_LENGTH = 1000;

function cleanValue(value: unknown, maxLength = MAX_VALUE_LENGTH): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

export function sanitizeAttribution(input: unknown): AttributionData | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const cleaned: AttributionData = {};

  for (const key of ATTRIBUTION_PARAM_KEYS) {
    const value = cleanValue(source[key]);
    if (value) cleaned[key] = value;
  }

  const landingPage = cleanValue(source.landing_page, MAX_URL_LENGTH);
  if (landingPage) cleaned.landing_page = landingPage;

  const referrer = cleanValue(source.referrer, MAX_URL_LENGTH);
  if (referrer) cleaned.referrer = referrer;

  const firstSeenAt = cleanValue(source.first_seen_at, 80);
  if (firstSeenAt) cleaned.first_seen_at = firstSeenAt;

  const lastSeenAt = cleanValue(source.last_seen_at, 80);
  if (lastSeenAt) cleaned.last_seen_at = lastSeenAt;

  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

export function readStoredAttribution(): AttributionData | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return stored ? sanitizeAttribution(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

export function buildAttributionFromLocation(
  location: Location,
  referrer: string,
  now = new Date()
): AttributionData | null {
  const params = new URLSearchParams(location.search);
  const attribution: AttributionData = {};

  for (const key of ATTRIBUTION_PARAM_KEYS) {
    const value = cleanValue(params.get(key));
    if (value) attribution[key] = value;
  }

  if (Object.keys(attribution).length === 0) return null;

  attribution.landing_page = cleanValue(location.href, MAX_URL_LENGTH);
  const cleanReferrer = cleanValue(referrer, MAX_URL_LENGTH);
  if (cleanReferrer) attribution.referrer = cleanReferrer;
  attribution.first_seen_at = now.toISOString();
  attribution.last_seen_at = now.toISOString();

  return attribution;
}

export function persistAttribution(attribution: AttributionData) {
  if (typeof window === "undefined") return;
  const sanitized = sanitizeAttribution(attribution);
  if (!sanitized) return;

  window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(sanitized));

  const maxAge = 60 * 60 * 24 * 90;
  document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(sanitized)
  )}; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure`;
}
