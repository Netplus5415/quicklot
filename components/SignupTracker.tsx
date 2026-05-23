"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { track, trackCustom } from "@/lib/meta-pixel";

export default function SignupTracker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (searchParams.get("welcome") !== "1") return;

    function fire(): boolean {
      if (typeof window === "undefined" || !window.fbq) return false;
      fired.current = true;
      track("CompleteRegistration");
      trackCustom("SellerSignupCompleted");

      const next = new URLSearchParams(searchParams.toString());
      next.delete("welcome");
      const newUrl = next.toString() ? `${pathname}?${next.toString()}` : pathname;
      router.replace(newUrl);
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
  }, [searchParams, pathname, router]);

  return null;
}
