import { validateEnquiry } from "./publicSite.mjs";

const MAX_BYTES = 12000;
const reply = (status, body) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export function trustedContactOrigin(origin, production = true) {
  try {
    const url = new URL(origin);
    if (url.origin !== origin) return false;
    return (url.protocol === "https:" && ["vaxeron.com", "www.vaxeron.com"].includes(url.hostname)) ||
      (!production && ["localhost", "127.0.0.1"].includes(url.hostname) && ["http:", "https:"].includes(url.protocol));
  } catch { return false; }
}
export function contactConfigured(env) {
  return Boolean(env.RESEND_API_KEY && env.CONTACT_FROM_EMAIL && env.TURNSTILE_SECRET_KEY && env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}
async function boundedJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("body");
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error("size"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function handleContact(request, { env = process.env, fetcher = fetch } = {}) {
  const origin = request.headers.get("origin");
  if (!trustedContactOrigin(origin, env.NODE_ENV === "production")) return reply(403, { error: "Please submit from the Vaxeron website." });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, { error: "JSON is required." });
  let input;
  try { input = await boundedJson(request); }
  catch { return reply(400, { error: "Please check your message and try again." }); }
  const { values, errors } = validateEnquiry(input);
  if (Object.keys(errors).length) return reply(400, { error: "Please check the highlighted fields.", errors });
  if (values.website) return reply(400, { error: "Unable to submit this message." });
  if (!contactConfigured(env)) return reply(503, { error: "Online delivery is not available. Please email hello@vaxeron.com." });
  if (typeof input.token !== "string" || !input.token || input.token.length > 2048) return reply(400, { error: "Please complete the security check." });
  try {
    const verification = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: input.token }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await verification.json();
    if (!verification.ok || result.success !== true || result.action !== "contact" || result.hostname !== new URL(origin).hostname) return reply(400, { error: "Security check expired or failed. Please try again." });
    // Only fixed, server-owned sender and recipient. User text is never HTML or headers.
    const sent = await fetcher("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.CONTACT_FROM_EMAIL, to: ["hello@vaxeron.com"], reply_to: values.email,
        subject: `Vaxeron ${values.product} demo enquiry`,
        text: `Name: ${values.name}\nEmail: ${values.email}\nCompany: ${values.company}\nProduct: ${values.product}\n\n${values.message}` }),
      signal: AbortSignal.timeout(10000),
    });
    if (!sent.ok) return reply(502, { error: "Your message could not be confirmed. Please email hello@vaxeron.com." });
    const receipt = await sent.json();
    if (!receipt.id) return reply(502, { error: "Delivery could not be confirmed. Please email hello@vaxeron.com." });
    return reply(200, { ok: true });
  } catch { return reply(503, { error: "Delivery could not be confirmed. Please email hello@vaxeron.com or try again later." }); }
}
