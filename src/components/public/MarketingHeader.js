import Link from "next/link";
import styles from "./Products.module.css";

export default function MarketingHeader({ active }) {
  const links = [["/wine", "Vaxeron Wine"], ["/hospitality", "Vaxeron Hospitality"], ["/faq", "FAQ"]];
  return <header className={styles.nav}>
    <Link href="/" className={styles.brand} aria-label="Vaxeron home"><img src="/selectoros-logo.png" alt="" /><span>VAXERON</span></Link>
    <nav className={styles.desktopNav} aria-label="Main navigation">{links.map(([href, label]) => <Link key={href} href={href} aria-current={active === href ? "page" : undefined}>{label}</Link>)}</nav>
    <div className={styles.navActions}><Link href="/sign-in" className={styles.signIn}>Sign in</Link><a href="/contact" data-demo-cta="Both" className={styles.demo}>Request a demo</a></div>
    <details className={styles.mobileNav} key={active || "home"}>
      <summary>Menu <span aria-hidden="true">+</span></summary>
      <nav aria-label="Mobile navigation">{links.map(([href, label]) => <Link key={href} href={href} aria-current={active === href ? "page" : undefined}>{label}</Link>)}<Link href="/sign-in">Sign in</Link><Link href="/contact">Contact & demos</Link></nav>
    </details>
  </header>;
}
