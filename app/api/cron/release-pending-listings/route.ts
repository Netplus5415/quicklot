import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await supabaseAdmin
    .from("listings")
    .update({ status: "active", pending_until: null })
    .eq("status", "pending_payment")
    .lt("pending_until", new Date().toISOString())
    .select();

  if (error) {
    console.error("[cron/release-pending] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[cron/release-pending] released", data?.length ?? 0, "listing(s)");
  return NextResponse.json({ released: data?.length ?? 0 });
}
