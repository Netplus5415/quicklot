"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/meta-pixel";

type Props = {
  value: number;
  currency: string;
  contentIds: string[];
  eventId: string;
};

export default function PurchaseTracker({
  value,
  currency,
  contentIds,
  eventId,
}: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    function fire(): boolean {
      if (typeof window === "undefined" || !window.fbq) return false;
      fired.current = true;
      track(
        "Purchase",
        {
          value,
          currency,
          content_ids: contentIds,
          content_type: "product",
        },
        { eventID: eventId }
      );
      return true;
    }

    if (fire()) return;

    const interval = setInterval(() => {
      if (fire()) clearInterval(interval);
    }, 300);
    const timeout = setTimeout(() => clearInterval(interval), 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [value, currency, contentIds, eventId]);

  return null;
}
