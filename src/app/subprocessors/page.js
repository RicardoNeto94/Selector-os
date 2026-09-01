import PublicInfoPage from "@/components/public/PublicInfoPage";
import { legalIdentity } from "@/lib/site/legal";

export const metadata = { title: "Subprocessors", description: "Service providers supporting the VAXERON private pilot." };

const sections = [
  { title: "Core platform providers", content: <><ul><li><strong>Supabase:</strong> managed database, authentication, storage and related backend services.</li><li><strong>Vercel:</strong> application hosting, delivery, server execution and operational logs.</li><li><strong>Resend:</strong> transactional email delivery, including workspace invitations and account messages.</li></ul></> },
  { title: "Conditional providers", content: <><ul><li><strong>OpenAI:</strong> used only when an authorized user requests an AI-assisted feature, such as drafting wine descriptions.</li><li><strong>Stripe:</strong> intended for subscription and billing services when commercial billing is enabled.</li><li><strong>Compucash:</strong> customer-authorized inventory integration. Its role depends on the customer&apos;s own relationship and configuration.</li></ul><p>Not every provider processes information for every customer. Optional integrations and modules are enabled per workspace.</p></> },
  { title: "Data location and safeguards", content: <><p>Provider regions and transfer mechanisms depend on the selected service configuration. VAXERON will document the production regions and applicable international-transfer safeguards in its commercial Data Processing Agreement before launch.</p></> },
  { title: "Changes and questions", content: <><p>This list will be updated when a provider is introduced or materially changes. Commercial agreements will define any advance-notice and objection process. Questions can be sent to <a href={`mailto:${legalIdentity.emails.privacy}`}>{legalIdentity.emails.privacy}</a>.</p></> },
];

export default function SubprocessorsPage(){return <PublicInfoPage eyebrow="Trust · Service providers" title="Subprocessors" intro="The infrastructure and specialist services that may process data while helping VAXERON operate." sections={sections}/>}
