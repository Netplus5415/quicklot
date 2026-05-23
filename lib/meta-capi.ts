import crypto from "node:crypto";

const GRAPH_API_VERSION = "v18.0";

function hashLower(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

export type PurchaseCapiInput = {
  value: number;
  currency: string;
  contentIds: string[];
  eventId: string;
  email?: string | null;
  eventTime?: number;
  eventSourceUrl?: string;
};

export async function sendPurchaseCapiEvent(
  input: PurchaseCapiInput
): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE;

  if (!pixelId || !accessToken) {
    console.warn(
      "[meta-capi] NEXT_PUBLIC_META_PIXEL_ID or META_CAPI_ACCESS_TOKEN missing — skipping"
    );
    return;
  }

  const userData: Record<string, string[]> = {};
  if (input.email) userData.em = [hashLower(input.email)];

  const event = {
    event_name: "Purchase",
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: "website" as const,
    event_source_url:
      input.eventSourceUrl ?? "https://www.quicklot.fr/achat/succes",
    user_data: userData,
    custom_data: {
      value: input.value,
      currency: input.currency,
      content_ids: input.contentIds,
      content_type: "product",
    },
  };

  const body: Record<string, unknown> = { data: [event] };
  if (testEventCode) body.test_event_code = testEventCode;

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: unknown = await res.json();
    if (!res.ok) {
      console.error("[meta-capi] purchase event failed:", res.status, data);
    } else {
      console.log("[meta-capi] purchase event sent:", input.eventId);
    }
  } catch (err) {
    console.error("[meta-capi] fetch error:", err);
  }
}
