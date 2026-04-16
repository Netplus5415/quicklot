import type { SupabaseClient } from "@supabase/supabase-js";

export async function isAdminUser(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[admin] isAdminUser query error:", error);
    return false;
  }
  return !!data;
}

export const ADMIN_NOTIFY_EMAIL = "contact@quicklot.fr";
