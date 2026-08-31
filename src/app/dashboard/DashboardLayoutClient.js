"use client";

import "../../styles/dashboard.css";

import Link from "next/link";
import Image from "next/image";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardWorkspaceProvider } from "@/components/dashboard/WorkspaceContext";

import {
  Squares2X2Icon,
  RectangleStackIcon,
  SwatchIcon,
  Cog6ToothIcon,
  BeakerIcon,
  BuildingStorefrontIcon,
  CircleStackIcon,
  SparklesIcon,
  ArrowsRightLeftIcon,
  ClipboardDocumentCheckIcon,
  BellAlertIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  XMarkIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

const QUICK_DESTINATIONS = [
  ["Dashboard", "Operational overview", "/dashboard"],
  ["Dishes", "Dish catalogue and allergen details", "/dashboard/dishes"],
  ["Menus", "Restaurant menus and publishing", "/dashboard/menu"],
  ["Dining", "Guest dining experiences", "/dashboard/experiences"],
  ["Spa", "Treatments, products and spa experiences", "/dashboard/spa"],
  ["Wine Cellar", "Wine catalogue and records", "/dashboard/wines"],
  ["Venue Wines", "Venue stock and guest wine lists", "/dashboard/wine-cellar/venues"],
  ["Stock Control", "Inventory balances by location", "/dashboard/wine-cellar/inventory"],
  ["Stock Issues", "Reconciliation and exceptions", "/dashboard/wine-cellar/reconciliation"],
  ["Ordering", "Zero-stock notifications from Compucash", "/dashboard/wine-cellar/ordering"],
  ["Movements", "Transfers and stock history", "/dashboard/wine-cellar/transfers"],
  ["Team & Access", "Users, roles and invitations", "/dashboard/team"],
  ["Settings", "Organisation and platform settings", "/dashboard/settings"],
];

/* =======================================================
   NAV ITEM
======================================================= */

function NavItem({
  href,
  isActive,
  icon: Icon,
  label,
  badge,
}) {
  return (
    <Link
      href={href}
      className={
        "so-nav-item " +
        (isActive
          ? "so-nav-item--active"
          : "")
      }
    >
      <div className="so-nav-icon-wrap">
        <Icon className="so-nav-icon" />
      </div>

      <span className="so-nav-label">
        {label}
      </span>
      {Number(badge) > 0 && <span className="so-nav-badge" aria-label={`${badge} items need attention`}>{Number(badge) > 99 ? "99+" : badge}</span>}
    </Link>
  );
}

/* =======================================================
   SECTION LABEL
======================================================= */

function SectionLabel({
  children,
}) {
  return (
    <div className="so-sidebar-section-label">
      {children}
    </div>
  );
}

function NavGroup({ label, open, active, onToggle, children }) {
  return (
    <section className={`so-nav-group ${open ? "is-open" : ""} ${active ? "has-active" : ""}`}>
      <button
        type="button"
        className="so-nav-group-trigger"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{label}</span>
        <ChevronDownIcon aria-hidden="true" />
      </button>
      {open && <div className="so-nav-group-items">{children}</div>}
    </section>
  );
}

/* =======================================================
   DASHBOARD LAYOUT
======================================================= */

export default function DashboardLayout({
  children,
  workspace,
  platformAdministrator,
}) {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [orderingAlerts, setOrderingAlerts] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationSummary, setNotificationSummary] = useState({});
  const [endingSupport, setEndingSupport] = useState(false);
  const [navReady, setNavReady] = useState(false);
  const [openGroups, setOpenGroups] = useState({ experience: true, wine: true, account: true });
  const supportMode = workspace?.source === "support" && Boolean(workspace?.supportSession);

  useEffect(() => {
    if (supportMode) return undefined;
    let active = true;
    fetch("/api/wine-cellar/orders?summary=1", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!active) return;
        const summary = result?.summary || {};
        setOrderingAlerts(Number(summary.notifications || 0));
        setNotificationSummary(summary);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [pathname, supportMode]);

  useEffect(() => {
    function handleCommandKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }

      if (event.key === "Escape") {
        setCommandOpen(false);
        setNotificationOpen(false);
        setAccountMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleCommandKey);
    return () => window.removeEventListener("keydown", handleCommandKey);
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem("vaxeron-sidebar-groups") || "{}");
      setOpenGroups((current) => ({ ...current, ...stored }));
    } catch {}
    setNavReady(true);
  }, []);

  useEffect(() => {
    if (!navReady) return;
    window.localStorage.setItem("vaxeron-sidebar-groups", JSON.stringify(openGroups));
  }, [navReady, openGroups]);

  useEffect(() => {
    setNotificationOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  const filteredDestinations = QUICK_DESTINATIONS.filter(([label, detail, href]) =>
    (!supportMode || !["/dashboard/team", "/dashboard/settings", "/dashboard/wine-cellar/ordering"].includes(href)) &&
    `${label} ${detail}`.toLowerCase().includes(commandQuery.trim().toLowerCase())
  );

  async function endSupportSession() {
    setEndingSupport(true);
    try {
      await fetch("/api/platform/support-sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: workspace?.supportSession?.id }),
      });
    } finally {
      window.location.assign(`/platform-admin/customers/${workspace?.organization?.id}`);
    }
  }

  /* =====================================================
     ACTIVE ROUTE
  ===================================================== */

  const isActive = useCallback(
    (href) => {
      if (!pathname) {
        return false;
      }

      if (href === "/dashboard") {
        return pathname === "/dashboard";
      }

      return (
        pathname === href ||
        pathname.startsWith(
          `${href}/`
        )
      );
    },
    [pathname]
  );

  const experienceActive = ["/dashboard/dishes", "/dashboard/menu", "/dashboard/experiences", "/dashboard/spa"].some(isActive);
  const wineActive = ["/dashboard/wines", "/dashboard/wine-cellar", "/dashboard/wine-menus"].some(isActive);
  const accountActive = ["/dashboard/team", "/dashboard/settings"].some(isActive);
  const toggleGroup = (group) => setOpenGroups((current) => ({ ...current, [group]: !current[group] }));

  return (
    <DashboardWorkspaceProvider workspace={workspace}>
    <div className={`so-dashboard-root ${supportMode ? "so-dashboard-root--support" : ""}`}>

      {/* ===================================================
          DESKTOP / TABLET SIDEBAR
      =================================================== */}

      <aside className="so-sidebar so-sidebar--compact">

        <div>

          {/* =================================================
              BRAND
          ================================================= */}

          <div className="so-sidebar-brand">
            <div className="so-logo-wrap">
              <Image
                src="/selectoros-logo.png"
                alt="Vaxeron"
                width={112}
                height={48}
                className="so-logo"
                priority
              />
            </div>

            <div className="so-brand-copy">
              <strong>VAXERON</strong>
              <span>Hospitality OS</span>
            </div>

          </div>

          {/* =================================================
              NAVIGATION
          ================================================= */}

          <nav className="so-sidebar-nav">

            {/* ===============================================
                OVERVIEW
            =============================================== */}

            <SectionLabel>
              Overview
            </SectionLabel>

            <NavItem
              href="/dashboard"
              isActive={isActive(
                "/dashboard"
              )}
              icon={Squares2X2Icon}
              label="Dashboard"
            />

            {/* ===============================================
                EXPERIENCE
            =============================================== */}

            <NavGroup label="Experience" open={openGroups.experience} active={experienceActive} onToggle={() => toggleGroup("experience")}>
              <NavItem
              href="/dashboard/dishes"
              isActive={isActive(
                "/dashboard/dishes"
              )}
              icon={RectangleStackIcon}
              label="Dishes"
            />

              <NavItem
              href="/dashboard/menu"
              isActive={isActive(
                "/dashboard/menu"
              )}
              icon={SwatchIcon}
              label="Menus"
            />

              <NavItem
              href="/dashboard/experiences"
              isActive={isActive(
                "/dashboard/experiences"
              )}
              icon={SparklesIcon}
              label="Dining"
            />

              <NavItem
              href="/dashboard/spa"
              isActive={isActive(
                "/dashboard/spa"
              )}
              icon={SparklesIcon}
              label="Spa"
              />
            </NavGroup>

            {/* ===============================================
                WINE OPERATIONS
            =============================================== */}

            <NavGroup label="Wine operations" open={openGroups.wine} active={wineActive} onToggle={() => toggleGroup("wine")}>
              <NavItem
              href="/dashboard/wines"
              isActive={isActive("/dashboard/wines") || isActive("/dashboard/wine-cellar/data-quality")}
              icon={BeakerIcon}
              label="Wine Cellar"
            />

              <NavItem
              href="/dashboard/wine-cellar/venues"
              isActive={isActive(
                "/dashboard/wine-cellar/venues"
              )}
              icon={BuildingStorefrontIcon}
              label="Venue Wines"
            />

              <NavItem
              href="/dashboard/wine-cellar/inventory"
              isActive={isActive(
                "/dashboard/wine-cellar/inventory"
              )}
              icon={CircleStackIcon}
              label="Stock Control"
            />
              <NavItem
  href="/dashboard/wine-cellar/reconciliation"
  isActive={isActive(
    "/dashboard/wine-cellar/reconciliation"
  )}
  icon={ClipboardDocumentCheckIcon}
  label="Stock Issues"
              />

              {!supportMode && <NavItem
              href="/dashboard/wine-cellar/ordering"
              isActive={isActive(
                "/dashboard/wine-cellar/ordering"
              )}
              icon={BellAlertIcon}
              label="Ordering"
              badge={orderingAlerts}
            />}

              <NavItem
              href="/dashboard/wine-cellar/transfers"
              isActive={isActive(
                "/dashboard/wine-cellar/transfers"
              )}
              icon={ArrowsRightLeftIcon}
              label="Movements"
              />
            </NavGroup>

            {/* ===============================================
                ACCOUNT
            =============================================== */}

            <NavGroup label="Workspace" open={openGroups.account} active={accountActive} onToggle={() => toggleGroup("account")}>
              {!supportMode && <NavItem
                href="/dashboard/team"
                isActive={isActive("/dashboard/team")}
                icon={UsersIcon}
                label="Team & Access"
              />}
              {!supportMode && <NavItem
              href="/dashboard/settings"
              isActive={isActive(
                "/dashboard/settings"
              )}
              icon={Cog6ToothIcon}
              label="Settings"
              />}
            </NavGroup>

          </nav>

        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className={`so-sidebar-footer ${accountMenuOpen ? "is-open" : ""}`}>
          {accountMenuOpen && (
            <div className="so-account-menu" role="menu" aria-label="Account options">
              {platformAdministrator && (
                <Link href="/platform-admin" role="menuitem" className="so-account-menu__platform">
                  <ShieldCheckIcon />
                  <span><strong>Platform administration</strong><small>Customers, access and support</small></span>
                </Link>
              )}
              <Link href="/dashboard/settings" role="menuitem">
                <Cog6ToothIcon />
                <span><strong>Workspace settings</strong><small>Customer configuration</small></span>
              </Link>
              <Link href="/logout" role="menuitem" className="so-account-menu__logout">
                <span><strong>Log out</strong><small>End this Vaxeron session</small></span>
              </Link>
            </div>
          )}

          <button
            type="button"
            className="so-sidebar-user"
            aria-expanded={accountMenuOpen}
            aria-haspopup="menu"
            onClick={() => setAccountMenuOpen((value) => !value)}
          >

            <div className="so-user-avatar">
              R
            </div>

            <div className="so-user-meta">

              <div className="so-user-name">
                {workspace?.organization?.name || "Vaxeron"}
              </div>

              <div className="so-user-tag">
                Premium Plan
              </div>

            </div>
            <ChevronDownIcon className="so-sidebar-user__chevron" aria-hidden="true" />
          </button>

        </div>

      </aside>

      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <main className="so-main">
        <header className="so-workspace-bar">
          <div className="so-workspace-context">
            <span>Workspace</span>
            <strong>{workspace?.property?.name || workspace?.organization?.name || "Workspace"}</strong>
          </div>

          <div className="so-workspace-actions">
            <button type="button" className="so-command-button" aria-label="Search Vaxeron" onClick={() => setCommandOpen(true)}>
              <MagnifyingGlassIcon />
              <span>Search Vaxeron</span>
              <kbd>⌘ K</kbd>
            </button>

            {!supportMode && <button
              type="button"
              className={`so-notification-button ${orderingAlerts > 0 ? "has-alerts" : ""}`}
              aria-label={orderingAlerts > 0 ? `${orderingAlerts} inventory notifications` : "Notifications"}
              aria-expanded={notificationOpen}
              onClick={() => setNotificationOpen((value) => !value)}
            >
              <BellAlertIcon />
              {orderingAlerts > 0 && <span>{orderingAlerts > 99 ? "99+" : orderingAlerts}</span>}
            </button>}

            <div className="so-system-state">
              <i />
              Live systems
            </div>

          </div>
        </header>

        {supportMode && (
          <section className="so-support-banner" role="status" aria-live="polite">
            <div className="so-support-banner__icon"><ShieldCheckIcon /></div>
            <div className="so-support-banner__copy">
              <strong>Vaxeron support · read-only</strong>
              <span>
                {workspace?.organization?.name} / {workspace?.property?.name} · {workspace?.supportSession?.reason} · expires {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(workspace.supportSession.expiresAt))}
              </span>
            </div>
            <span className="so-support-banner__lock"><EyeIcon /> Changes locked</span>
            <button type="button" onClick={endSupportSession} disabled={endingSupport}>{endingSupport ? "Ending…" : "Exit support mode"}</button>
          </section>
        )}

        <div className="so-main-scroll">
          {children}
        </div>
      </main>

      {commandOpen && (
        <div className="so-command-layer" role="dialog" aria-modal="true" aria-label="Search Vaxeron">
          <button className="so-command-backdrop" aria-label="Close search" onClick={() => setCommandOpen(false)} />
          <section className="so-command-panel">
            <div className="so-command-input-wrap">
              <MagnifyingGlassIcon />
              <input
                autoFocus
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="Where would you like to go?"
              />
              <kbd>Esc</kbd>
            </div>
            <div className="so-command-results">
              <div className="so-command-label">Navigate to</div>
              {filteredDestinations.map(([label, detail, href]) => (
                <Link key={href} href={href} onClick={() => { setCommandOpen(false); setCommandQuery(""); }}>
                  <div><strong>{label}</strong><span>{detail}</span></div>
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
              {filteredDestinations.length === 0 && <div className="so-command-empty">No matching Vaxeron module.</div>}
            </div>
          </section>
        </div>
      )}

      {notificationOpen && (
        <div className="so-notification-layer">
          <button className="so-notification-backdrop" aria-label="Close notifications" onClick={() => setNotificationOpen(false)} />
          <aside className="so-notification-drawer" role="dialog" aria-modal="true" aria-label="Notifications">
            <header>
              <div><span>Operations</span><h2>Notifications</h2></div>
              <button type="button" aria-label="Close notifications" onClick={() => setNotificationOpen(false)}><XMarkIcon /></button>
            </header>
            <div className="so-notification-body">
              {orderingAlerts > 0 ? (
                <Link href="/dashboard/wine-cellar/ordering" className="so-notification-card" onClick={() => setNotificationOpen(false)}>
                  <div className="so-notification-card-icon"><BellAlertIcon /></div>
                  <div>
                    <span>Inventory attention</span>
                    <strong>{orderingAlerts.toLocaleString("en-GB")} wines need review</strong>
                    <p>
                      {Number(notificationSummary.urgent || 0).toLocaleString("en-GB")} urgent · {Number(notificationSummary.suggestions || 0).toLocaleString("en-GB")} ordering suggestions
                    </p>
                  </div>
                  <i aria-hidden="true">→</i>
                </Link>
              ) : (
                <div className="so-notification-empty"><CheckCircleIcon /><strong>All caught up</strong><p>No inventory notifications need your attention.</p></div>
              )}
            </div>
            <footer><Link href="/dashboard/wine-cellar/ordering" onClick={() => setNotificationOpen(false)}>Open notification centre <span>→</span></Link></footer>
          </aside>
        </div>
      )}

      {/* ===================================================
          MOBILE NAVIGATION
      =================================================== */}

      <div className="so-mobile-nav">

        <Link
          href="/dashboard"
          className={
            "so-mobile-nav-item " +
            (
              isActive("/dashboard")
                ? "so-mobile-nav-item--active"
                : ""
            )
          }
        >
          <Squares2X2Icon className="so-mobile-nav-icon" />

          <span>
            Home
          </span>
        </Link>

        <Link
          href="/dashboard/wines"
          className={
            "so-mobile-nav-item " +
            (
              isActive(
                "/dashboard/wines"
              )
                ? "so-mobile-nav-item--active"
                : ""
            )
          }
        >
          <BeakerIcon className="so-mobile-nav-icon" />

          <span>
            Cellar
          </span>
        </Link>

        <Link
          href="/dashboard/wine-cellar/venues"
          className={
            "so-mobile-nav-item " +
            (
              isActive(
                "/dashboard/wine-cellar/venues"
              )
                ? "so-mobile-nav-item--active"
                : ""
            )
          }
        >
          <BuildingStorefrontIcon className="so-mobile-nav-icon" />

          <span>
            Venues
          </span>
        </Link>

        <Link
          href="/dashboard/wine-cellar/inventory"
          className={
            "so-mobile-nav-item " +
            (
              isActive(
                "/dashboard/wine-cellar/inventory"
              )
                ? "so-mobile-nav-item--active"
                : ""
            )
          }
        >
          <CircleStackIcon className="so-mobile-nav-icon" />

          <span>
            Stock
          </span>
        </Link>

        <Link
          href="/dashboard/wine-cellar/transfers"
          className={
            "so-mobile-nav-item " +
            (
              isActive(
                "/dashboard/wine-cellar/transfers"
              )
                ? "so-mobile-nav-item--active"
                : ""
            )
          }
        >
          <ArrowsRightLeftIcon className="so-mobile-nav-icon" />

          <span>
            History
          </span>
        </Link>

      </div>

    </div>
    </DashboardWorkspaceProvider>
  );
}
