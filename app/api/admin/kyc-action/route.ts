import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail, templateKycApprouve, templateKycRefuse } from "@/lib/email";

export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["approve", "reject"]),
  kyc_request_id: z.string().uuid(),
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

    const rl = await checkRateLimit(supabaseAdmin, `admin-kyc:${user.id}`, 60, 3600);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit atteint." }, { status: 429 });
    }

    const { data: kycReq, error: kycErr } = await supabaseAdmin
      .from("kyc_requests")
      .select("user_id")
      .eq("id", body.kyc_request_id)
      .single();

    if (kycErr || !kycReq) {
      return NextResponse.json({ error: "Demande KYC introuvable." }, { status: 404 });
    }

    const targetUserId = (kycReq as { user_id: string }).user_id;

    if (body.action === "approve") {
      const { error: e1 } = await supabaseAdmin
        .from("kyc_requests")
        .update({ statut: "approved", note_admin: null })
        .eq("id", body.kyc_request_id);
      if (e1) {
        console.error("[admin/kyc-action] approve kyc_requests error:", e1);
        return NextResponse.json({ error: e1.message }, { status: 500 });
      }

      const { error: e2 } = await supabaseAdmin
        .from("users")
        .update({ kyc_status: "verified" })
        .eq("id", targetUserId);
      if (e2) {
        console.error("[admin/kyc-action] approve users error:", e2);
        await supabaseAdmin
          .from("kyc_requests")
          .update({ statut: "pending" })
          .eq("id", body.kyc_request_id);
        return NextResponse.json({ error: e2.message }, { status: 500 });
      }

      try {
        const { data: u } = await supabaseAdmin
          .from("users")
          .select("email, prenom")
          .eq("id", targetUserId)
          .maybeSingle();
        if (u && (u as { email?: string }).email) {
          const { subject, html } = templateKycApprouve({
            prenom: (u as { prenom?: string | null }).prenom ?? null,
          });
          await sendEmail((u as { email: string }).email, subject, html);
        }
      } catch (err) {
        console.error("[admin/kyc-action] email error:", err);
      }
    } else {
      if (!body.note?.trim()) {
        return NextResponse.json({ error: "La raison du refus est obligatoire." }, { status: 400 });
      }

      const { error: e1 } = await supabaseAdmin
        .from("kyc_requests")
        .update({ statut: "rejected", note_admin: body.note.trim() })
        .eq("id", body.kyc_request_id);
      if (e1) {
        console.error("[admin/kyc-action] reject kyc_requests error:", e1);
        return NextResponse.json({ error: e1.message }, { status: 500 });
      }

      const { error: e2 } = await supabaseAdmin
        .from("users")
        .update({ kyc_status: "rejected" })
        .eq("id", targetUserId);
      if (e2) {
        console.error("[admin/kyc-action] reject users error:", e2);
      }

      try {
        const { data: u } = await supabaseAdmin
          .from("users")
          .select("email, prenom")
          .eq("id", targetUserId)
          .maybeSingle();
        if (u && (u as { email?: string }).email) {
          const { subject, html } = templateKycRefuse({
            prenom: (u as { prenom?: string | null }).prenom ?? null,
            raison: body.note!.trim(),
          });
          await sendEmail((u as { email: string }).email, subject, html);
        }
      } catch (err) {
        console.error("[admin/kyc-action] email error:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[admin/kyc-action] exception:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
