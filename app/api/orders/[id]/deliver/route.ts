import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Order id requis." }, { status: 400 });
    }

    // ── Auth Bearer ──
    const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      return NextResponse.json({ error: "Token invalide." }, { status: 401 });
    }

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    // ── Service role : lecture + update sans dépendre de la RLS ──
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, buyer_id, seller_id, seller_amount, statut, status")
      .eq("id", id)
      .maybeSingle();

    if (orderErr) {
      console.error("[orders/deliver] fetch error:", orderErr);
      return NextResponse.json({ error: orderErr.message }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    // Vérification : seul l'acheteur peut confirmer la réception
    if ((order as { buyer_id: string }).buyer_id !== user.id) {
      console.warn("[orders/deliver] non-buyer tried to confirm delivery", {
        orderId: id,
        user: user.id,
      });
      return NextResponse.json(
        { error: "Seul l'acheteur peut confirmer la réception." },
        { status: 403 }
      );
    }

    // Seules les commandes expédiées peuvent passer en delivered
    const currentStatut =
      (order as { statut?: string | null; status?: string | null }).statut ??
      (order as { statut?: string | null; status?: string | null }).status;
    if (currentStatut !== "shipped") {
      return NextResponse.json(
        { error: `Cette commande ne peut pas être confirmée (statut: ${currentStatut}).` },
        { status: 400 }
      );
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("orders")
      .update({ statut: "delivered" })
      .eq("id", id)
      .select();

    if (updateErr) {
      console.error("[orders/deliver] update error:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: "Aucune ligne modifiée." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[orders/deliver] exception:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
