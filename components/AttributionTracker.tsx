"use client";

import { useEffect } from "react";
import {
  buildAttributionFromLocation,
  persistAttribution,
  readStoredAttribution,
  sanitizeAttribution,
} from "@/lib/attribution";

export default function AttributionTracker() {
  useEffect(() => {
    const current = buildAttributionFromLocation(window.location, document.referrer);
    if (!current) return;

    const stored = readStoredAttribution();
    const attribution = sanitizeAttribution({
      ...current,
      ...stored,
      last_seen_at: current.last_seen_at,
    });

    if (attribution) persistAttribution(attribution);
  }, []);

  return null;
}
