# Vaxeron public-site launch pass — 11 September 2026

Scope: marketing homepage, Wine and Hospitality product pages, public information pages, contact flow and shared secret-import safeguards. No stock, customer-role, tenant isolation, billing or guest-menu data changes. The unrelated existing `docs/release-readiness.md` was left untouched.

## Shipped foundations

- Privacy and pilot terms retained, made easier to read and updated with actual enquiry/measurement behaviour. Company registration is still explicitly pending, not invented.
- Cookie/privacy preferences with rejection, explicit acceptance when configured, withdrawal through the footer, cross-tab updates and 180-day expiry. No analytics initialization before permission. Guest subdomains and private routes are excluded.
- PostHog wiring for public page views and demo-link interest only: no automatic capture, session recordings, query strings or form fields. In-memory analytics identifiers; SDK opt-in/out preference storage is disclosed.
- Contact form with accessible inline validation and honest email-draft fallback. Optional direct sending verifies Turnstile on the server, including action and exact hostname, before a fixed-recipient Resend message. Bounded body size, honeypot, strict public-site origins, request timeouts, single-use verification and generic error responses. No real customer email was sent during testing; provider success/failure tests use mocks.
- Secret-bearing Supabase-admin and Stripe modules marked server-only; environment files ignored, with a value-free example for the new optional services. Public Supabase URL/anon key and analytics/Turnstile site keys are intentionally public identifiers, not privileged credentials.
- HTTPS verified on the live domain: HTTP returns 308 to HTTPS. Existing HSTS/security headers preserved; CSP explicitly permits Turnstile for the optional form. No local HTTPS redirect loop introduced.
- Unique public page titles, descriptions, canonicals, Open Graph and Twitter metadata; branded 1200×630 social card; sitemap dates and robots exclusions updated. Robots instructions are not access controls.
- Branded real 404 response; obsolete SelectorOS pricing content replaced; broken request-access anchors now lead to contact.
- One primary marketing action, “Request a demo”, leading to the contact flow. Product interest is prefilled for Wine/Hospitality links.
- Eight responsive WebP image pairs, lazy loading below the fold, intrinsic image dimensions, high-priority hero loading, informative alt text and decorative-logo handling. Original assets preserved.
- Existing marketing fonts self-hosted with OFL licenses. Removed the blocking introduction and continuous image-parallax work; retained restrained, reduced-motion-aware transitions.
- Scoped contrast, text-size, focus and responsive-layout fixes. Customer and hotel typography are not restyled by these changes.

## Checks and measurements

- Next production build: pass.
- 14 targeted Node tests: pass (8 new consent/contact tests and 6 existing guest-host/layout tests).
- Browser QA in headless Chrome on the production build: 12 public routes at 390px; homepage, Wine, Hospitality and contact also at 768px and 1440px. Axe WCAG 2 A/AA and 2.1 AA checks returned no violations in the final pass. This is an automated sample, not a complete accessibility certification or physical-iPad test.
- In that pass: no page errors, broken rendered images, missing alt attributes, broken same-page anchors, broken linked internal routes or horizontal document overflow. Contact validation, product prefill, privacy-choice reopening and the actual 404 response were exercised.
- Unconfigured marketing pages made no third-party resource requests in the measured session.
- Original eight marketing PNGs: 12,755,608 bytes. Main compressed variants: 498,580 bytes, approximately 96% smaller. Smaller mobile variants are additional files selected through `srcset`.
- Live baseline at 390px before release: 11,829,293 resource-transfer bytes, about 571ms TTFB and 2,172ms load event. Local production preview after optimization: roughly 255–306KB of initial resource transfers. Local timings are not directly comparable to live network timings; this is not a Lighthouse score or field Core Web Vitals report.
- Built browser-bundle scan: 107 JS/CSS/map/JSON files checked against four private values present in the local environment; zero matches. No tracked environment/key files found. This is not an exhaustive secret-history audit or penetration test; production-only credentials were not available to scan.
- `npm run lint` remains blocked by the repository’s existing ESLint parser configuration: 221 “import/const/export is reserved” errors across existing modern-JavaScript files. Production compilation and targeted tests pass; lint is not reported as passing.

## Still required before a full commercial launch

1. Confirm the actual legal operator/controller now, and supply registered company name, registry code, registered address and VAT status after incorporation. Obtain legal review of privacy, terms, lawful bases, retention, international transfers and customer DPA. Incorporation pending does not remove current data-protection duties. No GDPR-compliance certification is claimed.
2. Confirm test delivery to `hello@vaxeron.com` and `support@vaxeron.com`. Privacy/security/billing temporarily use the configured general alias rather than advertise unverified aliases. Resend sending DNS must also remain correct; inbound forwarding does not prove outbound sending works.
3. Configure a PostHog project ingestion key and the matching EU/US ingestion host in the Vercel build environment, then redeploy and test accept/reject/withdraw with the real project. Never use a personal/admin API key in a public environment variable. Analytics is wired but not claimed active without this configuration.
4. For direct enquiry delivery, configure `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, and a verified `CONTACT_FROM_EMAIL`. Restrict the widget to the marketing domains, verify production delivery and add appropriate Vercel firewall/rate-limit controls. Captcha is not a guarantee against all spam. Until all four are configured, the form prepares an email draft and the endpoint fails closed.
5. Monitor real-device performance/Core Web Vitals and keyboard/screen-reader usability after release. Audit enabled integrations and tenant data separately before onboarding more customers.

## Social preview asset

Generated using the built-in image-generation mode, based on the existing Vaxeron monogram; resized/compressed to `public/og.png`. Source preserved at `/Users/ricardo.neto/.codex/generated_images/01a02661-0019-7071-84cc-b92d84f47ae7/exec-c11d80f3-3cf3-42fe-b50f-762fddddd682.png`.

Final generation prompt:

> Use case: ads-marketing. Create one polished landscape social sharing card for the Vaxeron website, approximately 1.91:1 aspect ratio. Supporting reference image is the EXISTING gold Vaxeron monogram; preserve its shape exactly, do not invent another logo. Brand: understated premium hospitality technology, architectural editorial elegance, not a dashboard mockup. Deep forest-green almost black background, warm ivory typography, restrained gold accents. Generous negative space. On the left, small existing gold monogram beside the spaced wordmark 'VAXERON'. Main exact headline in large elegant clean typography: 'Wine & Hospitality'. Supporting exact copy: 'Quietly connected.' Small footer exact text: 'vaxeron.com'. On the right a subtle cinematic photographic vignette of a refined restaurant cellar meeting a tranquil hotel interior, warm lighting, no people or recognizable real hotel brand. Keep all text high contrast and comfortably within generous margins for link preview cropping. No cards, fake UI, charts, extra copy, watermark or customer names.

## Implementation references

- EU guidance: https://europa.eu/youreurope/business/growing/digitalising/online-privacy/index_en.htm
- Turnstile server verification: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Resend sending API: https://resend.com/docs/api-reference/emails/send-email
- PostHog consent and persistence: https://github.com/PostHog/posthog.com/blob/master/contents/docs/privacy/gdpr-compliance.mdx and https://github.com/PostHog/posthog.com/blob/master/contents/docs/libraries/js/persistence.mdx
