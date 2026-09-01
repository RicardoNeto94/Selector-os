import PublicInfoPage from "@/components/public/PublicInfoPage";
import { legalIdentity } from "@/lib/site/legal";

export const metadata = { title: "Accessibility", description: "VAXERON's accessibility commitment and feedback channel." };

const sections = [
  { title: "Our commitment", content: <><p>VAXERON aims to make its public information, guest experiences and operational tools usable by as many people as reasonably possible. Accessibility is treated as an ongoing product responsibility, not a one-time certification.</p></> },
  { title: "What we are working toward", content: <><ul><li>Keyboard-accessible navigation and controls.</li><li>Clear focus states, labels, headings and error messages.</li><li>Readable contrast, scalable layouts and reduced-motion support.</li><li>Alternative text for meaningful imagery.</li><li>Interfaces that work across common screen sizes and assistive technologies.</li></ul></> },
  { title: "Current status", content: <><p>The private pilot has not yet completed an independent accessibility audit and does not currently claim full conformance with a specific standard. Audits, issue tracking and an updated statement are planned before broader commercial release.</p></> },
  { title: "Request help or report a barrier", content: <><p>If something prevents you from accessing information or completing a task, email <a href={`mailto:${legalIdentity.emails.support}?subject=Accessibility%20support`}>{legalIdentity.emails.support}</a>. Please include the page, device or assistive technology used and what you were trying to do. We will provide the information in another reasonable format where possible.</p></> },
];

export default function AccessibilityPage(){return <PublicInfoPage eyebrow="Trust · Inclusive access" title="Accessibility" intro="Our commitment to making VAXERON clear, operable and useful across different needs, devices and ways of navigating." sections={sections}/>}
