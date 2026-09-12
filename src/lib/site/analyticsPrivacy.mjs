const EVENTS = new Set(["$pageview", "demo_interest"]);
const PROPERTIES = new Set([
  // PostHog requires its public project ingestion token on every event.
  // This is not a personal API key or a visitor's authentication token.
  "token", "distinct_id", "$lib", "$lib_version", "$browser", "$os",
  "$device_type", "$current_url", "path", "product",
]);

export function filterPublicAnalyticsEvent(event) {
  if (!event || !EVENTS.has(event.event)) return null;
  event.properties = Object.fromEntries(
    Object.entries(event.properties || {}).filter(([name]) => PROPERTIES.has(name)),
  );
  return event;
}
