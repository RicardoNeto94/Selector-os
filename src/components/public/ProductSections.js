import Link from "next/link";
import { products } from "./products";
import styles from "./Products.module.css";

export default function ProductSections() {
  return <div id="platform" className={styles.products}>
    <header className={styles.sectionIntro}><p className={styles.eyebrow}>One Vaxeron. Two ways to make a difference.</p><h2>Behind the service.<br /><em>At the heart of the stay.</em></h2></header>
    {Object.entries(products).map(([key, product], index) => <section id={`vaxeron-${key}`} className={`${styles.productRow} ${index ? styles.hospitality : ""}`} key={key}>
      <div className={styles.productCopy}><p className={styles.eyebrow}>{product.name}</p><h2>{product.short}</h2><p>{product.intro}</p><ul className={styles.highlights}>{product.highlights.map(item => <li key={item}>{item}</li>)}</ul><Link className={styles.textLink} href={product.href}>Explore {product.name}<Arrow /></Link></div>
      <figure className={styles.productVisual}><img src={product.image} alt={product.alt} loading="lazy" width={key === "wine" ? 1729 : 1672} height={key === "wine" ? 910 : 941} /><figcaption>{product.caption}</figcaption></figure>
    </section>)}
  </div>;
}

export function Arrow() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" /></svg>;
}
