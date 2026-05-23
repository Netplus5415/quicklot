declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
    };
    _fbq?: unknown;
  }
}

export type StandardEvent =
  | "PageView"
  | "ViewContent"
  | "Search"
  | "AddToCart"
  | "AddToWishlist"
  | "InitiateCheckout"
  | "Purchase"
  | "Lead"
  | "CompleteRegistration";

export type EventParams = {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_name?: string;
  content_category?: string;
  content_type?: "product" | "product_group";
  search_string?: string;
  num_items?: number;
  [key: string]: unknown;
};

export type TrackOptions = { eventID?: string };

export function track(
  event: StandardEvent,
  params?: EventParams,
  options?: TrackOptions
): void {
  if (typeof window === "undefined" || !window.fbq) return;
  if (options?.eventID) {
    window.fbq("track", event, params ?? {}, { eventID: options.eventID });
  } else if (params) {
    window.fbq("track", event, params);
  } else {
    window.fbq("track", event);
  }
}

export function trackCustom(
  event: string,
  params?: EventParams,
  options?: TrackOptions
): void {
  if (typeof window === "undefined" || !window.fbq) return;
  if (options?.eventID) {
    window.fbq("trackCustom", event, params ?? {}, { eventID: options.eventID });
  } else if (params) {
    window.fbq("trackCustom", event, params);
  } else {
    window.fbq("trackCustom", event);
  }
}
