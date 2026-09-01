"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  CircleStackIcon,
  CloudIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import styles from "./platform-admin.module.css";

const EMPTY_FORM = {
  organizationName: "",
  propertyName: "",
  slug: "",
  ownerFirstName: "",
  ownerLastName: "",
  ownerEmail: "",
  timezone: "Europe/Tallinn",
  currencyCode: "EUR",
  plan: "pilot",
  inventoryMode: "manual",
  enabledModules: {
    wine: true,
    dining: false,
    spa: false,
    guest_experience: false,
  },
};

const MODULE_LABELS = {
  wine: "Wine operations",
  dining: "Dining",
  spa: "Spa",
  guest_experience: "Guest experience",
};

function ownerName(owner) {
  return [owner?.first_name, owner?.last_name].filter(Boolean).join(" ") || "Owner pending";
}

function formatDate(value) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function hasLiveConnection(customer) {
  return customer.integrations?.some((item) => item.status === "active")
    || customer.latestCompucashSync?.status === "succeeded";
}

function formatInventoryMode(value) {
  const normalized = String(value || "manual").toLowerCase();
  return normalized === "api" ? "API" : normalized.replaceAll("_", " ");
}

export default function PlatformAdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [customers, setCustomers] = useState([]);
  const [platformRole, setPlatformRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const authenticatedFetch = useCallback(async (url, options = {}) => {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const token = data?.session?.access_token;
    if (!token) throw new Error("Your Vaxeron session has expired.");
    return fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  }, [supabase]);

  const loadCustomers = useCallback(async ({ quiet = false } = {}) => {
    quiet ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch("/api/platform/customers");
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Unable to load customers.");
      setCustomers(result.customers || []);
      setPlatformRole(result.currentRole || "");
    } catch (loadError) {
      setError(loadError?.message || "Unable to load customers.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event) => event.key === "Escape" && !creating && setModalOpen(false);
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [modalOpen, creating]);

  const metrics = useMemo(() => ({
    total: customers.length,
    live: customers.filter((customer) => customer.status === "active" && customer.settings?.onboarding_status === "live").length,
    onboarding: customers.filter((customer) => ["invited", "in_progress", "ready"].includes(customer.settings?.onboarding_status)).length,
    integrations: customers.filter(hasLiveConnection).length,
  }), [customers]);

  const visibleCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return customers.filter((customer) => {
      const onboarding = customer.settings?.onboarding_status || "unconfigured";
      const matchesFilter = portfolioFilter === "all"
        || (portfolioFilter === "live" && customer.status === "active" && onboarding === "live")
        || (portfolioFilter === "onboarding" && ["invited", "in_progress", "ready"].includes(onboarding))
        || (portfolioFilter === "connected" && hasLiveConnection(customer))
        || (portfolioFilter === "attention" && (customer.status !== "active" || ["paused", "unconfigured"].includes(onboarding)));
      if (!matchesFilter) return false;
      if (!query) return true;
      return [
        customer.name,
        customer.properties?.[0]?.name,
        customer.owner?.email,
        ownerName(customer.owner),
      ].filter(Boolean).some((value) => value.toLowerCase().includes(query));
    });
  }, [customers, portfolioFilter, searchQuery]);

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleModule(module) {
    setForm((current) => ({
      ...current,
      enabledModules: { ...current.enabledModules, [module]: !current.enabledModules[module] },
    }));
  }

  async function createCustomer(event) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch("/api/platform/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Unable to create customer.");
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setNotice(`${form.organizationName} was created and ${form.ownerEmail} was invited as owner.`);
      await loadCustomers({ quiet: true });
    } catch (createError) {
      setError(createError?.message || "Unable to create customer.");
    } finally {
      setCreating(false);
    }
  }

  async function updateCustomer(customer, patch) {
    setUpdatingId(customer.id);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch(`/api/platform/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Unable to update customer.");
      setNotice(`${customer.name} was updated.`);
      await loadCustomers({ quiet: true });
    } catch (updateError) {
      setError(updateError?.message || "Unable to update customer.");
    } finally {
      setUpdatingId("");
    }
  }

  async function resendOwnerInvitation(customer) {
    setUpdatingId(customer.id);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch(`/api/platform/customers/${customer.id}/resend-owner`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Unable to resend invitation.");
      setNotice(`A new owner invitation was sent to ${result.email}.`);
    } catch (resendError) {
      setError(resendError?.message || "Unable to resend invitation.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main className={styles.shell}>
      <header className={`${styles.topbar} ${styles.adminTopbar}`}>
        <div className={styles.brand}>
          <Image src="/selectoros-logo.png" alt="Vaxeron" width={106} height={44} priority />
          <div><strong>VAXERON</strong><span>Platform administration</span></div>
        </div>
        <div className={styles.topActions}>
          <span className={styles.secureBadge}><ShieldCheckIcon /> {platformRole.replaceAll("_", " ") || "Platform access"}</span>
          <Link href="/dashboard">Open my workspace <ArrowRightIcon /></Link>
        </div>
      </header>

      <section className={styles.platformAdminLayout}>
        <aside className={styles.platformSidebar}>
          <div className={styles.platformSidebarIntro}>
            <span className={styles.eyebrow}>Platform console</span>
            <strong>Operations</strong>
            <small>{metrics.total} customer workspaces</small>
          </div>
          <nav aria-label="Platform administration">
            <button type="button" className={portfolioFilter === "all" ? styles.platformNavActive : ""} onClick={() => setPortfolioFilter("all")}><Squares2X2Icon /><span>All customers</span><i>{metrics.total}</i></button>
            <button type="button" className={portfolioFilter === "live" ? styles.platformNavActive : ""} onClick={() => setPortfolioFilter("live")}><CheckCircleIcon /><span>Live accounts</span><i>{metrics.live}</i></button>
            <button type="button" className={portfolioFilter === "onboarding" ? styles.platformNavActive : ""} onClick={() => setPortfolioFilter("onboarding")}><UsersIcon /><span>Onboarding</span><i>{metrics.onboarding}</i></button>
            <button type="button" className={portfolioFilter === "connected" ? styles.platformNavActive : ""} onClick={() => setPortfolioFilter("connected")}><CloudIcon /><span>Connections</span><i>{metrics.integrations}</i></button>
            <button type="button" className={portfolioFilter === "attention" ? styles.platformNavActive : ""} onClick={() => setPortfolioFilter("attention")}><ExclamationTriangleIcon /><span>Needs attention</span></button>
          </nav>
          <div className={styles.platformSidebarGroup}>
            <span>Management</span>
            <a href="#portfolio"><BuildingOffice2Icon />Customer portfolio</a>
            <a href="#subscriptions"><CircleStackIcon />Subscriptions</a>
            <a href="#support"><ShieldCheckIcon />Support access</a>
            <a href="#settings"><Cog6ToothIcon />Platform settings</a>
          </div>
          <button type="button" className={styles.sidebarCreateButton} onClick={() => { setForm(EMPTY_FORM); setError(""); setModalOpen(true); }}><PlusIcon />New customer</button>
          <div className={styles.platformRole}><ShieldCheckIcon /><div><strong>{platformRole.replaceAll("_", " ") || "Platform access"}</strong><span>Protected administration</span></div></div>
        </aside>

        <div className={styles.platformAdminMain}>
          <section className={styles.platformOverview} id="portfolio">
            <div className={styles.platformOverviewHeader}>
              <div><span className={styles.eyebrow}>Vaxeron operations</span><h1>Customer portfolio</h1><p>Provision, monitor and support every hospitality workspace from one protected console.</p></div>
              <button type="button" className={styles.primaryButton} onClick={() => { setForm(EMPTY_FORM); setError(""); setModalOpen(true); }}><PlusIcon />New customer</button>
            </div>

            {(error || notice) && (
              <div className={`${styles.message} ${error ? styles.messageError : styles.messageSuccess}`} role="status">
                {error ? <ExclamationTriangleIcon /> : <CheckCircleIcon />}<span>{error || notice}</span>
                <button type="button" onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss"><XMarkIcon /></button>
              </div>
            )}

            <section className={styles.platformMetricStrip} aria-label="Platform summary">
              <button type="button" onClick={() => setPortfolioFilter("all")}><span>Customers</span><strong>{metrics.total}</strong><small>Organizations provisioned</small></button>
              <button type="button" onClick={() => setPortfolioFilter("live")}><span>Live</span><strong>{metrics.live}</strong><small>Fully operational</small></button>
              <button type="button" onClick={() => setPortfolioFilter("onboarding")}><span>Onboarding</span><strong>{metrics.onboarding}</strong><small>Setup in progress</small></button>
              <button type="button" onClick={() => setPortfolioFilter("connected")}><span>Connections</span><strong>{metrics.integrations}</strong><small>Active inventory feeds</small></button>
            </section>
          </section>

          <section className={styles.portfolioDirectory} id="customers">
            <header className={styles.portfolioToolbar}>
              <div><span className={styles.eyebrow}>Customer management</span><h2>{portfolioFilter === "all" ? "All organizations" : portfolioFilter.replaceAll("_", " ")}</h2></div>
              <div className={styles.portfolioTools}>
                <label><MagnifyingGlassIcon /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search customers, owners or properties" /></label>
                <button type="button" onClick={() => loadCustomers({ quiet: true })} disabled={refreshing} aria-label="Refresh customers"><ArrowPathIcon className={refreshing ? styles.spinning : ""} /></button>
              </div>
            </header>

            {loading ? (
              <div className={styles.empty}>Loading Vaxeron customers…</div>
            ) : customers.length === 0 ? (
              <div className={styles.empty}><BuildingOffice2Icon /><strong>No customer organizations yet</strong><span>Create the first workspace when a customer is ready to begin onboarding.</span></div>
            ) : visibleCustomers.length === 0 ? (
              <div className={styles.empty}><MagnifyingGlassIcon /><strong>No matching customers</strong><span>Change the portfolio filter or search term.</span></div>
            ) : (
              <div className={styles.compactCustomerList}>
                {visibleCustomers.map((customer) => {
                const settings = customer.settings || {};
                const modules = settings.enabled_modules || {};
                const integration = customer.integrations.find((item) => item.status === "active");
                const compucashSync = customer.latestCompucashSync?.status === "succeeded"
                  ? customer.latestCompucashSync
                  : null;
                const inventoryDetail = integration
                  ? `${integration.provider} connected`
                  : compucashSync
                    ? `Compucash synced ${formatDate(compucashSync.completed_at || compucashSync.started_at)}`
                    : "No live API connection";
                return (
                    <article className={styles.compactCustomerRow} key={customer.id}>
                      <div className={styles.compactCustomerIdentity}>
                        <div className={styles.monogram}>{customer.name.slice(0, 1).toUpperCase()}</div>
                        <div><div className={styles.customerTitle}><h3>{customer.name}</h3><span className={`${styles.status} ${styles[`status_${customer.status}`]}`}>{customer.status}</span></div><p>{customer.properties[0]?.name || "First property pending"} · {ownerName(customer.owner)}</p><small>{customer.owner?.email || "No owner profile"}</small></div>
                      </div>
                      <div className={styles.compactCustomerSignals}>
                        <div><span>Onboarding</span><strong>{(settings.onboarding_status || "unconfigured").replaceAll("_", " ")}</strong><small>{customer.owner?.membershipStatus === "invited" ? "Invite pending" : "Membership active"}</small></div>
                        <div><span>Inventory</span><strong>{formatInventoryMode(settings.inventory_mode || (compucashSync ? "api" : "manual"))}</strong><small>{inventoryDetail}</small></div>
                        <div><span>Plan</span><strong>{(settings.plan || "pilot").replaceAll("_", " ")}</strong><small>{settings.billing_mode === "stripe" ? `Stripe · ${(settings.billing_status || "not configured").replaceAll("_", " ")}` : "Vaxeron managed"}</small></div>
                        <div><span>Modules</span><strong>{Object.values(modules).filter(Boolean).length}</strong><small>{Object.entries(MODULE_LABELS).filter(([key]) => modules[key]).map(([, label]) => label).join(", ") || "None enabled"}</small></div>
                      </div>
                      <div className={styles.compactCustomerActions}>
                        <Link className={styles.manageCustomerButton} href={`/platform-admin/customers/${customer.id}`}>Manage <ArrowRightIcon /></Link>
                        {customer.owner?.membershipStatus === "invited" && <button type="button" className={styles.resendButton} disabled={updatingId === customer.id} onClick={() => resendOwnerInvitation(customer)}>Resend invite</button>}
                        <div><label><span>Stage</span><select value={settings.onboarding_status || "invited"} disabled={updatingId === customer.id} onChange={(event) => updateCustomer(customer, { onboardingStatus: event.target.value })}><option value="invited">Invited</option><option value="in_progress">In progress</option><option value="ready">Ready</option><option value="live">Live</option><option value="paused">Paused</option></select></label><label><span>Account</span><select value={customer.status} disabled={updatingId === customer.id} onChange={(event) => updateCustomer(customer, { status: event.target.value })}><option value="active">Active</option><option value="suspended">Suspended</option><option value="archived">Archived</option></select></label></div>
                      </div>
                    </article>
                );
              })}
            </div>
          )}
          </section>

          <section className={styles.platformFooterPanels} id="subscriptions">
            <article><CircleStackIcon /><div><span>Commercial controls</span><strong>Plans &amp; subscriptions</strong><p>Open any customer to manage billing authority, plan access and renewal status.</p></div></article>
            <article id="support"><ShieldCheckIcon /><div><span>Protected operations</span><strong>Support access</strong><p>Customer workspaces are available through time-limited, audited support sessions.</p></div></article>
            <article id="settings"><Cog6ToothIcon /><div><span>Platform configuration</span><strong>System settings</strong><p>Entitlements and integration access remain controlled per organization.</p></div></article>
          </section>
        </div>
      </section>

      {modalOpen && (
        <div className={styles.modalLayer} role="dialog" aria-modal="true" aria-labelledby="new-customer-title">
          <button type="button" className={styles.backdrop} aria-label="Close" onClick={() => !creating && setModalOpen(false)} />
          <form className={styles.modal} onSubmit={createCustomer}>
            <header><div><span className={styles.eyebrow}>Secure provisioning</span><h2 id="new-customer-title">Create a customer</h2><p>This creates an isolated organization, its first property and a protected owner invitation.</p></div><button type="button" onClick={() => !creating && setModalOpen(false)} aria-label="Close"><XMarkIcon /></button></header>
            <div className={styles.formBody}>
              <fieldset><legend>Customer</legend><div className={styles.formGrid}>
                <label><span>Organization name</span><input required value={form.organizationName} onChange={(event) => setField("organizationName", event.target.value)} placeholder="Nordic Hospitality Group" /></label>
                <label><span>First property</span><input required value={form.propertyName} onChange={(event) => setField("propertyName", event.target.value)} placeholder="Harbour Hotel" /></label>
                <label><span>Workspace slug</span><input value={form.slug} onChange={(event) => setField("slug", event.target.value)} placeholder="harbour-hotel" /></label>
                <label><span>Timezone</span><input required value={form.timezone} onChange={(event) => setField("timezone", event.target.value)} /></label>
              </div></fieldset>
              <fieldset><legend>Protected owner</legend><div className={styles.formGrid}>
                <label><span>First name</span><input required value={form.ownerFirstName} onChange={(event) => setField("ownerFirstName", event.target.value)} /></label>
                <label><span>Last name</span><input required value={form.ownerLastName} onChange={(event) => setField("ownerLastName", event.target.value)} /></label>
                <label className={styles.wide}><span>Work email</span><input required type="email" value={form.ownerEmail} onChange={(event) => setField("ownerEmail", event.target.value)} placeholder="owner@company.com" /></label>
              </div></fieldset>
              <fieldset><legend>Commercial setup</legend><div className={styles.formGrid}>
                <label><span>Plan</span><select value={form.plan} onChange={(event) => setField("plan", event.target.value)}><option value="pilot">Pilot</option><option value="starter">Wine Operations</option><option value="professional">Digital Wine</option><option value="hospitality_suite">Hospitality Suite</option><option value="enterprise">Enterprise</option></select></label>
                <label><span>Inventory source</span><select value={form.inventoryMode} onChange={(event) => setField("inventoryMode", event.target.value)}><option value="manual">Manual</option><option value="csv">CSV import</option><option value="api">API integration</option><option value="hybrid">Hybrid</option></select></label>
              </div><div className={styles.modulePicker}>{Object.entries(MODULE_LABELS).map(([key, label]) => <label key={key} className={form.enabledModules[key] ? styles.moduleSelected : ""}><input type="checkbox" checked={form.enabledModules[key]} onChange={() => toggleModule(key)} /><span>{label}</span></label>)}</div></fieldset>
              {error && <div className={`${styles.message} ${styles.messageError}`}><ExclamationTriangleIcon />{error}</div>}
            </div>
            <footer><button type="button" onClick={() => !creating && setModalOpen(false)}>Cancel</button><button type="submit" className={styles.primaryButton} disabled={creating}>{creating ? "Creating workspace…" : "Create and invite owner"}<ArrowRightIcon /></button></footer>
          </form>
        </div>
      )}
    </main>
  );
}
