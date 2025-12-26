// src/app/dashboard/layout.js
import "../../styles/dashboard.css";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";

import {
  Squares2X2Icon,
  RectangleStackIcon,
  SwatchIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  BellIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

/**
 * TEMP PLAN FLAG
 * ----------------
 * Possible values:
 * "starter" | "pro" | "enterprise"
 */
const PLAN = "starter";

function getPathnameFromHeaders() {
  // Next.js sends the current URL in different headers depending on runtime.
  // We'll try multiple known headers and fall back safely.
  const h = headers();
  const url =
    h.get("x-url") ||
    h.get("x-invoke-path") ||
    h.get("next-url") ||
    h.get("referer") ||
    "";

  try {
    // If url is absolute, parse it; if it's a path, just use it.
    if (url.startsWith("http")) return new URL(url).pathname;
    if (url.startsWith("/")) return url;
  } catch (e) {
    // ignore
  }
  return "/dashboard";
}

function NavItem({ href, isActive, icon: Icon, label }) {
  return (
    <Link href={href} className={"so-nav-item" + (isActive ? " so-nav-item--active" : "")}>
      <span className="so-nav-icon-wrap">
        <Icon className="so-nav-icon" />
      </span>
      <span className="so-nav-label">{label}</span>
    </Link>
  );
}

export default function DashboardLayout({ children }) {
  const isPro = PLAN !== "starter";

  // ✅ Active path detection (for highlight)
  const pathname = getPathnameFromHeaders();

  const isActive = (href) => {
    // exact match for /dashboard, prefix match for nested routes
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="so-dashboard-root">
      {/* SIDEBAR */}
      <aside className="so-sidebar">
        {/* BRAND */}
        <div className="so-sidebar-brand">
          <Image
            src="/selectoros-logo.png"
            alt="SelectorOS logo"
            width={64}
            height={64}
            className="so-sidebar-logo"
            priority
          />
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
            />

            {/* Nested menu items */}
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
        {/* ✅ Top HUD bar (to match the reference vibe) */}
        <div className="so-topbar">
          <div className="so-topbar-left">
            <div className="so-topbar-title">Morning, Operator!</div>
            <div className="so-topbar-sub">Here’s what’s happening in your workspace today.</div>
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
