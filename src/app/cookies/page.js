import PublicInfoPage from "@/components/public/PublicInfoPage";
import { legalIdentity } from "@/lib/site/legal";

export const metadata = { title: "Cookie notice", description: "Cookies and similar technologies used by VAXERON." };

const sections = [
  { title: "Current approach", content: <><p>VAXERON currently aims to use only the storage necessary to operate secure sessions, preserve essential preferences and protect the service. Necessary technologies do not require marketing consent, but they are still explained here.</p><p>We will not activate optional analytics or advertising cookies on the public website until an appropriate consent control is available.</p></> },
  { title: "What these technologies are", content: <><p>Cookies and browser storage are small records placed on or read from your device. They can maintain an authenticated session, remember a preference, help prevent abuse or measure how a website is used.</p></> },
  { title: "Necessary storage", content: <><ul><li><strong>Authentication:</strong> maintains a signed-in session and helps prevent unauthorized access.</li><li><strong>Security:</strong> supports request integrity, abuse prevention and technical diagnostics.</li><li><strong>Preferences:</strong> remembers a choice that is required for the experience you requested.</li></ul><p>Removing necessary storage may sign you out or prevent part of VAXERON from functioning.</p></> },
  { title: "Optional analytics and marketing", content: <><p>If optional analytics or marketing tools are introduced, VAXERON will identify them, explain their purpose and duration, and request consent before activating them where required. Declining optional cookies will not prevent access to essential functionality.</p></> },
  { title: "Managing your choices", content: <><p>You can delete or block cookies in your browser settings. A VAXERON consent control will also be provided before optional technologies are enabled. Questions can be sent to <a href={`mailto:${legalIdentity.emails.privacy}`}>{legalIdentity.emails.privacy}</a>.</p></> },
];

export default function CookiesPage(){return <PublicInfoPage eyebrow="Legal · Website data" title="Cookie notice" intro="The small amount of browser storage VAXERON needs, and the line we draw between essential operation and optional tracking." sections={sections}/>}
