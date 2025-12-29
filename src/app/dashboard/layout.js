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

function NavItem({ href, isActive, icon: Icon, label, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={"so-nav-item" + (isActive ? " so-nav-item--active" : "")}
    >
      <span className="so-nav-icon-wrap">
        <Icon className="so-nav-icon" />
      </span>
      <span className="so-nav-label">{label}</span>
    </Link>
  );
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const isPro = PLAN !== "starter";

  // ✅ Pinned state: when true = expanded always
  const [pinnedExpanded, setPinnedExpanded] = useState(false);

  // ✅ Hover state: used to swap logo when sidebar is collapsed
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);

  // ✅ Menus submenu open/close
  const [menusOpen, setMenusOpen] = useState(true);

  // Active matching
  const isActive = useMemo(() => {
    return (href) => {
      if (href === "/dashboard") return pathname === "/dashboard";
      return pathname?.startsWith(href);
    };
  }, [pathname]);

  const rootClass =
    "so-dashboard-root" + (pinnedExpanded ? " sidebar-expanded" : "");

  const sidebarClass =
    "so-sidebar " + (pinnedExpanded ? "is-expanded" : "is-collapsed");

  // Show full logo if pinned OR user is hovering the collapsed rail
  const showFullLogo = pinnedExpanded || isHoveringSidebar;

  // ✅ Clicking Menus:
  // - If you're already on /dashboard/menu*, it toggles open/close (no navigation)
  // - If you're elsewhere, it opens and navigates to /dashboard/menu
  const handleMenusClick = (e) => {
    const onMenusRoute = pathname?.startsWith("/dashboard/menu");
    if (onMenusRoute) {
      e.preventDefault();
      setMenusOpen((v) => !v);
      return;
    }
    setMenusOpen(true);
  };

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
                width={96}
                height={48}
                className="so-sidebar-logo"
                priority
              />
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

            {/* MENUS – parent */}
            <div className="so-nav-group">
              <NavItem
                href="/dashboard/menu"
                isActive={isActive("/dashboard/menu")}
                icon={SwatchIcon}
                label="Menus"
                onClick={handleMenusClick}
              />

              {/* ✅ Submenu is now truly collapsible */}
              {menusOpen && (
                <div className="so-nav-sub">
                  <span className="so-nav-sub-item">Primary menu</span>

                  <span
                    className={
                      "so-nav-sub-item " + (!isPro ? "so-nav-locked" : "")
                    }
                  >
                    {!isPro && <LockClosedIcon className="so-lock-icon" />}
                    Menu 2
                  </span>

                  <span
                    className={
                      "so-nav-sub-item " + (!isPro ? "so-nav-locked" : "")
                    }
                  >
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
              <input
                className="so-search-input"
                placeholder="Search for something…"
              />
            </div>

            <button
              type="button"
              className="so-icon-btn"
              aria-label="Notifications"
            >
              <BellIcon className="so-icon-btn-icon" />
            </button>
          </div>
        </div>

        <div className="so-main-inner">{children}</div>
      </main>
    </div>
  );
}
