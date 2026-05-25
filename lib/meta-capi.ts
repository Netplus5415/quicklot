import crypto from "node:crypto";

const GRAPH_API_VERSION = "v18.0";

function hashLower(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

type CapiActionSource =
  | "website"
  | "email"
  | "phone_call"
  | "chat"
  | "physical_store"
  | "system_generated"
  | "business_messaging"
  | "other";

type CapiEvent = {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: CapiActionSource;
  event_source_url?: string;
  user_data: Record<string, string[]>;
  custom_data: Record<string, unknown>;
};

async function postCapiEvent(event: CapiEvent, label: string): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE;

  if (!pixelId || !accessToken) {
    console.warn(
      "[meta-capi] NEXT_PUBLIC_META_PIXEL_ID or META_CAPI_ACCESS_TOKEN missing — skipping",
      label
    );
    return;
  }

  const body: Record<string, unknown> = {
    data: [event],
    access_token: accessToken,
  };
  if (testEventCode) body.test_event_code = testEventCode;

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: unknown = await res.json();
    if (!res.ok) {
      console.error(`[meta-capi] ${label} event failed:`, res.status, data);
    } else {
      console.log(`[meta-capi] ${label} event sent:`, event.event_id);
    }
  } catch (err) {
    console.error(`[meta-capi] ${label} fetch error:`, err);
  }
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
  const userData: Record<string, string[]> = {};
  if (input.email) userData.em = [hashLower(input.email)];

  await postCapiEvent(
    {
      event_name: "Purchase",
      event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
      event_id: input.eventId,
      action_source: "website",
      event_source_url:
        input.eventSourceUrl ??
        `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.quicklot.fr"}/achat/succes`,
      user_data: userData,
      custom_data: {
        value: input.value,
        currency: input.currency,
        content_ids: input.contentIds,
        content_type: "product",
      },
    },
    "purchase"
  );
}

export type LotPublishedCapiInput = {
  listingId: string;
  eventId: string;
  contentName?: string;
  contentCategory?: string;
  value?: number;
  currency?: string;
  eventTime?: number;
};

export async function sendLotPublishedCapiEvent(
  input: LotPublishedCapiInput
): Promise<void> {
  const customData: Record<string, unknown> = {
    content_ids: [input.listingId],
    content_type: "product",
  };
  if (input.contentName) customData.content_name = input.contentName;
  if (input.contentCategory) customData.content_category = input.contentCategory;
  if (typeof input.value === "number") customData.value = input.value;
  if (input.currency) customData.currency = input.currency;

  await postCapiEvent(
    {
      event_name: "LotPublished",
      event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
      event_id: input.eventId,
      action_source: "system_generated",
      user_data: {},
      custom_data: customData,
    },
    "lot-published"
  );
}
