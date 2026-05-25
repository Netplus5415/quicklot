"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { track, trackCustom } from "@/lib/meta-pixel";
import { CONSENT_EVENT, readConsent, type ConsentValue } from "@/lib/consent";

const FBQ_POLL_INTERVAL_MS = 200;
const FBQ_POLL_TIMEOUT_MS = 10_000;

export default function SignupTracker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (searchParams.get("welcome") !== "1") return;

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let pollDeadline: ReturnType<typeof setTimeout> | null = null;

    function stopPolling(): void {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (pollDeadline) {
        clearTimeout(pollDeadline);
        pollDeadline = null;
      }
    }

    function fire(): boolean {
      if (fired.current) return true;
      if (typeof window === "undefined" || !window.fbq) return false;
      fired.current = true;
      track("CompleteRegistration");
      trackCustom("SellerSignupCompleted");

      const next = new URLSearchParams(searchParams.toString());
      next.delete("welcome");
      const newUrl = next.toString()
        ? `${pathname}?${next.toString()}`
        : pathname;
      router.replace(newUrl);
      return true;
    }

    function attempt(): void {
      if (fired.current) return;
      if (readConsent() !== "granted") return;
      if (fire()) return;
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        if (fire()) stopPolling();
      }, FBQ_POLL_INTERVAL_MS);
      pollDeadline = setTimeout(stopPolling, FBQ_POLL_TIMEOUT_MS);
    }

    attempt();

    const onConsent = (e: Event) => {
      const detail = (e as CustomEvent<ConsentValue>).detail;
      if (detail === "granted") attempt();
    };
    window.addEventListener(CONSENT_EVENT, onConsent);

    return () => {
      window.removeEventListener(CONSENT_EVENT, onConsent);
      stopPolling();
    };
  }, [searchParams, pathname, router]);

  return null;
}
