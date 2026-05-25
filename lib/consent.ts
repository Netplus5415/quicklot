export type ConsentValue = "granted" | "denied";

const COOKIE_NAME = "quicklot_consent";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 390;

export const CONSENT_EVENT = "quicklot:consent-changed";
export const CONSENT_OPEN_EVENT = "quicklot:consent-open";

export function openConsentBanner(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT));
}

export function readConsent(): ConsentValue | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )quicklot_consent=([^;]+)/);
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  return value === "granted" || value === "denied" ? value : null;
}

export function writeConsent(value: ConsentValue): void {
  if (typeof document === "undefined") return;
  const secure = process.env.NODE_ENV === "production" ? "; secure" : "";
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax${secure}`;
  window.dispatchEvent(new CustomEvent<ConsentValue>(CONSENT_EVENT, { detail: value }));
}
