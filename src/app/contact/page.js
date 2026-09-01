import PublicInfoPage, { ContactCards } from "@/components/public/PublicInfoPage";
import { legalIdentity } from "@/lib/site/legal";

export const metadata = { title: "Contact", description: "Contact VAXERON for introductions, support, privacy and security." };

const sections = [
  { title: "Choose the right contact", content: <><ContactCards/><p style={{marginTop:18}}>During the private pilot, email is the primary contact channel. Please do not send passwords, payment-card details or unnecessary personal information.</p></> },
  { title: "Legal information", content: <><p><strong>Brand:</strong> {legalIdentity.brandName}<br/><strong>Status:</strong> {legalIdentity.status}<br/><strong>Jurisdiction:</strong> {legalIdentity.jurisdiction}</p><p>The registered legal name, registry code, VAT status and registered address will be published here as soon as the VAXERON operating company is incorporated.</p></> },
  { title: "Commercial enquiries", content: <><p>VAXERON is currently working with selected hospitality partners. For a private introduction, email <a href={`mailto:${legalIdentity.emails.general}?subject=VAXERON%20private%20introduction`}>{legalIdentity.emails.general}</a> with your property, current operational systems and the guest or team workflow you would like to improve.</p></> },
];

export default function ContactPage(){return <PublicInfoPage eyebrow="Company · Get in touch" title="Contact VAXERON" intro="Introductions, customer support and sensitive trust enquiries each have a clear route to the right conversation." sections={sections}/>}
