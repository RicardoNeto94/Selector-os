// src/app/dashboard/layout.js
import "../../styles/dashboard.css";
import Link from "next/link";
import Image from "next/image";
import {
  Squares2X2Icon,
  RectangleStackIcon,
  SwatchIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

/**
 * TEMP PLAN FLAG
 * ----------------
 * This is intentionally hardcoded for now.
 * Later this will come from Supabase (profiles / subscriptions).
 *
 * Possible values:
 * "starter" | "pro" | "enterprise"
 */
const PLAN = "starter";

export default function DashboardLayout({ children }) {
  const isPro = PLAN !== "starter";

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
          />
        </div>

        {/* NAVIGATION */}
        <nav className="so-sidebar-nav">
          {/* Overview */}
          <div className="so-sidebar-section-label">Overview</div>
          <Link href="/dashboard" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <Squares2X2Icon className="so-nav-icon" />
            </span>
            <span className="so-nav-label">Dashboard</span>
          </Link>

          {/* Workspace */}
          <div className="so-sidebar-section-label">Workspace</div>

          <Link href="/dashboard/dishes" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <RectangleStackIcon className="so-nav-icon" />
            </span>
            <span className="so-nav-label">Dishes</span>
          </Link>

          {/* MENUS – parent */}
          <div className="so-nav-group">
            <Link href="/dashboard/menu" className="so-nav-item">
              <span className="so-nav-icon-wrap">
                <SwatchIcon className="so-nav-icon" />
              </span>
              <span className="so-nav-label">Menus</span>
            </Link>

            {/* Nested menu items */}
            <div className="so-nav-sub">
              <span className="so-nav-sub-item">
                Primary menu
              </span>

              <span
                className={
                  "so-nav-sub-item " +
                  (!isPro ? "so-nav-locked" : "")
                }
              >
                {!isPro && <LockClosedIcon className="so-lock-icon" />}
                Menu 2
              </span>

              <span
                className={
                  "so-nav-sub-item " +
                  (!isPro ? "so-nav-locked" : "")
                }
              >
                {!isPro && <LockClosedIcon className="so-lock-icon" />}
                Menu 3
              </span>
            </div>
          </div>

          {/* Account */}
          <div className="so-sidebar-section-label">Account</div>

          <Link href="/dashboard/billing" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <CreditCardIcon className="so-nav-icon" />
            </span>
            <span className="so-nav-label">Billing</span>
          </Link>

          <Link href="/dashboard/settings" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <Cog6ToothIcon className="so-nav-icon" />
            </span>
            <span className="so-nav-label">Settings</span>
          </Link>
        </nav>

        {/* FOOTER */}
        <div className="so-sidebar-footer">
          <div className="so-sidebar-user">
            <div className="so-user-avatar">R</div>
            <div className="so-user-meta">
              <div className="so-user-name">Operator</div>
              <div className="so-user-tag">
                {PLAN.toUpperCase()} PLAN
              </div>
            </div>
          </div>

          <a href="/logout" className="so-logout-btn">
            Log out
          </a>
        </div>
      </aside>

      {/* MAIN */}
      <main className="so-main">
        <div className="so-main-inner">{children}</div>
      </main>
    </div>
  );
}
