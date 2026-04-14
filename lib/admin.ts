import type { SupabaseClient } from "@supabase/supabase-js";

// Vérifie en base que l'utilisateur a le rôle admin.
// À utiliser côté serveur avec un client service-role pour bypasser les RLS.
export async function isAdminUser(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[admin] isAdminUser query error:", error);
    return false;
  }
  return (data as { role?: string | null } | null)?.role === "admin";
}

// Email utilisé comme destinataire des notifications admin.
// Ce n'est PAS un contrôle d'accès — l'auth doit passer par isAdminUser().
export const ADMIN_NOTIFY_EMAIL = "contact@quicklot.fr";
