import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader =
      request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ isAdmin: false });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ isAdmin: false });
    }

    const admin = await isAdminUser(supabaseAdmin, user.id);
    return NextResponse.json({ isAdmin: admin });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
