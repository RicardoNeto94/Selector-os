export const LEGACY_BURMAN_ORGANIZATION_ID =
  "a1111111-1111-4111-8111-111111111111";

export const LEGACY_BURMAN_PROPERTY_ID =
  "b2222222-2222-4222-8222-222222222222";

export const LEGACY_BURMAN_WORKSPACE = Object.freeze({
  organization: {
    id: LEGACY_BURMAN_ORGANIZATION_ID,
    name: "Bombay Club",
    slug: "bombay-club",
    role: "owner",
  },
  property: {
    id: LEGACY_BURMAN_PROPERTY_ID,
    name: "The Burman",
    slug: "the-burman",
    role: "administrator",
    timezone: "Europe/Tallinn",
    currencyCode: "EUR",
  },
  source: "legacy_fallback",
});
