import PublicInfoPage from "@/components/public/PublicInfoPage";
import { legalIdentity } from "@/lib/site/legal";

export const metadata = { title: "Frequently asked questions", description: "Answers about VAXERON workspaces, wine operations, guest experiences and onboarding." };

const sections = [
  { title: "What is VAXERON?", content: <p>VAXERON is an operational platform for hospitality businesses. It brings wine and cellar operations, venue-level stock, team workflows and selected guest experiences into a protected workspace.</p> },
  { title: "Who is it for?", content: <p>It is designed for hotels, restaurants, wine programmes and hospitality groups that need a clearer connection between operational data and what teams or guests see.</p> },
  { title: "Is VAXERON publicly available?", content: <p>Not yet. It is currently an invite-only private pilot with selected hospitality partners. Contact <a href={`mailto:${legalIdentity.emails.general}`}>{legalIdentity.emails.general}</a> to discuss a workspace.</p> },
  { title: "Does a customer need a POS or inventory API?", content: <p>No. A workspace can operate with manual inventory and catalogue management. Where a supported integration is available and authorized, VAXERON can use it to reduce manual work and keep stock signals aligned.</p> },
  { title: "Can a venue create a digital wine list?", content: <p>Yes. Authorized users can configure a guest-facing wine experience for a venue, choose its identity and presentation, and publish stock-aware availability. The public experience is separate from the protected operational back office.</p> },
  { title: "Are customer workspaces separated?", content: <p>Yes. VAXERON associates operational records with an organization and verifies membership and permissions for protected access. Tenant isolation is treated as a release-critical requirement.</p> },
  { title: "Who controls customer data?", content: <p>The hospitality customer controls the operational content it supplies and determines who may access its workspace. VAXERON processes workspace data to provide and support the requested service. Commercial customers will receive a Data Processing Agreement.</p> },
  { title: "Does VAXERON generate AI content?", content: <p>Only in enabled workflows requested by an authorized user. AI-assisted descriptions remain drafts and should be reviewed before publication. This feature may require a configured provider account or paid usage.</p> },
  { title: "What happens during onboarding?", content: <p>VAXERON creates an isolated organization, appoints its protected owner, selects modules and inventory mode, creates the first property or venue structure, and invites authorized users. Integrations and guest experiences are then configured for that customer.</p> },
  { title: "How do I get support?", content: <p>Email <a href={`mailto:${legalIdentity.emails.support}`}>{legalIdentity.emails.support}</a>. For privacy or security matters, use the dedicated addresses on the <a href="/contact">Contact page</a>.</p> },
];

export default function FaqPage(){return <PublicInfoPage eyebrow="Resources · First questions" title="Frequently asked questions" intro="A straightforward introduction to how VAXERON works, who it is for and what a new hospitality customer can expect." sections={sections}/>}
