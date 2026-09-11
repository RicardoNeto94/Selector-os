import Link from "next/link";
import MarketingHeader from "./MarketingHeader";
import { PublicFooter } from "./PublicInfoPage";
import { Arrow } from "./ProductSections";
import { products, demoHref } from "./products";
import styles from "./Products.module.css";
import "@/styles/vaxeron-new.css";

export default function ProductLanding({ type }) {
  const product = products[type];
  const other = products[product.other];
  return <main className={`vx2 ${styles.landing}`}>
    <MarketingHeader active={product.href} />
    <section className={`${styles.hero} ${type === "hospitality" ? styles.hospitalityHero : ""}`}>
      <div className={styles.heroCopy}><p className={styles.eyebrow}>{product.name} <span> / </span> {product.label}</p><h1>{product.heading}</h1><p className={styles.intro}>{product.intro}</p><div className={styles.heroActions}><a className={styles.primary} href="#access">Discover it in a demo<Arrow /></a><a className={styles.textLink} href="#possibilities">Explore the possibilities<Arrow /></a></div><p className={styles.audience}>{product.audience}</p></div>
      <figure className={styles.heroVisual}><img src={product.image} alt={product.alt} width={type === "wine" ? 1729 : 1672} height={type === "wine" ? 910 : 941} fetchPriority="high" /><figcaption>{product.caption}</figcaption></figure>
    </section>
    <section id="possibilities" className={styles.possibilities}><header><p className={styles.eyebrow}>The everyday, made clearer</p><h2>{product.detailTitle}</h2></header><div className={styles.features}>{product.features.map(([title, copy], index) => <article key={title}><span className={styles.number}>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className={styles.journey}><header><p className={styles.eyebrow}>A considered beginning</p><h2>From your operation<br />to your first experience.</h2></header><ol>{product.steps.map(([title, copy]) => <li key={title}><h3>{title}</h3><p>{copy}</p></li>)}</ol><p className={styles.note}>{product.note}</p></section>
    <section id="access" className={styles.access}><p className={styles.eyebrow}>A personal introduction · Private pilot</p><h2>{product.cta}</h2><p>Tell us about your team and what you would like to improve. We’ll walk through the relevant features, setup and fit with you.</p><a className={styles.primary} href={demoHref(product.name)}>Request a {type === "wine" ? "Wine" : "Hospitality"} demo<Arrow /></a><small>Opens your email app · hello@vaxeron.com</small></section>
    <aside className={styles.related}><div><p className={styles.eyebrow}>Also part of Vaxeron</p><h2>{other.name}</h2><p>{other.short}</p></div><Link className={styles.textLink} href={other.href}>Explore {other.name}<Arrow /></Link></aside>
    <PublicFooter />
  </main>;
}
