export const PUBLIC_SITE_PATHS = ["/", "/wine", "/hospitality", "/pricing", "/faq", "/contact", "/privacy", "/cookies", "/terms", "/security", "/subprocessors", "/accessibility"];
export const SITE_ORIGIN = "https://vaxeron.com";
export const CONSENT_KEY = "vaxeron-privacy-v1";
export const CONSENT_DURATION = 180 * 24 * 60 * 60 * 1000;

export function readConsent(raw, now = Date.now()) {
  try {
    const value = JSON.parse(raw);
    return value?.version === 1 && typeof value.analytics === "boolean" && Number.isFinite(value.savedAt) && value.savedAt <= now && now - value.savedAt < CONSENT_DURATION ? value : null;
  } catch { return null; }
}

export function validateEnquiry(input) {
  const values = {};
  const errors = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return { values, errors: { form: "Please complete the enquiry form." } };
  for (const field of ["name", "email", "company", "product", "message", "website"]) values[field] = typeof input[field] === "string" ? input[field].trim() : "";
  if (values.name.length < 2 || values.name.length > 100) errors.name = "Enter your name (2–100 characters).";
  if (values.email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(values.email)) errors.email = "Enter a valid email address.";
  if (values.company.length < 2 || values.company.length > 160) errors.company = "Enter your company or property (2–160 characters).";
  if (!["Wine", "Hospitality", "Both"].includes(values.product)) errors.product = "Choose the product you’re interested in.";
  if (values.message.length < 10 || values.message.length > 2000) errors.message = "Tell us what you need in 10–2,000 characters.";
  return { values, errors };
}

export function enquiryMailto(values) {
  return `mailto:hello@vaxeron.com?subject=${encodeURIComponent(`Vaxeron ${values.product} demo enquiry`)}&body=${encodeURIComponent(`Name: ${values.name}\nEmail: ${values.email}\nCompany: ${values.company}\n\n${values.message}`)}`;
}
