import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendEmail,
  templateConfirmationAcheteur,
  templateNotificationVendeur,
  templateExpeditionAcheteur,
  templatePreparationAcheteur,
} from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type TemplateName =
  | "confirmation-acheteur"
  | "notification-vendeur"
  | "expedition-acheteur"
  | "preparation-acheteur";

// Seuls les templates nommés sont acceptés côté client : on interdit
// l'envoi d'un HTML brut arbitraire pour empêcher l'utilisation de cette
// route comme relais de spam / phishing.
export async function POST(request: NextRequest) {
  try {
    // ── Auth obligatoire ──
    const authHeader =
      request.headers.get("authorization") ??
      request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    const accessToken = authHeader.slice(7).trim();
    if (!accessToken) {
      return NextResponse.json({ error: "Token invalide." }, { status: 401 });
    }

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user: authUser }, error: authError } = await supabaseAnon.auth.getUser(accessToken);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Rate limit : 15 emails par minute par utilisateur
    const rl = await checkRateLimit(supabaseAdmin, `send-email:${authUser.id}`, 15, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez plus tard." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { to, template, data } = body as {
      to?: string;
      template?: TemplateName;
      data?: Record<string, unknown>;
    };

    if (!to) {
      return NextResponse.json({ error: "to requis" }, { status: 400 });
    }
    if (!template) {
      return NextResponse.json(
        { error: "template requis — HTML brut non accepté." },
        { status: 400 }
      );
    }

    let finalSubject = "";
    let finalHtml = "";

    const payload = (data ?? {}) as unknown;
    switch (template) {
      case "confirmation-acheteur": {
        const r = templateConfirmationAcheteur(payload as Parameters<typeof templateConfirmationAcheteur>[0]);
        finalSubject = r.subject;
        finalHtml = r.html;
        break;
      }
      case "notification-vendeur": {
        const r = templateNotificationVendeur(payload as Parameters<typeof templateNotificationVendeur>[0]);
        finalSubject = r.subject;
        finalHtml = r.html;
        break;
      }
      case "expedition-acheteur": {
        const r = templateExpeditionAcheteur(payload as Parameters<typeof templateExpeditionAcheteur>[0]);
        finalSubject = r.subject;
        finalHtml = r.html;
        break;
      }
      case "preparation-acheteur": {
        const r = templatePreparationAcheteur(payload as Parameters<typeof templatePreparationAcheteur>[0]);
        finalSubject = r.subject;
        finalHtml = r.html;
        break;
      }
      default:
        return NextResponse.json({ error: "template inconnu" }, { status: 400 });
    }

    const result = await sendEmail(to, finalSubject, finalHtml);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "erreur envoi" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[send-email] exception:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
