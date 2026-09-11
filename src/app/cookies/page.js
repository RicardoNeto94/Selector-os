import { publicMetadata } from "@/lib/site/metadata";
import PublicInfoPage from "@/components/public/PublicInfoPage";
import { legalIdentity } from "@/lib/site/legal";

export const metadata = publicMetadata("/cookies", "Cookie notice", "Cookies and similar technologies used by VAXERON.");

const sections = [
  { title: "Current approach", content: <><p>Essential browser storage supports secure sessions and your requested preferences. Optional analytics is off unless you actively allow it through Privacy choices. If analytics is not configured, the banner says it is disabled. We do not use advertising trackers on these public pages.</p></> },
  { title: "What these technologies are", content: <><p>Cookies and browser storage are small records placed on or read from your device. They can maintain an authenticated session, remember a preference, help prevent abuse or measure how a website is used.</p></> },
  { title: "Necessary storage", content: <><ul><li><strong>Authentication:</strong> maintains a signed-in session and helps prevent unauthorized access.</li><li><strong>Security:</strong> supports request integrity, abuse prevention and technical diagnostics.</li><li><strong>Preferences:</strong> remembers a choice that is required for the experience you requested.</li></ul><p>Removing necessary storage may sign you out or prevent part of VAXERON from functioning.</p></> },
  { title: "Optional analytics", content: <><p>When configured and permitted, PostHog measures public page visits and demo-link interest. Analytics identifiers are held in memory for the page session, not as a persistent cross-visit profile. The SDK may also store an opt-in or opt-out preference. Session recording, automatic event capture, advertising and collection of form contents are disabled. This integration is not enabled on customer back-office or hotel guest pages.</p></> },
  { title: "Preference duration and abuse prevention", content: <><p>The local-storage record <code>vaxeron-privacy-v1</code> remembers your privacy choice for up to 180 days, after which we ask again. You can change it sooner. When online enquiry delivery is available, Cloudflare Turnstile processes browser and network signals to verify the request; it is used for abuse prevention, not advertising.</p></> },
  { title: "Managing your choices", content: <><p>Use <strong>Privacy choices</strong> in the footer to allow or reject optional analytics at any time. Withdrawal stops further measurement; it does not erase events already submitted. You can also delete browser storage or contact <a href={`mailto:${legalIdentity.emails.privacy}`}>{legalIdentity.emails.privacy}</a> with a data request.</p></> },
];

export default function CookiesPage(){return <PublicInfoPage eyebrow="Legal · Website data" title="Cookie notice" intro="The small amount of browser storage VAXERON needs, and the line we draw between essential operation and optional tracking." sections={sections}/>}
