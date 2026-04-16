import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail, templateListingApprouve, templateListingRefuse } from "@/lib/email";

export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["approve", "reject", "remove"]),
  listing_id: z.string().uuid(),
  note: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
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

    const body = Body.parse(await request.json());

    const rl = await checkRateLimit(supabaseAdmin, `admin-listing:${user.id}`, 60, 3600);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit atteint." }, { status: 429 });
    }

    const { data: listing, error: listingErr } = await supabaseAdmin
      .from("listings")
      .select("id, seller_id, titre")
      .eq("id", body.listing_id)
      .single();

    if (listingErr || !listing) {
      return NextResponse.json({ error: "Listing introuvable." }, { status: 404 });
    }

    const sellerId = (listing as { seller_id: string }).seller_id;
    const titre = (listing as { titre: string }).titre;

    if (body.action === "approve") {
      const { error } = await supabaseAdmin
        .from("listings")
        .update({ status: "active", moderation_note: null })
        .eq("id", body.listing_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      try {
        const { data: seller } = await supabaseAdmin
          .from("users")
          .select("email, prenom")
          .eq("id", sellerId)
          .maybeSingle();
        if (seller && (seller as { email?: string }).email) {
          const { subject, html } = templateListingApprouve({
            prenom: (seller as { prenom?: string | null }).prenom ?? null,
            titre,
            listingId: body.listing_id,
          });
          await sendEmail((seller as { email: string }).email, subject, html);
        }
      } catch (err) {
        console.error("[admin/listing-action] email error:", err);
      }
    } else if (body.action === "reject") {
      if (!body.note?.trim()) {
        return NextResponse.json({ error: "La raison du refus est obligatoire." }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from("listings")
        .update({ status: "rejected", moderation_note: body.note.trim() })
        .eq("id", body.listing_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      try {
        const { data: seller } = await supabaseAdmin
          .from("users")
          .select("email, prenom")
          .eq("id", sellerId)
          .maybeSingle();
        if (seller && (seller as { email?: string }).email) {
          const { subject, html } = templateListingRefuse({
            prenom: (seller as { prenom?: string | null }).prenom ?? null,
            titre,
            raison: body.note!.trim(),
          });
          await sendEmail((seller as { email: string }).email, subject, html);
        }
      } catch (err) {
        console.error("[admin/listing-action] email error:", err);
      }
    } else {
      const { error } = await supabaseAdmin
        .from("listings")
        .update({ status: "removed" })
        .eq("id", body.listing_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[admin/listing-action] exception:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
