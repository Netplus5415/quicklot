import crypto from "crypto";

const BREVO_API = "https://api.brevo.com/v3";

function brevoEnv(): { apiKey: string; listId: number } | null {
  const apiKey = process.env.BREVO_API_KEY;
  const listIdRaw = process.env.BREVO_MARKETING_LIST_ID;
  if (!apiKey || !listIdRaw) {
    console.error("[brevo-contacts] BREVO_API_KEY ou BREVO_MARKETING_LIST_ID non configuré");
    return null;
  }
  const listId = Number.parseInt(listIdRaw, 10);
  if (!Number.isFinite(listId) || listId <= 0) {
    console.error("[brevo-contacts] BREVO_MARKETING_LIST_ID invalide:", listIdRaw);
    return null;
  }
  return { apiKey, listId };
}

export async function addToMarketingList(
  email: string,
  prenom?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const env = brevoEnv();
  if (!env) return { ok: false, error: "Brevo non configuré" };

  try {
    const res = await fetch(`${BREVO_API}/contacts`, {
      method: "POST",
      headers: {
        "api-key": env.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        attributes: prenom ? { PRENOM: prenom } : undefined,
        listIds: [env.listId],
        updateEnabled: true,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[brevo-contacts] add failed:", res.status, text);
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[brevo-contacts] add exception:", msg);
    return { ok: false, error: msg };
  }
}

export async function removeFromMarketingList(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const env = brevoEnv();
  if (!env) return { ok: false, error: "Brevo non configuré" };

  try {
    const res = await fetch(
      `${BREVO_API}/contacts/lists/${env.listId}/contacts/remove`,
      {
        method: "POST",
        headers: {
          "api-key": env.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ emails: [email] }),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      // 400 "Contact already removed from list" peut arriver — on traite comme succès
      if (res.status === 400 && /already/i.test(text)) {
        return { ok: true };
      }
      console.error("[brevo-contacts] remove failed:", res.status, text);
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[brevo-contacts] remove exception:", msg);
    return { ok: false, error: msg };
  }
}

// ── Token de désinscription signé (HMAC-SHA256) ──

function unsubscribeSecret(): string | null {
  const s = process.env.MARKETING_UNSUBSCRIBE_SECRET;
  if (!s || s.length < 16) {
    console.error("[brevo-contacts] MARKETING_UNSUBSCRIBE_SECRET non configuré ou trop court");
    return null;
  }
  return s;
}

function b64urlEncode(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64").toString("utf8");
}

function signEmail(email: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(email.toLowerCase()).digest("hex");
}

export function makeUnsubscribeToken(email: string): string | null {
  const secret = unsubscribeSecret();
  if (!secret) return null;
  const normalized = email.trim().toLowerCase();
  return `${b64urlEncode(normalized)}.${signEmail(normalized, secret)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const secret = unsubscribeSecret();
  if (!secret) return null;
  const [emailPart, sigPart] = token.split(".");
  if (!emailPart || !sigPart) return null;
  let email: string;
  try {
    email = b64urlDecode(emailPart).toLowerCase();
  } catch {
    return null;
  }
  if (!email || !email.includes("@")) return null;
  const expected = signEmail(email, secret);
  // Comparaison à temps constant
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sigPart, "hex");
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return email;
}

export function unsubscribeUrl(email: string, baseUrl = "https://www.quicklot.fr"): string | null {
  const token = makeUnsubscribeToken(email);
  if (!token) return null;
  return `${baseUrl}/desinscription?token=${encodeURIComponent(token)}`;
}
