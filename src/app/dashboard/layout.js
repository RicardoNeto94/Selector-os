// src/app/dashboard/layout.js
"use client";

import "../../styles/dashboard.css";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import {
  Squares2X2Icon,
  RectangleStackIcon,
  SwatchIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  BellIcon,
  Bars3BottomLeftIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

/**
 * TEMP PLAN FLAG
 * ----------------
 * Possible values:
 * "starter" | "pro" | "enterprise"
 */
const PLAN = "starter";

/**
 * LOGOS (public/)
 * ----------------
 * Put these files in /public:
 * - /selectoros-logo.png        (full logo)
 * - /selectoros-logo-small.png  (compact logo for rail)
 */
const FULL_LOGO_SRC = "/selectoros-logo.png";
const SMALL_LOGO_SRC = "/selectoros-logo-small.png";

/**
 * NavItem
 * - default: behaves like a Link
 * - if `onClick` is provided: behaves like a button (accordion trigger)
 */
function NavItem({ href, isActive, icon: Icon, label, onClick, right }) {
  const className = "so-nav-item" + (isActive ? " so-nav-item--active" : "");

  // Button variant (for toggles like Menus)
  if (typeof onClick === "function") {
    return (
      <button type="button" className={className} onClick={onClick}>
        <span className="so-nav-icon-wrap">
          <Icon className="so-nav-icon" />
        </span>
        <span className="so-nav-label">{label}</span>
        {right ? <span style={{ marginLeft: "auto", display: "flex" }}>{right}</span> : null}
      </button>
    );
  }

  // Link variant
  return (
    <Link href={href} className={className}>
      <span className="so-nav-icon-wrap">
        <Icon className="so-nav-icon" />
      </span>
      <span className="so-nav-label">{label}</span>
      {right ? <span style={{ marginLeft: "auto", display: "flex" }}>{right}</span> : null}
    </Link>
  );
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const isPro = PLAN !== "starter";

  // ✅ Pinned state: when true = expanded always
  const [pinnedExpanded, setPinnedExpanded] = useState(false);

  // ✅ Hover state: used to swap logo + shift main content while hovering
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);

  // ✅ Menus accordion open/close
  const [menusOpen, setMenusOpen] = useState(false);

  // Active matching
  const isActive = useMemo(() => {
    return (href) => {
      if (href === "/dashboard") return pathname === "/dashboard";
      return pathname?.startsWith(href);
    };
  }, [pathname]);

  // Auto-open Menus when user is inside /dashboard/menu*
  const inMenusSection = pathname?.startsWith("/dashboard/menu");
  const computedMenusOpen = menusOpen || inMenusSection;

  // ✅ Treat hover like "expanded" for layout spacing (main content shift)
  const expandedForLayout = pinnedExpanded || isHoveringSidebar;

  const rootClass =
    "so-dashboard-root" + (expandedForLayout ? " sidebar-expanded" : "");

  const sidebarClass =
    "so-sidebar " + (pinnedExpanded ? "is-expanded" : "is-collapsed");

  // Show full logo if pinned OR user is hovering the collapsed rail
  const showFullLogo = pinnedExpanded || isHoveringSidebar;

  return (
    <div className={rootClass}>
      {/* SIDEBAR */}
      <aside
        className={sidebarClass}
        onMouseEnter={() => setIsHoveringSidebar(true)}
        onMouseLeave={() => setIsHoveringSidebar(false)}
      >
        {/* TOP: BRAND + PIN TOGGLE */}
        <div>
          <div
            className="so-sidebar-brand"
            style={{ justifyContent: "space-between" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* ✅ Logo swaps: small in rail, full on hover/expand */}
              <Image
                src={showFullLogo ? FULL_LOGO_SRC : SMALL_LOGO_SRC}
                alt="SelectorOS logo"
                width={64}
                height={64}
                className="so-sidebar-logo"
                priority
              />

              {/* Brand text (CSS hides in rail; shows on hover/expanded) */}
              <div className="so-sidebar-brand-text">
                <div className="so-sidebar-brand-name">SelectorOS</div>
                <div className="so-sidebar-brand-sub">Operator</div>
              </div>
            </div>

            {/* ✅ Pin / expand toggle */}
            <button
              type="button"
              className="so-sidebar-toggle"
              aria-label={pinnedExpanded ? "Collapse sidebar" : "Expand sidebar"}
              title={pinnedExpanded ? "Collapse" : "Expand"}
              onClick={() => setPinnedExpanded((v) => !v)}
            >
              <Bars3BottomLeftIcon className="so-nav-icon" />
            </button>
          </div>

          {/* NAVIGATION */}
          <nav className="so-sidebar-nav">
            {/* Overview */}
            <div className="so-sidebar-section-label">Overview</div>
            <NavItem
              href="/dashboard"
              isActive={isActive("/dashboard")}
              icon={Squares2X2Icon}
              label="Dashboard"
            />

            {/* Workspace */}
            <div className="so-sidebar-section-label">Workspace</div>
            <NavItem
              href="/dashboard/dishes"
              isActive={isActive("/dashboard/dishes")}
              icon={RectangleStackIcon}
              label="Dishes"
            />

            {/* MENUS (accordion) */}
            <div className="so-nav-group">
              <NavItem
                icon={SwatchIcon}
                label="Menus"
                isActive={inMenusSection}
                onClick={() => setMenusOpen((v) => !v)}
                right={
                  <ChevronDownIcon
                    className="so-nav-icon"
                    style={{
                      width: 18,
                      height: 18,
                      transform: computedMenusOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.18s ease",
                      opacity: 0.9,
                    }}
                  />
                }
              />

              {computedMenusOpen && (
                <div className="so-nav-sub">
                  <span className="so-nav-sub-item">Primary menu</span>

                  <span className={"so-nav-sub-item " + (!isPro ? "so-nav-locked" : "")}>
                    {!isPro && <LockClosedIcon className="so-lock-icon" />}
                    Menu 2
                  </span>

                  <span className={"so-nav-sub-item " + (!isPro ? "so-nav-locked" : "")}>
                    {!isPro && <LockClosedIcon className="so-lock-icon" />}
                    Menu 3
                  </span>
                </div>
              )}
            </div>

            {/* Account */}
            <div className="so-sidebar-section-label">Account</div>
            <NavItem
              href="/dashboard/billing"
              isActive={isActive("/dashboard/billing")}
              icon={CreditCardIcon}
              label="Billing"
            />

            <NavItem
              href="/dashboard/settings"
              isActive={isActive("/dashboard/settings")}
              icon={Cog6ToothIcon}
              label="Settings"
            />
          </nav>
        </div>

        {/* FOOTER */}
        <div className="so-sidebar-footer">
          <div className="so-sidebar-user">
            <div className="so-user-avatar">R</div>
            <div className="so-user-meta">
              <div className="so-user-name">Operator</div>
              <div className="so-user-tag">{PLAN.toUpperCase()} PLAN</div>
            </div>
          </div>

          <a href="/logout" className="so-logout-btn">
            Log out
          </a>
        </div>
      </aside>

      {/* MAIN */}
      <main className="so-main">
        {/* Top HUD bar */}
        <div className="so-topbar">
          <div className="so-topbar-left">
            <div className="so-topbar-title">Morning, Operator!</div>
            <div className="so-topbar-sub">
              Here’s what’s happening in your workspace today.
            </div>
          </div>

          <div className="so-topbar-right">
            <div className="so-search">
              <MagnifyingGlassIcon className="so-search-icon" />
              <input className="so-search-input" placeholder="Search for something…" />
            </div>

            <button type="button" className="so-icon-btn" aria-label="Notifications">
              <BellIcon className="so-icon-btn-icon" />
            </button>
          </div>
        </div>

        <div className="so-main-inner">{children}</div>
      </main>
    </div>
  );
}
