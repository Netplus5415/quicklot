import { NextRequest, NextResponse } from "next/server";
import {
  sendEmail,
  templateConfirmationAcheteur,
  templateNotificationVendeur,
  templateExpeditionAcheteur,
  templatePreparationAcheteur,
} from "@/lib/email";

export const dynamic = "force-dynamic";

type TemplateName =
  | "confirmation-acheteur"
  | "notification-vendeur"
  | "expedition-acheteur"
  | "preparation-acheteur";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, template, data, subject, htmlContent } = body as {
      to?: string;
      template?: TemplateName;
      data?: Record<string, unknown>;
      subject?: string;
      htmlContent?: string;
    };

    if (!to) {
      return NextResponse.json({ error: "to requis" }, { status: 400 });
    }

    let finalSubject = subject ?? "";
    let finalHtml = htmlContent ?? "";

    // Si un template est fourni, on génère subject + html côté serveur
    if (template) {
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
    }

    if (!finalSubject || !finalHtml) {
      return NextResponse.json(
        { error: "subject et htmlContent requis (ou template + data)" },
        { status: 400 }
      );
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
