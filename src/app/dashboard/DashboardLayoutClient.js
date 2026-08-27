"use client";

import "../../styles/dashboard.css";

import Link from "next/link";
import Image from "next/image";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

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
  ["Ordering", "Reorder alerts and purchase workflow", "/dashboard/wine-cellar/ordering"],
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

/* =======================================================
   DASHBOARD LAYOUT
======================================================= */

export default function DashboardLayout({
  children,
  workspace,
}) {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [orderingAlerts, setOrderingAlerts] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/wine-cellar/orders?summary=1", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (active) setOrderingAlerts(Number(result?.summary?.awaitingApproval || 0)); })
      .catch(() => {});
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    function handleCommandKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }

      if (event.key === "Escape") setCommandOpen(false);
    }

    window.addEventListener("keydown", handleCommandKey);
    return () => window.removeEventListener("keydown", handleCommandKey);
  }, []);

  const filteredDestinations = QUICK_DESTINATIONS.filter(([label, detail]) =>
    `${label} ${detail}`.toLowerCase().includes(commandQuery.trim().toLowerCase())
  );

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

  return (
    <div className="so-dashboard-root">

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

            <SectionLabel>
              Experience
            </SectionLabel>

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

            {/* ===============================================
                WINE OPERATIONS
            =============================================== */}

            <SectionLabel>
              Wine
            </SectionLabel>

            <NavItem
              href="/dashboard/wines"
              isActive={isActive(
                "/dashboard/wines"
              )}
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

            <NavItem
              href="/dashboard/wine-cellar/ordering"
              isActive={isActive(
                "/dashboard/wine-cellar/ordering"
              )}
              icon={BellAlertIcon}
              label="Ordering"
              badge={orderingAlerts}
            />

            <NavItem
              href="/dashboard/wine-cellar/transfers"
              isActive={isActive(
                "/dashboard/wine-cellar/transfers"
              )}
              icon={ArrowsRightLeftIcon}
              label="Movements"
            />

            {/* ===============================================
                ACCOUNT
            =============================================== */}

            <SectionLabel>
              Account
            </SectionLabel>

<NavItem
  href="/dashboard/team"
  isActive={isActive(
    "/dashboard/team"
  )}
  icon={UsersIcon}
  label="Team & Access"
/>
            <NavItem
              href="/dashboard/settings"
              isActive={isActive(
                "/dashboard/settings"
              )}
              icon={Cog6ToothIcon}
              label="Settings"
            />

          </nav>

        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="so-sidebar-footer">

          <div className="so-sidebar-user">

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

          </div>

          <Link
            href="/logout"
            className="so-logout-btn"
          >
            Log out
          </Link>

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

            <div className="so-system-state">
              <i />
              Live systems
            </div>

          </div>
        </header>

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
  );
}
