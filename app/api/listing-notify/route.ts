import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendEmail,
  templateNouveauListingAdmin,
  templateListingApprouve,
  templateListingRefuse,
} from "@/lib/email";
import { isAdminUser, ADMIN_NOTIFY_EMAIL } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Action = "new" | "approved" | "rejected";

export async function POST(request: NextRequest) {
  try {
    // Auth token
    const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    const accessToken = authHeader.slice(7).trim();

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user: authUser }, error: authError } = await supabaseAnon.auth.getUser(accessToken);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    const body = (await request.json()) as {
      action?: Action;
      listingId?: string;
      raison?: string | null;
    };

    if (!body.listingId || !body.action) {
      return NextResponse.json(
        { error: "listingId et action requis." },
        { status: 400 }
      );
    }
    if (!["new", "approved", "rejected"].includes(body.action)) {
      return NextResponse.json({ error: "action invalide." }, { status: 400 });
    }

    // Service role pour lire listing + seller
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("id, titre, description, prix, seller_id")
      .eq("id", body.listingId)
      .maybeSingle();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Listing introuvable." }, { status: 404 });
    }

    const { data: seller } = await supabaseAdmin
      .from("users")
      .select("email, prenom, pseudo")
      .eq("id", (listing as { seller_id: string }).seller_id)
      .maybeSingle();

    if (body.action === "new") {
      // Seul le vendeur du listing peut déclencher cette notif
      if (authUser.id !== (listing as { seller_id: string }).seller_id) {
        return NextResponse.json({ error: "Vous n'êtes pas le vendeur de ce listing." }, { status: 403 });
      }

      const { subject, html } = templateNouveauListingAdmin({
        listingId: (listing as { id: string }).id,
        titre: (listing as { titre: string }).titre,
        description: (listing as { description: string }).description ?? "",
        prix: Number((listing as { prix: number }).prix ?? 0),
        sellerName: (seller as { pseudo?: string | null; prenom?: string | null } | null)?.pseudo
          ?? (seller as { pseudo?: string | null; prenom?: string | null } | null)?.prenom
          ?? null,
        sellerEmail: (seller as { email?: string } | null)?.email ?? null,
      });

      const r = await sendEmail(ADMIN_NOTIFY_EMAIL, subject, html);
      if (!r.ok) return NextResponse.json({ error: r.error ?? "Envoi échoué" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // approved / rejected : admin seulement
    const admin = await isAdminUser(supabaseAdmin, authUser.id);
    if (!admin) {
      return NextResponse.json({ error: "Accès réservé à l'administrateur." }, { status: 403 });
    }

    if (!seller || !(seller as { email?: string }).email) {
      return NextResponse.json({ error: "Vendeur introuvable." }, { status: 404 });
    }

    if (body.action === "approved") {
      const { subject, html } = templateListingApprouve({
        prenom: (seller as { prenom?: string | null }).prenom ?? null,
        titre: (listing as { titre: string }).titre,
        listingId: (listing as { id: string }).id,
      });
      const r = await sendEmail((seller as { email: string }).email, subject, html);
      if (!r.ok) return NextResponse.json({ error: r.error ?? "Envoi échoué" }, { status: 500 });
    } else {
      const { subject, html } = templateListingRefuse({
        prenom: (seller as { prenom?: string | null }).prenom ?? null,
        titre: (listing as { titre: string }).titre,
        raison: body.raison ?? null,
      });
      const r = await sendEmail((seller as { email: string }).email, subject, html);
      if (!r.ok) return NextResponse.json({ error: r.error ?? "Envoi échoué" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[listing-notify] exception:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
