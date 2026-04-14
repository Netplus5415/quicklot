import type { SupabaseClient } from "@supabase/supabase-js";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

// Rate limiter persistant basé sur une table Supabase `rate_limit_events`.
// Nécessite la table créée par la migration SQL dans scripts/sql/rate-limit.sql.
// En cas d'erreur de requête, on ne bloque pas (fail-open) pour éviter
// qu'une panne de Supabase casse tout le site.
export async function checkRateLimit(
  supabaseAdmin: SupabaseClient,
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const sinceIso = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await supabaseAdmin
    .from("rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", sinceIso);

  if (error) {
    console.error("[rate-limit] count error:", error);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if ((count ?? 0) >= maxRequests) {
    return { allowed: false, retryAfterSeconds: windowSeconds };
  }

  const { error: insertErr } = await supabaseAdmin
    .from("rate_limit_events")
    .insert({ key });
  if (insertErr) {
    console.error("[rate-limit] insert error:", insertErr);
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
