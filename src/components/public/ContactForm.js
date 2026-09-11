"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { enquiryMailto, validateEnquiry } from "@/lib/site/publicSite.mjs";
import styles from "./ContactForm.module.css";

export default function ContactForm({ enabled, siteKey, initialProduct = "Both" }) {
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [widgetReady, setWidgetReady] = useState(false);
  const widget = useRef(null); const widgetId = useRef(null); const sending = useRef(false);
  useEffect(() => {
    if (!enabled || !widgetReady || !window.turnstile || !widget.current) return;
    widgetId.current = window.turnstile.render(widget.current, { sitekey: siteKey, action: "contact", theme: "light",
      callback: setToken, "expired-callback": () => setToken(""), "error-callback": () => { setToken(""); setStatus("Security check unavailable. You can email hello@vaxeron.com directly."); } });
    return () => { if (widgetId.current !== null) window.turnstile?.remove(widgetId.current); widgetId.current = null; };
  }, [enabled, siteKey, widgetReady]);
  async function submit(event) {
    event.preventDefault(); if (sending.current) return;
    const form = event.currentTarget;
    const { values, errors: problems } = validateEnquiry(Object.fromEntries(new FormData(form)));
    setErrors(problems); setStatus("");
    if (Object.keys(problems).length) { form.elements.namedItem(Object.keys(problems)[0])?.focus(); return; }
    if (!enabled) { window.location.href = enquiryMailto(values); setStatus("Email draft requested. Review and send it in your email app; nothing has been sent by this website."); return; }
    if (!token) { setStatus("Please complete the security check before sending."); return; }
    sending.current = true; setBusy(true);
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, token }), signal: AbortSignal.timeout(25000) });
      const result = await response.json();
      if (!response.ok) { setErrors(result.errors || {}); setStatus(result.error || "Please try again or email hello@vaxeron.com."); }
      else { form.reset(); setStatus("Thank you. Your enquiry has been submitted. We’ll reply by email."); }
    } catch { setStatus("Delivery could not be confirmed. Please email hello@vaxeron.com or try again later."); }
    finally { sending.current = false; setBusy(false); setToken(""); if (widgetId.current !== null) window.turnstile?.reset(widgetId.current); }
  }
  const field = (name, label, type, maxLength, autoComplete) => <div><label htmlFor={`enquiry-${name}`}>{label}</label><input id={`enquiry-${name}`} name={name} type={type} maxLength={maxLength} autoComplete={autoComplete} required aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `error-${name}` : undefined} />{errors[name] && <p className={styles.error} id={`error-${name}`}>{errors[name]}</p>}</div>;
  return <form className={styles.form} onSubmit={submit} noValidate>
    <h2>Request a demo</h2><p>Tell us a little about your property. We’ll focus the introduction on what matters to your team.</p>
    {!enabled && <p className={styles.notice}>For now, this form prepares an email to <a href="mailto:hello@vaxeron.com">hello@vaxeron.com</a>. You’ll review and send it from your email app.</p>}
    <div className={styles.grid}>{field("name", "Your name", "text", 100, "name")}{field("email", "Work email", "email", 254, "email")}{field("company", "Company or property", "text", 160, "organization")}<div><label htmlFor="enquiry-product">I’m interested in</label><select id="enquiry-product" name="product" defaultValue={initialProduct}>{["Wine", "Hospitality", "Both"].map(value => <option key={value}>{value}</option>)}</select></div></div>
    <div className={styles.honeypot} aria-hidden="true"><label htmlFor="enquiry-website">Leave this field empty</label><input id="enquiry-website" name="website" autoComplete="off" tabIndex={-1} /></div>
    <label htmlFor="enquiry-message">What would you like to improve?</label><textarea id="enquiry-message" name="message" rows={5} minLength={10} maxLength={2000} required aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "error-message" : undefined} />{errors.message && <p className={styles.error} id="error-message">{errors.message}</p>}
    <p className={styles.small}>We use these details to respond to your enquiry, not to subscribe you to marketing. Please don’t include passwords or sensitive guest information. <Link href="/privacy">Privacy notice</Link>.</p>
    {enabled && <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setWidgetReady(true)} onError={() => setStatus("Security check unavailable. Please email hello@vaxeron.com.")} /><div ref={widget} /><p className={styles.small}>Protected against spam by Cloudflare Turnstile. <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare privacy</a>.</p></>}
    <button type="submit" disabled={busy}>{busy ? "Sending…" : enabled ? "Send demo request" : "Open email draft"}</button>
    <p role="status" aria-live="polite" className={styles.status}>{status}</p>
    <noscript><p>JavaScript is needed for this form. Please email <a href="mailto:hello@vaxeron.com">hello@vaxeron.com</a>.</p></noscript>
  </form>;
}
