import test from "node:test";
import assert from "node:assert/strict";
import { filterPublicAnalyticsEvent } from "../src/lib/site/analyticsPrivacy.mjs";

test("both public events retain PostHog's required ingestion token and anonymous ID", () => {
  for (const event of ["$pageview", "demo_interest"]) {
    const result = filterPublicAnalyticsEvent({
      event, uuid: "test-event", timestamp: "2026-09-12T00:00:00Z",
      properties: { token: "public-project-token", distinct_id: "anonymous-id", path: "/wine", product: "Wine", $session_id: "anonymous-session", $window_id: "anonymous-window", $process_person_profile: false },
    });
    assert.equal(result.properties.token, "public-project-token");
    assert.equal(result.properties.distinct_id, "anonymous-id");
    assert.equal(result.properties.$session_id, "anonymous-session");
    assert.equal(result.properties.$window_id, "anonymous-window");
    assert.equal(result.properties.$process_person_profile, false);
    assert.equal(result.uuid, "test-event");
    assert.equal(result.timestamp, "2026-09-12T00:00:00Z");
  }
});

test("preserving the ingestion token does not permit private properties or additional event types", () => {
  const result = filterPublicAnalyticsEvent({ event: "$pageview", properties: {
    token: "public-project-token", distinct_id: "anonymous-id", path: "/",
    email: "private@example.com", authorization: "private", access_token: "private",
    organization_id: "private", $set: { email: "private@example.com" },
    $referrer: "https://example.com/?private=yes", message: "private enquiry",
  } });
  assert.deepEqual(result.properties, { token: "public-project-token", distinct_id: "anonymous-id", path: "/" });
  for (const event of ["$autocapture", "$snapshot", "$identify", "$set", "unknown"]) {
    assert.equal(filterPublicAnalyticsEvent({ event, properties: { token: "public-project-token" } }), null);
  }
  assert.equal(filterPublicAnalyticsEvent(null), null);
});
