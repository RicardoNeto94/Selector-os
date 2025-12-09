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
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }) {
  return (
    <div className="so-dashboard-root">
      {/* SIDEBAR */}
      <aside className="so-sidebar">
        {/* BRAND */}
        <div className="so-sidebar-brand">
          {/* Logo from /public – change src to your real file */}
          <div className="so-sidebar-logo-wrap">
            <Image
              src="/selectoros-logo.png" // <-- or .svg / whatever you actually have
              alt="SelectorOS logo"
              width={36}
              height={36}
              className="so-sidebar-logo-img"
            />
          </div>
          <div className="so-sidebar-brand-text">
            <span className="so-sidebar-brand-name">SelectorOS</span>
            <span className="so-sidebar-brand-sub">Operator</span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="so-sidebar-nav">
          {/* Category divider: Overview */}
          <div className="so-sidebar-section-label">Overview</div>
          <Link href="/dashboard" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <Squares2X2Icon className="so-nav-icon" />
            </span>
            <span className="so-nav-label">Dashboard</span>
          </Link>

          {/* Category divider: Workspace */}
          <div className="so-sidebar-section-label">Workspace</div>
          <Link href="/dashboard/dishes" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <RectangleStackIcon className="so-nav-icon" />
            </span>
            <span className="so-nav-label">Dishes</span>
          </Link>

          <Link href="/dashboard/menu" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <SwatchIcon className="so-nav-icon" />
            </span>
            <span className="so-nav-label">Menus</span>
          </Link>

          {/* Category divider: Account */}
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

        {/* FOOTER: user + logout */}
        <div className="so-sidebar-footer">
          <div className="so-sidebar-user">
            <div className="so-user-avatar">R</div>
            <div className="so-user-meta">
              <div className="so-user-name">Operator</div>
              <div className="so-user-tag">SelectorOS</div>
            </div>
          </div>

          {/* Uses the /logout route you already built */}
          <a href="/logout" className="so-logout-btn">
            Log out
          </a>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="so-main">
        <div className="so-main-inner">{children}</div>
      </main>
    </div>
  );
}
