"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CONSENT_KEY, CONSENT_DURATION, PUBLIC_SITE_PATHS, readConsent, SITE_ORIGIN } from "@/lib/site/publicSite.mjs";
import styles from "./SiteConsent.module.css";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const configuredHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const host = ["https://eu.i.posthog.com", "https://us.i.posthog.com"].includes(configuredHost) ? configuredHost : null;
const configured = Boolean(key && host);
let analytics;
let loading;

async function loadAnalytics() {
  if (analytics) return analytics;
  if (!loading) loading = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: host, persistence: "memory", autocapture: false,
      capture_pageview: false, capture_pageleave: false,
      disable_session_recording: true, disable_surveys: true,
      advanced_disable_feature_flags: true, advanced_disable_decide: true,
      opt_out_capturing_by_default: true, opt_out_persistence_by_default: true,
      ip: false, person_profiles: "never",
      before_send: (event) => {
        // Never send query strings, fragments, form fields or account identifiers.
        if (!event || !["$pageview", "demo_interest"].includes(event.event)) return null;
        const allowed = ["distinct_id", "$lib", "$lib_version", "$browser", "$os", "$device_type", "$current_url", "path", "product"];
        event.properties = Object.fromEntries(Object.entries(event.properties || {}).filter(([name]) => allowed.includes(name)));
        return event;
      },
    }, "publicWebsite");
    analytics = posthog.publicWebsite;
    return analytics;
  }).catch(() => { loading = null; return null; });
  return loading;
}

export default function SiteConsent() {
  const pathname = usePathname();
  const [marketingHost, setMarketingHost] = useState(false);
  const publicPage = marketingHost && PUBLIC_SITE_PATHS.includes(pathname);
  const [choice, setChoice] = useState(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setMarketingHost(["vaxeron.com", "www.vaxeron.com", "localhost", "127.0.0.1"].includes(window.location.hostname));
    const read = (event) => {
      // Ignore unrelated SDK storage writes; otherwise multiple tabs can retrigger each other.
      if (event && event.key !== CONSENT_KEY && event.key !== null) return;
      try { setChoice(readConsent(localStorage.getItem(CONSENT_KEY))); } catch { setChoice(null); } setReady(true);
    };
    const show = () => setOpen(true);
    read(); window.addEventListener("storage", read); window.addEventListener("vaxeron:privacy", show);
    return () => { window.removeEventListener("storage", read); window.removeEventListener("vaxeron:privacy", show); };
  }, []);
  useEffect(() => {
    if (!choice) return;
    const timer = setInterval(() => {
      if (Date.now() - choice.savedAt >= CONSENT_DURATION) setChoice(null);
    }, 60000);
    return () => clearInterval(timer);
  }, [choice]);
  useEffect(() => {
    let cancelled = false;
    const allowed = configured && publicPage && choice?.analytics === true;
    if (!allowed) { analytics?.opt_out_capturing({ clear_persistence: true }); return; }
    const track = async () => {
      const client = await loadAnalytics();
      if (cancelled || !client) return;
      client.opt_in_capturing({ captureEventName: false, enable_persistence: false });
      client.capture("$pageview", { path: pathname, $current_url: `${SITE_ORIGIN}${pathname}` });
    };
    track();
    const click = (event) => {
      const link = event.target.closest?.("a[data-demo-cta]");
      if (link && analytics) analytics.capture("demo_interest", { path: pathname, product: link.dataset.demoCta, $current_url: `${SITE_ORIGIN}${pathname}` });
    };
    document.addEventListener("click", click);
    return () => { cancelled = true; document.removeEventListener("click", click); analytics?.opt_out_capturing({ clear_persistence: true }); };
  }, [choice, publicPage, pathname]);
  function save(allow) {
    const next = { version: 1, analytics: Boolean(allow && configured), savedAt: Date.now() };
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(next)); } catch { /* Keep the choice in memory if storage is blocked. */ }
    setChoice(next); setOpen(false);
  }
  if (!publicPage || !ready || (choice && !open)) return null;
  return <section className={styles.banner} aria-label="Privacy choices">
    <div><h2>Your privacy, your choice.</h2><p>{configured ? "With your permission, we use PostHog to understand page visits and demo interest. No advertising, session recordings or form contents are collected." : "Only essential browser storage is active. Optional analytics are currently disabled."} <Link href="/cookies">Cookie details</Link></p></div>
    <div className={styles.actions}><button type="button" onClick={() => save(false)}>{configured ? "Reject optional" : "Continue with essentials"}</button>{configured && <button type="button" onClick={() => save(true)}>Allow analytics</button>}</div>
  </section>;
}

export function CookieSettingsButton() {
  return <button type="button" className={styles.settings} onClick={() => window.dispatchEvent(new Event("vaxeron:privacy"))}>Privacy choices</button>;
}
