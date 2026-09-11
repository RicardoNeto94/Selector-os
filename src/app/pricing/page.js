import Link from "next/link";
import PublicInfoPage from "@/components/public/PublicInfoPage";
import { publicMetadata } from "@/lib/site/metadata";

export const metadata = publicMetadata("/pricing", "Plans & access", "Discuss Vaxeron Wine or Hospitality, the modules your team needs and a scoped private pilot. Pricing is agreed before you commit.");
export default function PricingPage() {
  return <PublicInfoPage eyebrow="Plans · Private pilot" title="The right fit for your property." intro="Start with the operation or guest experience you want to improve. We’ll agree the scope and commercial terms with you before anything begins." sections={[
    { title: "Vaxeron Wine", content: <p>Wine catalogues, location-level stock, venue operations and branded digital wine lists. <Link href="/wine">Explore Vaxeron Wine</Link>.</p> },
    { title: "Vaxeron Hospitality", content: <p>Branded dining, in-room and wellness experiences, with content managed by your team. <Link href="/hospitality">Explore Vaxeron Hospitality</Link>.</p> },
    { title: "What we agree together", content: <p>Properties, users, enabled modules, integrations, onboarding and support. Bespoke design and device configuration are scoped separately. There are no published self-service prices or automatic charges on this page.</p> },
    { title: "See what fits", content: <p><Link href="/contact" data-demo-cta="Both">Request a demo</Link> to discuss your requirements and pilot availability.</p> },
  ]} />;
}
