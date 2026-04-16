import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader =
      request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Token invalide." }, { status: 401 });
    }
    if (!(await isAdminUser(supabaseAdmin, user.id))) {
      return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
    }

    const path = request.nextUrl.searchParams.get("path");
    if (!path) {
      return NextResponse.json({ error: "Paramètre path requis." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.storage
      .from("kyc-documents")
      .createSignedUrl(path, 60);

    if (error || !data) {
      console.error("[admin/kyc-document] signed URL error:", error);
      return NextResponse.json({ error: "Impossible de générer l'URL." }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[admin/kyc-document] exception:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
