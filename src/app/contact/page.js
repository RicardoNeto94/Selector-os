import PublicInfoPage, { ContactCards } from "@/components/public/PublicInfoPage";
import { legalIdentity } from "@/lib/site/legal";
import ContactForm from "@/components/public/ContactForm";
import { publicMetadata } from "@/lib/site/metadata";
import { contactConfigured } from "@/lib/site/contactHandler.mjs";

export const metadata = publicMetadata("/contact", "Request a demo", "Explore Vaxeron Wine and Vaxeron Hospitality with a personal introduction for your hotel, restaurant or hospitality group.");

const sections = [
  { title: "Choose the right contact", content: <><ContactCards/><p style={{marginTop:18}}>During the private pilot, email is the primary contact channel. Please do not send passwords, payment-card details or unnecessary personal information.</p></> },
  { title: "Legal information", content: <><p><strong>Brand:</strong> {legalIdentity.brandName}<br/><strong>Status:</strong> {legalIdentity.status}<br/><strong>Jurisdiction:</strong> {legalIdentity.jurisdiction}</p><p>The registered legal name, registry code, VAT status and registered address will be published here as soon as the VAXERON operating company is incorporated.</p></> },
  { title: "Commercial enquiries", content: <><p>VAXERON is currently working with selected hospitality partners. For a private introduction, email <a href={`mailto:${legalIdentity.emails.general}?subject=VAXERON%20private%20introduction`}>{legalIdentity.emails.general}</a> with your property, current operational systems and the guest or team workflow you would like to improve.</p></> },
];

export default async function ContactPage({ searchParams }) {
  const params = await searchParams;
  const initialProduct = ["Wine", "Hospitality", "Both"].includes(params?.product) ? params.product : "Both";
  return <PublicInfoPage focused eyebrow="Company · Get in touch" title="Let’s start a conversation." intro="A personal introduction to the right Vaxeron tools for your property." sections={[]}>
    <ContactForm enabled={contactConfigured(process.env)} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""} initialProduct={initialProduct} />
    {sections.slice(0, 2).map(section => <section key={section.title}><h2>{section.title}</h2>{section.content}</section>)}
  </PublicInfoPage>;
}
