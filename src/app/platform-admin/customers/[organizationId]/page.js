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
  CreditCardIcon,
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
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [commercial, setCommercial] = useState(null);

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
      setCommercial({
        status: result.customer?.status || "active",
        plan: result.customer?.settings?.plan || "pilot",
        billingMode: result.customer?.settings?.billing_mode || "platform_managed",
        inventoryMode: result.customer?.settings?.inventory_mode || "manual",
        onboardingStatus: result.customer?.settings?.onboarding_status || "invited",
        internalNotes: result.customer?.settings?.internal_notes || "",
        enabledModules: {
          wine: Boolean(result.customer?.settings?.enabled_modules?.wine),
          dining: Boolean(result.customer?.settings?.enabled_modules?.dining),
          spa: Boolean(result.customer?.settings?.enabled_modules?.spa),
          guest_experience: Boolean(result.customer?.settings?.enabled_modules?.guest_experience),
        },
      });
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

  async function saveCommercialSettings(event) {
    event.preventDefault();
    setSettingsSaving(true);
    setError("");
    try {
      const response = await authenticatedFetch(`/api/platform/customers/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commercial),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Unable to save commercial settings.");
      await loadCustomer();
    } catch (saveError) {
      setError(saveError?.message || "Unable to save commercial settings.");
    } finally {
      setSettingsSaving(false);
    }
  }

  const owner = customer?.memberships?.find((membership) => membership.role === "owner");
  const liveIntegration = customer?.integrations?.find((integration) => integration.status === "active");
  const modules = Object.entries(customer?.settings?.enabled_modules || {}).filter(([, enabled]) => enabled);

  const navigation = [
    ["overview", "Overview", CheckCircleIcon],
    ["commercial", "Subscription", CreditCardIcon],
    ["modules", "Features", CloudIcon],
    ["properties", "Properties", BuildingOffice2Icon],
    ["team", "Team", UserGroupIcon],
    ["integrations", "Integrations", CloudIcon],
    ["support", "Support access", EyeIcon],
    ["audit", "Audit history", ClockIcon],
  ];

  return (
    <main className={styles.shell}>
      <header className={`${styles.topbar} ${styles.adminTopbar}`}>
        <div className={styles.brand}>
          <Image src="/selectoros-logo.png" alt="Vaxeron" width={106} height={44} priority />
          <div><strong>VAXERON</strong><span>Platform administration</span></div>
        </div>
        <div className={styles.topActions}>
          <span className={styles.secureBadge}><ShieldCheckIcon /> Protected support</span>
          <Link href="/platform-admin"><ArrowLeftIcon /> Portfolio</Link>
        </div>
      </header>

      {loading ? <div className={styles.empty}>Loading customer controls…</div> : error && !customer ? (
        <div className={`${styles.message} ${styles.messageError}`}><ExclamationTriangleIcon />{error}</div>
      ) : customer ? (
        <div className={styles.customerAdminLayout}>
          <aside className={styles.customerAdminSidebar}>
            <Link className={styles.sidebarBack} href="/platform-admin"><ArrowLeftIcon /> Customer portfolio</Link>
            <div className={styles.sidebarCustomer}>
              <div className={styles.monogram}>{customer.name.slice(0, 1).toUpperCase()}</div>
              <div><strong>{customer.name}</strong><span>{customer.properties[0]?.name || "No property"}</span></div>
            </div>
            <nav aria-label="Customer management sections">
              {navigation.map(([id, label, Icon]) => <a key={id} href={`#${id}`}><Icon /><span>{label}</span></a>)}
            </nav>
            <div className={styles.sidebarAccountState}>
              <span>Account</span>
              <strong className={`${styles.status} ${styles[`status_${customer.status}`]}`}>{customer.status}</strong>
              <small>Created {formatDate(customer.created_at)}</small>
            </div>
          </aside>

          <section className={styles.customerAdminMain}>
            <section className={styles.compactCustomerHero} id="overview">
              <div><span className={styles.eyebrow}>Customer account</span><h1>{customer.name}</h1><p>{customer.properties.map((property) => property.name).join(" · ")}</p></div>
              <div className={styles.heroMeta}><span>Customer ID</span><code>{customer.id.slice(0, 8)}</code></div>
            </section>

            {error && <div className={`${styles.message} ${styles.messageError}`}><ExclamationTriangleIcon />{error}</div>}

            <section className={styles.compactMetrics}>
              <article><span>Owner</span><strong>{personName(owner?.profile)}</strong><small>{owner?.profile?.email || "Not assigned"}</small></article>
              <article><span>Properties</span><strong>{customer.properties.length}</strong><small>{customer.memberships.filter((item) => item.status === "active").length} active members</small></article>
              <article><span>Inventory</span><strong>{customer.settings?.inventory_mode || "manual"}</strong><small>{liveIntegration ? `${liveIntegration.provider} connected` : "No active connection"}</small></article>
              <article><span>Features</span><strong>{modules.length}</strong><small>{modules.map(([name]) => name.replaceAll("_", " ")).join(", ") || "None enabled"}</small></article>
            </section>

            {commercial && <form className={styles.adminPanel} onSubmit={saveCommercialSettings}>
              <section id="commercial" className={styles.panelSection}>
                <header className={styles.panelHeader}><div><span className={styles.eyebrow}>Commercial</span><h2>Subscription & account</h2><p>Control the customer lifecycle, plan, billing authority and inventory source.</p></div><CreditCardIcon /></header>
                <div className={styles.billingSummary}>
                  <div><span>Subscription</span><strong>{(customer.settings?.billing_status || "not configured").replaceAll("_", " ")}</strong></div>
                  <div><span>Period end</span><strong>{formatDate(customer.settings?.current_period_end)}</strong></div>
                  <div><span>Renewal</span><strong>{customer.settings?.cancel_at_period_end ? "Cancels" : customer.settings?.billing_mode === "stripe" ? "Automatic" : "Vaxeron managed"}</strong></div>
                  <div><span>Stripe</span><strong>{customer.settings?.stripe_customer_id ? `…${customer.settings.stripe_customer_id.slice(-8)}` : "Not connected"}</strong></div>
                </div>
                <div className={styles.customerFormGrid}>
                  <label><span>Account status</span><select value={commercial.status} onChange={(event) => setCommercial((value) => ({ ...value, status: event.target.value }))}><option value="active">Active</option><option value="suspended">Suspended</option><option value="archived">Archived</option></select></label>
                  <label><span>Plan</span><select value={commercial.plan} onChange={(event) => setCommercial((value) => ({ ...value, plan: event.target.value }))}><option value="pilot">Pilot</option><option value="starter">Wine Operations</option><option value="professional">Digital Wine</option><option value="hospitality_suite">Hospitality Suite</option><option value="enterprise">Enterprise</option></select></label>
                  <label><span>Billing authority</span><select value={commercial.billingMode} onChange={(event) => setCommercial((value) => ({ ...value, billingMode: event.target.value }))}><option value="platform_managed">Vaxeron managed</option><option value="stripe">Stripe subscription</option></select></label>
                  <label><span>Inventory source</span><select value={commercial.inventoryMode} onChange={(event) => setCommercial((value) => ({ ...value, inventoryMode: event.target.value }))}><option value="manual">Manual</option><option value="csv">CSV</option><option value="api">API integration</option><option value="hybrid">Hybrid</option></select></label>
                  <label><span>Onboarding stage</span><select value={commercial.onboardingStatus} onChange={(event) => setCommercial((value) => ({ ...value, onboardingStatus: event.target.value }))}><option value="invited">Invited</option><option value="in_progress">In progress</option><option value="ready">Ready</option><option value="live">Live</option><option value="paused">Paused</option></select></label>
                </div>
              </section>

              <section id="modules" className={styles.panelSection}>
                <header className={styles.panelHeader}><div><span className={styles.eyebrow}>Entitlements</span><h2>Enabled features</h2><p>Only selected modules are available inside this customer workspace.</p></div><CloudIcon /></header>
                <div className={styles.moduleControlGrid}>
                  {[["wine", "Wine operations", "Inventory, locations and ordering"], ["guest_experience", "Digital wine lists", "Public menus and PWA experiences"], ["dining", "Dining", "Dishes and restaurant menus"], ["spa", "Spa", "Treatments, self-care and F&B"]].map(([key, label, description]) => <label key={key} className={commercial.enabledModules[key] ? styles.moduleControlActive : ""}><input type="checkbox" checked={commercial.enabledModules[key]} onChange={() => setCommercial((value) => ({ ...value, enabledModules: { ...value.enabledModules, [key]: !value.enabledModules[key] } }))} /><span><strong>{label}</strong><small>{description}</small></span><i>{commercial.enabledModules[key] ? "Enabled" : "Off"}</i></label>)}
                </div>
                <label className={styles.notesField}><span>Internal account notes</span><textarea value={commercial.internalNotes} onChange={(event) => setCommercial((value) => ({ ...value, internalNotes: event.target.value }))} maxLength={4000} placeholder="Private operational notes visible only to Vaxeron platform administrators" /></label>
                <div className={styles.panelSave}><button className={styles.primaryButton} type="submit" disabled={settingsSaving}>{settingsSaving ? "Saving…" : "Save account settings"}<ArrowRightIcon /></button></div>
              </section>
            </form>}

            <section className={styles.managementGrid}>
              <section className={styles.adminPanel} id="properties">
                <header className={styles.panelHeader}><div><span className={styles.eyebrow}>Portfolio</span><h2>Properties</h2></div><BuildingOffice2Icon /></header>
                <div className={styles.managementList}>{customer.properties.map((property) => <article key={property.id}><div><strong>{property.name}</strong><span>/{property.slug}</span></div><small className={`${styles.status} ${styles[`status_${property.status}`]}`}>{property.status}</small></article>)}</div>
              </section>
              <section className={styles.adminPanel} id="integrations">
                <header className={styles.panelHeader}><div><span className={styles.eyebrow}>Connections</span><h2>Integrations</h2></div><CloudIcon /></header>
                {customer.integrations.length ? <div className={styles.managementList}>{customer.integrations.map((integration) => <article key={integration.id}><div><strong>{integration.display_name || integration.provider}</strong><span>Last success {formatDate(integration.last_successful_sync_at, true)}</span></div><small className={`${styles.status} ${styles[`status_${integration.status}`]}`}>{integration.status}</small></article>)}</div> : <div className={styles.compactEmpty}>No integration connections configured.</div>}
              </section>
            </section>

            <section className={styles.adminPanel} id="team">
              <header className={styles.panelHeader}><div><span className={styles.eyebrow}>Access</span><h2>Customer team</h2><p>Workspace membership and account state.</p></div><UserGroupIcon /></header>
              <div className={styles.teamTable}>{customer.memberships.map((membership) => <article key={membership.user_id}><div><strong>{personName(membership.profile)}</strong><span>{membership.profile?.email || membership.user_id}</span></div><span>{membership.role}</span><small className={`${styles.status} ${styles[`status_${membership.status}`]}`}>{membership.status}</small></article>)}</div>
            </section>

            <section className={styles.supportGrid}>
              <form className={styles.adminPanel} id="support" onSubmit={startSupportSession}>
                <header className={styles.panelHeader}><div><span className={styles.eyebrow}>Just-in-time support</span><h2>Open customer workspace</h2><p>Time-limited, read-only and fully audited.</p></div><EyeIcon /></header>
                <div className={styles.supportAssurances}><span><ShieldCheckIcon /> Read-only</span><span><ClockIcon /> Up to 60 minutes</span><span><KeyIcon /> MFA required</span></div>
                {mfa.currentLevel !== "aal2" ? (
                  <section className={styles.mfaStepUp}>
                    <div><strong>Verify your identity</strong><span>{mfa.verifiedFactor ? "Enter a code from your authenticator app." : "Set up an authenticator before opening customer data."}</span></div>
                    {!mfaEnrollment ? <button type="button" onClick={prepareMfa} disabled={mfaBusy}>{mfaBusy ? "Preparing…" : mfa.verifiedFactor ? "Verify authenticator" : "Set up MFA"}</button> : <div className={styles.mfaVerification}>{mfaEnrollment.totp?.qr_code ? <div className={styles.mfaEnrollment}><Image src={mfaEnrollment.totp.qr_code} alt="Authenticator QR code" width={156} height={156} unoptimized /><span>Scan this code, then enter the six-digit code.</span></div> : null}<div><input value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label="Six-digit authenticator code" placeholder="000000" /><button type="button" onClick={verifyMfa} disabled={mfaBusy || mfaCode.length !== 6}>{mfaBusy ? "Verifying…" : "Verify"}</button></div></div>}
                    {mfaMessage ? <small>{mfaMessage}</small> : null}
                  </section>
                ) : <div className={styles.mfaVerified}><ShieldCheckIcon /><span><strong>Identity verified</strong>MFA is active for this session.</span></div>}
                <div className={styles.supportFormGrid}>
                  <label><span>Property</span><select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} required>{customer.properties.filter((property) => property.status === "active").map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
                  <label><span>Duration</span><select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>60 minutes</option></select></label>
                  <label className={styles.wide}><span>Reason for access</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={8} maxLength={500} required placeholder="Example: Investigating inventory totals reported by the customer" /></label>
                </div>
                <button className={styles.primaryButton} type="submit" disabled={starting || reason.trim().length < 8 || !propertyId || mfa.currentLevel !== "aal2"}>{starting ? "Securing access…" : "Begin read-only support"}<ArrowRightIcon /></button>
              </form>

              <section className={styles.adminPanel} id="audit">
                <header className={styles.panelHeader}><div><span className={styles.eyebrow}>Audit history</span><h2>Support sessions</h2></div><span className={styles.countBadge}>{sessions.length}</span></header>
                {sessions.length ? <div className={styles.supportHistoryList}>{sessions.map((session) => { const ended = Boolean(session.ended_at); const expired = !ended && new Date(session.expires_at) <= new Date(); return <article key={session.id}><div><strong>{personName(session.actor)}</strong><span>{session.reason}</span></div><div><span>{formatDate(session.started_at, true)}</span><small className={ended || expired ? styles.sessionClosed : styles.sessionActive}>{ended ? "Ended" : expired ? "Expired" : `Active until ${formatDate(session.expires_at, true)}`}</small></div></article>; })}</div> : <div className={styles.compactEmpty}>No administrator support sessions recorded.</div>}
              </section>
            </section>
          </section>
        </div>
      ) : null}
    </main>
  );
}
