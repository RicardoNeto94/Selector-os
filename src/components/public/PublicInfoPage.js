import Link from "next/link";
import { legalIdentity, publicLegalLinks } from "@/lib/site/legal";
import styles from "./PublicInfoPage.module.css";

export default function PublicInfoPage({ eyebrow, title, intro, sections, children }) {
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href="/" className={styles.brand} aria-label="VAXERON home"><img src="/selectoros-logo.png" alt=""/><span>VAXERON</span></Link>
      <nav className={styles.topnav} aria-label="Public information"><Link href="/faq">FAQ</Link><Link href="/contact">Contact</Link><Link href="/sign-in">Sign in</Link></nav>
    </header>
    <div className={styles.shell}>
      <header className={styles.hero}>
        <div><p className={styles.eyebrow}>{eyebrow}</p><h1>{title}</h1><p className={styles.intro}>{intro}</p>{!legalIdentity.detailsComplete && <p className={styles.draft}><strong>Private pilot notice.</strong> VAXERON&apos;s legal entity is being established. This page documents the current pilot position and will be updated with the registered company name, registry code and address before commercial launch.</p>}</div>
        <aside className={styles.meta}><span>Last updated</span><strong>{legalIdentity.lastUpdated}</strong><span style={{marginTop:16}}>Operating status</span><strong>{legalIdentity.status}</strong></aside>
      </header>
      <div className={styles.content}>
        <aside className={styles.aside}><p>VAXERON public information</p><nav>{publicLegalLinks.map((link)=><Link href={link.href} key={link.href}>{link.label}</Link>)}<Link href="/security">Security</Link><Link href="/faq">FAQ</Link><Link href="/contact">Contact</Link></nav></aside>
        <article className={styles.article}>{sections?.map((section,index)=><section className={styles.section} id={section.id || `section-${index+1}`} key={section.title}><h2>{section.title}</h2>{section.content}</section>)}{children}</article>
      </div>
    </div>
    <PublicFooter />
  </main>;
}

export function ContactCards() {
  const entries = [["General",legalIdentity.emails.general,"Introductions and partnerships"],["Support",legalIdentity.emails.support,"Product and account assistance"],["Privacy",legalIdentity.emails.privacy,"Data protection requests"],["Security",legalIdentity.emails.security,"Responsible vulnerability reports"]];
  return <div className={styles.cards}>{entries.map(([label,email,copy])=><a className={styles.card} href={`mailto:${email}`} key={email}><span>{label}</span><strong>{email}</strong><small>{copy}</small></a>)}</div>;
}

export function PublicFooter() {
  return <footer className={styles.footer}><div className={styles.footerGrid}><div className={styles.footerBrand}><strong>VAXERON</strong><p>Operational intelligence and guest experiences for modern hospitality.</p></div><div><h2>Product</h2><nav><Link href="/#platform">Platform</Link><Link href="/#experiences">Experiences</Link><Link href="/faq">FAQ</Link></nav></div><div><h2>Trust</h2><nav><Link href="/security">Security</Link><Link href="/subprocessors">Subprocessors</Link><Link href="/accessibility">Accessibility</Link></nav></div><div><h2>Legal</h2><nav><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link></nav></div></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} VAXERON · Private pilot</span><span>{legalIdentity.jurisdiction} · Legal entity registration pending</span></div></footer>;
}
