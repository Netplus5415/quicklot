"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleConfirm() {
      const code = searchParams.get("code");

      if (!code) {
        router.replace("/connexion?error=missing_code");
        return;
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.user) {
        router.replace("/connexion?error=auth_failed");
        return;
      }

      const { user } = data;

      if (user.email === "contact@universpieds.fr") {
        router.replace("/admin");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "seller") {
        router.replace("/dashboard");
      } else if (profile?.role === "buyer") {
        router.replace("/dashboard/acheteur");
      } else {
        router.replace("/boutique");
      }
    }

    handleConfirm();
  }, [router, searchParams]);

  return (
    <div
      style={{
        backgroundColor: "#000",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
      }}
    >
      <p style={{ color: "#6b7280" }}>Confirmation en cours…</p>
    </div>
  );
}

export default function AuthConfirm() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            backgroundColor: "#000",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "sans-serif",
          }}
        >
          <p style={{ color: "#6b7280" }}>Chargement…</p>
        </div>
      }
    >
      <AuthConfirmInner />
    </Suspense>
  );
}
