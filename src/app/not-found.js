import Link from "next/link";
import styles from "@/components/public/NotFound.module.css";

export default function NotFound() {
  return <main className={styles.page}><Link href="/" className={styles.brand} aria-label="Vaxeron home"><img src="/selectoros-logo.png" alt="" width="40" height="40" />VAXERON</Link><section><p>404 · A little off the path</p><h1>This page couldn’t be found.</h1><p>The address may have changed, or the page may no longer be available. Let’s get you back to Vaxeron.</p><Link href="/" className={styles.primary}>Return to the homepage</Link><Link href="/contact">Contact us</Link></section></main>;
}
