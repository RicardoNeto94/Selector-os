"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ClockIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  KeyIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import styles from "../../platform-admin.module.css";

function formatDate(value, withTime = false) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function personName(profile) {
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email || "Vaxeron administrator";
}

export default function CustomerControlPage() {
  const { organizationId } = useParams();
  const supabase = useMemo(() => createClient(), []);
  const [customer, setCustomer] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [propertyId, setPropertyId] = useState("");
  const [mfa, setMfa] = useState({ currentLevel: null, verifiedFactor: null });
  const [mfaEnrollment, setMfaEnrollment] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaMessage, setMfaMessage] = useState("");

  const authenticatedFetch = useCallback(async (url, options = {}) => {
    const result = await supabase.auth.getSession();
    if (result.error) throw result.error;
    const token = result.data?.session?.access_token;
    if (!token) throw new Error("Your Vaxeron session has expired.");
    return fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  }, [supabase]);

  const loadCustomer = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch(`/api/platform/customers/${organizationId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Unable to load this customer.");
      setCustomer(result.customer);
      setSessions(result.supportSessions || []);
      setPropertyId((current) => current || result.customer?.properties?.[0]?.id || "");
    } catch (loadError) {
      setError(loadError?.message || "Unable to load this customer.");
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, organizationId]);

  const loadMfa = useCallback(async () => {
    const [assurance, factors] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    if (assurance.error) throw assurance.error;
    if (factors.error) throw factors.error;
    const verifiedFactor = factors.data?.all?.find(
      (factor) => factor.factor_type === "totp" && factor.status === "verified"
    ) || null;
    setMfa({ currentLevel: assurance.data?.currentLevel || "aal1", verifiedFactor });
  }, [supabase]);

  useEffect(() => {
    loadCustomer();
    loadMfa().catch((mfaError) => setMfaMessage(mfaError?.message || "Unable to check MFA status."));
  }, [loadCustomer, loadMfa]);

  async function prepareMfa() {
    setMfaBusy(true);
    setMfaMessage("");
    try {
      if (mfa.verifiedFactor) {
        setMfaEnrollment({ id: mfa.verifiedFactor.id, existing: true });
        return;
      }
      const enrollment = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Vaxeron Control Centre",
      });
      if (enrollment.error) throw enrollment.error;
      setMfaEnrollment(enrollment.data);
    } catch (mfaError) {
      setMfaMessage(mfaError?.message || "Unable to prepare MFA verification.");
    } finally {
      setMfaBusy(false);
    }
  }

  async function verifyMfa() {
    if (!mfaEnrollment?.id || mfaCode.length !== 6) return;
    setMfaBusy(true);
    setMfaMessage("");
    try {
      const verification = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaEnrollment.id,
        code: mfaCode,
      });
      if (verification.error) throw verification.error;
      await loadMfa();
      setMfaEnrollment(null);
      setMfaCode("");
      setMfaMessage("Identity verified. Sensitive support controls are now unlocked for this session.");
    } catch (mfaError) {
      setMfaMessage(mfaError?.message || "The authenticator code could not be verified.");
    } finally {
      setMfaBusy(false);
    }
  }

  async function startSupportSession(event) {
    event.preventDefault();
    setStarting(true);
    setError("");
    try {
      const response = await authenticatedFetch("/api/platform/support-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, propertyId, reason, durationMinutes }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result?.code === "mfa_required") {
          throw new Error("MFA verification is required for this sensitive action. Verify your authenticator in Vaxeron security settings, then try again.");
        }
        throw new Error(result?.error || "Unable to start support access.");
      }
      window.location.assign("/dashboard");
    } catch (startError) {
      setError(startError?.message || "Unable to start support access.");
      setStarting(false);
    }
  }

  const owner = customer?.memberships?.find((membership) => membership.role === "owner");
  const liveIntegration = customer?.integrations?.find((integration) => integration.status === "active");
  const modules = Object.entries(customer?.settings?.enabled_modules || {}).filter(([, enabled]) => enabled);

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <Image src="/selectoros-logo.png" alt="Vaxeron" width={106} height={44} priority />
          <div><strong>VAXERON</strong><span>Control Centre</span></div>
        </div>
        <div className={styles.topActions}>
          <span className={styles.secureBadge}><ShieldCheckIcon /> Protected support</span>
          <Link href="/platform-admin"><ArrowLeftIcon /> Customer portfolio</Link>
        </div>
      </header>

      <section className={`${styles.content} ${styles.customerDetailContent}`}>
        {loading ? <div className={styles.empty}>Loading customer controls…</div> : error && !customer ? (
          <div className={`${styles.message} ${styles.messageError}`}><ExclamationTriangleIcon />{error}</div>
        ) : customer ? (
          <>
            <section className={styles.customerDetailHero}>
              <div className={styles.customerDetailIdentity}>
                <div className={styles.monogram}>{customer.name.slice(0, 1).toUpperCase()}</div>
                <div><span className={styles.eyebrow}>Customer account</span><h1>{customer.name}</h1><p>{customer.properties.map((property) => property.name).join(" · ")}</p></div>
              </div>
              <span className={`${styles.status} ${styles[`status_${customer.status}`]}`}>{customer.status}</span>
            </section>

            {error && <div className={`${styles.message} ${styles.messageError}`}><ExclamationTriangleIcon />{error}</div>}

            <section className={styles.customerDetailMetrics}>
              <article><UserGroupIcon /><span>Owner</span><strong>{personName(owner?.profile)}</strong><small>{owner?.profile?.email || "Not assigned"}</small></article>
              <article><BuildingOffice2Icon /><span>Properties</span><strong>{customer.properties.length}</strong><small>{customer.memberships.filter((item) => item.status === "active").length} active members</small></article>
              <article><CloudIcon /><span>Inventory</span><strong>{customer.settings?.inventory_mode || "manual"}</strong><small>{liveIntegration ? `${liveIntegration.provider} connected` : "No active connection"}</small></article>
              <article><CheckCircleIcon /><span>Modules</span><strong>{modules.length}</strong><small>{modules.map(([name]) => name.replaceAll("_", " ")).join(", ") || "None enabled"}</small></article>
            </section>

            <section className={styles.supportGrid}>
              <form className={styles.supportAccessCard} onSubmit={startSupportSession}>
                <header><div className={styles.supportIcon}><EyeIcon /></div><div><span className={styles.eyebrow}>Just-in-time support</span><h2>Open customer workspace</h2></div></header>
                <p>Enter this customer’s back office without becoming a member. Access is read-only, visible to the customer, automatically expires and is written to the audit log.</p>
                <div className={styles.supportAssurances}>
                  <span><ShieldCheckIcon /> Read-only</span><span><ClockIcon /> Maximum 60 minutes</span><span><KeyIcon /> MFA required</span>
                </div>
                {mfa.currentLevel !== "aal2" ? (
                  <section className={styles.mfaStepUp}>
                    <div>
                      <strong>Verify your identity</strong>
                      <span>{mfa.verifiedFactor ? "Enter a code from your authenticator app." : "Set up an authenticator before opening customer data."}</span>
                    </div>
                    {!mfaEnrollment ? (
                      <button type="button" onClick={prepareMfa} disabled={mfaBusy}>
                        {mfaBusy ? "Preparing…" : mfa.verifiedFactor ? "Verify authenticator" : "Set up MFA"}
                      </button>
                    ) : (
                      <div className={styles.mfaVerification}>
                        {mfaEnrollment.totp?.qr_code ? (
                          <div className={styles.mfaEnrollment}>
                            <Image src={mfaEnrollment.totp.qr_code} alt="Authenticator QR code" width={156} height={156} unoptimized />
                            <span>Scan this code in your authenticator app, then enter the six-digit code.</span>
                          </div>
                        ) : null}
                        <div>
                          <input
                            value={mfaCode}
                            onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            aria-label="Six-digit authenticator code"
                            placeholder="000000"
                          />
                          <button type="button" onClick={verifyMfa} disabled={mfaBusy || mfaCode.length !== 6}>
                            {mfaBusy ? "Verifying…" : "Verify"}
                          </button>
                        </div>
                      </div>
                    )}
                    {mfaMessage ? <small>{mfaMessage}</small> : null}
                  </section>
                ) : (
                  <div className={styles.mfaVerified}><ShieldCheckIcon /><span><strong>Identity verified</strong>MFA is active for this session.</span></div>
                )}
                <label><span>Property</span><select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} required>{customer.properties.filter((property) => property.status === "active").map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
                <label><span>Reason for access</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={8} maxLength={500} required placeholder="Example: Investigating the inventory totals reported by the customer" /></label>
                <label><span>Access duration</span><select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>60 minutes</option></select></label>
                <button className={styles.primaryButton} type="submit" disabled={starting || reason.trim().length < 8 || !propertyId || mfa.currentLevel !== "aal2"}>{starting ? "Securing access…" : "Begin read-only support"}<ArrowRightIcon /></button>
              </form>

              <section className={styles.supportHistoryCard}>
                <header><div><span className={styles.eyebrow}>Audit history</span><h2>Recent support access</h2></div><span>{sessions.length}</span></header>
                {sessions.length ? <div className={styles.supportHistoryList}>{sessions.map((session) => {
                  const ended = Boolean(session.ended_at);
                  const expired = !ended && new Date(session.expires_at) <= new Date();
                  return <article key={session.id}><div><strong>{personName(session.actor)}</strong><span>{session.reason}</span></div><div><span>{formatDate(session.started_at, true)}</span><small className={ended || expired ? styles.sessionClosed : styles.sessionActive}>{ended ? "Ended" : expired ? "Expired" : `Active until ${formatDate(session.expires_at, true)}`}</small></div></article>;
                })}</div> : <div className={styles.supportEmpty}><ShieldCheckIcon /><strong>No support access recorded</strong><span>This customer has not needed an administrator support session.</span></div>}
              </section>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
