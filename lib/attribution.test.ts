import { test } from "node:test";
import assert from "node:assert/strict";

import {
  mergeAttributionFirstTouch,
  type AttributionData,
} from "./attribution";

test("mergeAttributionFirstTouch returns current when stored is null", () => {
  const current: AttributionData = {
    utm_source: "google",
    utm_medium: "cpc",
    first_seen_at: "2026-06-02T10:00:00.000Z",
    last_seen_at: "2026-06-02T10:00:00.000Z",
  };

  const result = mergeAttributionFirstTouch(current, null);

  assert.deepEqual(result, current);
});

test("mergeAttributionFirstTouch preserves first-touch fields from stored and refreshes last_seen_at from current", () => {
  const stored: AttributionData = {
    utm_source: "facebook",
    utm_medium: "social",
    utm_campaign: "spring_launch",
    fbclid: "abc123",
    landing_page: "https://example.com/lp/spring",
    referrer: "https://facebook.com/",
    first_seen_at: "2026-05-01T08:00:00.000Z",
    last_seen_at: "2026-05-01T08:00:00.000Z",
  };

  const current: AttributionData = {
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "summer_sale",
    landing_page: "https://example.com/lp/summer",
    referrer: "https://google.com/",
    first_seen_at: "2026-06-02T12:00:00.000Z",
    last_seen_at: "2026-06-02T12:00:00.000Z",
  };

  const result = mergeAttributionFirstTouch(current, stored);

  assert.equal(result.utm_source, "facebook");
  assert.equal(result.utm_medium, "social");
  assert.equal(result.utm_campaign, "spring_launch");
  assert.equal(result.fbclid, "abc123");
  assert.equal(result.landing_page, "https://example.com/lp/spring");
  assert.equal(result.referrer, "https://facebook.com/");
  assert.equal(result.first_seen_at, "2026-05-01T08:00:00.000Z");
  assert.equal(result.last_seen_at, "2026-06-02T12:00:00.000Z");
});
