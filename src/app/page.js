import Link from "next/link";
import VaxeronMotion from "@/components/VaxeronMotion";
import { PublicFooter } from "@/components/public/PublicInfoPage";
import "@/styles/vaxeron-new.css";

const capabilities = [
  { category: "Cellar", title: "Wine & cellar intelligence", copy: "One live view of the catalogue, availability, pricing and every service format.", outcome: "Bottle and by-the-glass availability stays aligned with the cellar and the venue serving it.", proofs: ["Catalogue & vintages", "Location-level stock", "Bottle & BTG formats"] },
  { category: "Operations", title: "Venue operations", copy: "Control transfers, movements and discrepancies across every storage and service location.", outcome: "Teams see where stock is, how it moved and which venue can confidently offer it now.", proofs: ["Transfers", "Movement history", "Venue reconciliation"] },
  { category: "Experience", title: "Guest experience publishing", copy: "Shape stock-aware wine lists and bespoke dining, spa and in-room guest journeys.", outcome: "Operational truth becomes a beautifully tailored experience without exposing the systems behind it.", proofs: ["Digital wine lists", "Property experiences", "Brand-led presentation"] },
  { category: "Ecosystem", title: "Connected hospitality systems", copy: "An integration architecture designed for POS, inventory, PMS and reservation platforms.", outcome: "Compucash is the first live connector. Additional providers are designed to attach through isolated adapters while VAXERON keeps one consistent operational language.", proofs: ["POS & inventory", "PMS integration path", "Webhooks & scheduled sync"] },
  { category: "Governance", title: "Teams, security & control", copy: "Protected workspaces, accountable access and a reliable operational record for every property.", outcome: "Each team member sees only what they need, while sensitive operational data remains private and auditable.", proofs: ["Verified sessions", "Role-based access", "Audit-ready history"] },
];

const experiences = [
  ["/vaxeron/koyo-ipad-service.png", "Koyo", "A seasonal wine-and-sake journey presented with the intimacy, care and quiet theatre of omotenashi.", "Omakase wine experience"],
  ["/vaxeron/shang-shi-ipad-service.png", "Shang Shi", "A tableside sommelier consultation connecting the live cellar with contemporary Cantonese dining.", "Sommelier-led wine programme"],
  ["/vaxeron/burman-spa-ipad-consultation.png", "The Burman Spa", "A private wellness consultation guiding each guest towards treatments, self-care and moments of restoration.", "Personalised wellness journey"],
];

