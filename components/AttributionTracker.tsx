"use client";

import { useEffect } from "react";
import {
  buildAttributionFromLocation,
  mergeAttributionFirstTouch,
  persistAttribution,
  readStoredAttribution,
} from "@/lib/attribution";

export default function AttributionTracker() {
  useEffect(() => {
    const current = buildAttributionFromLocation(window.location, document.referrer);
    if (!current) return;

    const stored = readStoredAttribution();
    persistAttribution(mergeAttributionFirstTouch(current, stored));
  }, []);

  return null;
}