export default function HomePage() {
  return <main className="vx2">
    <VaxeronMotion />
    <header className="vx2-nav">
      <Link href="/" className="vx2-wordmark" aria-label="VAXERON home"><img src="/selectoros-logo.png" alt=""/><span>VAXERON</span></Link>
      <nav aria-label="Primary navigation"><a href="#vision">Vision</a><a href="#platform">Platform</a><a href="#experiences">Experiences</a><Link href="/faq">FAQ</Link></nav>
      <div><Link href="/sign-in" className="vx2-signin">Sign in</Link><a href="#access" className="vx2-nav-cta">Request access</a></div>
    </header>

    <section className="vx2-hero">
      <img className="vx2-hero-image" src="/vaxeron/hospitality-arrival.png" alt="A refined contemporary hospitality arrival at night"/>
      <div className="vx2-hero-shade"/>
      <div className="vx2-hero-copy" data-reveal>
        <p>Operational intelligence for exceptional hospitality</p>
        <h1>Everything behind the experience, quietly connected.</h1>
        <div className="vx2-hero-bottom"><span>Wine · Venues · Inventory · Guests</span><a href="#vision">Discover VAXERON <b>↓</b></a></div>
      </div>
    </section>

    <section className="vx2-manifesto" id="vision">
      <p className="vx2-label" data-reveal>One operational language</p>
      <h2 data-reveal>Hospitality should feel effortless.<br/><em>The work behind it rarely is.</em></h2>
      <div className="vx2-manifesto-tail" data-reveal><span>VAXERON brings the moving parts together—without flattening the identity of the property.</span><p>A shared foundation for cellar, service, content and guest experience. Clear enough for the first day. Powerful enough for what comes next.</p></div>
    </section>

    <section className="vx2-workspace" id="platform">
      <div className="vx2-workspace-copy" data-reveal><p className="vx2-label">The working view</p><h2>Clarity,<br/>at a glance.</h2><p>Live operational health, venue inventory and guest publishing—designed around the way hospitality teams actually work.</p><a href="#capabilities">Explore the platform <span>→</span></a></div>
      <div className="vx2-device-wrap" data-reveal>
        <div className="vx2-laptop"><div className="vx2-screen"><span className="vx2-camera"/><img src="/platform/dashboard-overview.png?v=4" alt="VAXERON operational dashboard displayed on a laptop"/></div><div className="vx2-base"><i/></div></div>
        <small>VAXERON operational overview · Live workspace</small>
      </div>
    </section>

    <section className="vx2-service">
      <figure data-reveal><img src="/vaxeron/sommelier-service.png" alt="A sommelier preparing wine service in an intimate cellar"/><figcaption>Precision in every detail</figcaption></figure>
      <div className="vx2-service-copy" data-reveal><p className="vx2-label">From cellar to table</p><h2>Built for the details guests never need to see.</h2><p>Availability, pricing, service formats and location move through one connected system—so the experience stays composed.</p><blockquote>“The technology recedes.<br/>The hospitality remains.”</blockquote></div>
    </section>

    <section className="vx2-capabilities" id="capabilities">
      <header data-reveal><p className="vx2-label">A modular foundation</p><h2>One language.<br/>Every moving part.</h2><p className="vx2-capability-intro">Explore how VAXERON connects operational truth with the guest experience—without depending on a single technology provider.</p><div className="vx2-capability-scope"><span>Operations</span><span>Experiences</span><span>Integrations</span></div></header>
      <div className="vx2-capability-list">{capabilities.map(({category,title,copy,outcome,proofs},index)=><details key={title} open={index===0} data-reveal><summary><span>{String(index+1).padStart(2,"0")}</span><div><small>{category}</small><h3>{title}</h3><p>{copy}</p></div><b aria-hidden="true">+</b></summary><div className="vx2-capability-detail"><p>{outcome}</p><ul>{proofs.map(proof=><li key={proof}>{proof}</li>)}</ul></div></details>)}</div>
    </section>

    <section className="vx2-evening">
      <img src="/vaxeron/evening-service.png" alt="Hospitality team preparing a restaurant for evening service"/>
      <div data-reveal><p>Quiet coordination</p><h2>When every team sees the same truth, service moves differently.</h2></div>
    </section>

    <section className="vx2-experiences" id="experiences">
      <header data-reveal><p className="vx2-label">Partner implementations</p><h2>Designed around<br/><em>their world.</em></h2><span>VAXERON provides the operational foundation. Every guest-facing service is then shaped around the partner, their setting and the way they welcome guests.</span></header>

      <article className="vx2-burman-case" data-reveal>
        <div className="vx2-burman-room"><img src="/vaxeron/burman-ipad-final.png" alt="The Burman VAXERON guest experience presented on an in-room iPad"/></div>
        <div className="vx2-burman-caption"><p className="vx2-label">The Burman Hotel · In-room experience</p><h3>The stay, thoughtfully gathered in one place.</h3><p>Created for the hotel’s in-room iPads, the experience gives every guest an immediate path to Michelin-recognised dining, room service, the spa and the details of their stay.</p><small>Original VAXERON concept · Inspired by the live installation</small></div>
      </article>

      <div className="vx2-partner-intro" data-reveal><p className="vx2-label">Personalised services for our partners</p><span>Part of the wider Bombay hospitality world, each destination keeps a distinct voice, service ritual and digital expression.</span></div>
      <div className="vx2-experience-grid">{experiences.map(([image,title,copy,service],index)=><figure key={title} className={`vx2-exp-${index+1}`} data-reveal><div className="vx2-partner-image"><img src={image} alt={`${title} guest experience powered by VAXERON`}/><small>{service}</small></div><figcaption><span>{title}</span><p>{copy}</p></figcaption></figure>)}</div>
    </section>

    <section className="vx2-proof" id="inside-platform">
      <header className="vx2-proof-header" data-reveal><p className="vx2-label">Inside the platform</p><h2>From one source of truth<br/><em>to every point of service.</em></h2><p>VAXERON turns fragmented operational data into a calm, shared workspace—then carries the right information into every venue and guest experience.</p></header>
      <div className="vx2-proof-stage" data-reveal>
        <figure className="vx2-proof-window vx2-proof-main"><div className="vx2-window-bar"><i/><i/><i/><span>Live operational workspace</span></div><img src="/platform/stock-control.png?v=4" alt="VAXERON live stock control workspace"/></figure>
        <figure className="vx2-proof-window vx2-proof-venue"><div className="vx2-window-bar"><i/><i/><i/><span>Venue intelligence</span></div><img src="/platform/venue-inventory.png?v=4" alt="VAXERON location-level venue inventory"/></figure>
        <aside className="vx2-proof-note"><p className="vx2-label">Operational record</p><h3>Every bottle.<br/>Every venue.<br/>Every movement.</h3><p>Live quantities, service formats and movement history stay connected to the teams and experiences that depend on them.</p><ul><li>Location-level availability</li><li>Transfers and adjustments</li><li>Stock-aware publishing</li></ul></aside>
      </div>
      <ol className="vx2-proof-flow" data-reveal>
        <li><span>01</span><div><b>Connect systems</b><small>Provider-specific adapters</small></div></li>
        <li><span>02</span><div><b>Normalise the truth</b><small>Products, locations and units</small></div></li>
        <li><span>03</span><div><b>Operate confidently</b><small>Inventory, movements and teams</small></div></li>
        <li><span>04</span><div><b>Publish beautifully</b><small>Venue and guest experiences</small></div></li>
      </ol>
      <p className="vx2-proof-caption" data-reveal>Compucash is the first live connector. The integration architecture is designed to welcome additional POS, inventory, PMS and reservation providers.</p>
    </section>

    <section className="vx2-private">
      <p className="vx2-label" data-reveal>Private by design</p><h2 data-reveal>The public experience is open.<br/>The operation never is.</h2><div data-reveal><span>Verified sessions</span><span>Active accounts</span><span>Role-based access</span><span>Server-side protection</span></div>
    </section>

    <section className="vx2-access" id="access">
      <div data-reveal><p className="vx2-label">Selected hospitality partners</p><h2>What could VAXERON become for your property?</h2><p>Tell us about the operation, the guest journey and what you would like to connect.</p><a href="mailto:hello@vaxeron.com?subject=VAXERON%20access%20request&body=Property%20or%20company%3A%0A%0AModules%20of%20interest%3A%0A%0AWhat%20would%20you%20like%20VAXERON%20to%20help%20with%3A">Request a private introduction <span>→</span></a></div>
    </section>

    <PublicFooter />
  </main>;
}
