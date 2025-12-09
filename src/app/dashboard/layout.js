// src/app/dashboard/layout.js
import "../../styles/dashboard.css";
import Link from "next/link";
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
      {/* LEFT SIDEBAR */}
      <aside className="so-sidebar">
        {/* Brand */}
        <div className="so-sidebar-brand">
          {/* Image logo from /public/selectoros-logo.png */}
          <img
            src="/selectoros-logo.png"
            alt="SelectorOS logo"
            className="so-sidebar-logo-img"
          />

          <div className="so-sidebar-brand-text">
            <span className="so-sidebar-brand-name">SelectorOS</span>
            <span className="so-sidebar-brand-sub">Operator</span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="so-sidebar-nav">
          <Link href="/dashboard" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <Squares2X2Icon className="so-nav-icon" />
            </span>
            <span>Dashboard</span>
          </Link>

          <Link href="/dashboard/dishes" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <RectangleStackIcon className="so-nav-icon" />
            </span>
            <span>Dishes</span>
          </Link>

          <Link href="/dashboard/menu" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <SwatchIcon className="so-nav-icon" />
            </span>
            <span>Menu editor</span>
          </Link>

          <Link href="/dashboard/billing" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <CreditCardIcon className="so-nav-icon" />
            </span>
            <span>Billing</span>
          </Link>

          <Link href="/dashboard/settings" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <Cog6ToothIcon className="so-nav-icon" />
            </span>
            <span>Settings</span>
          </Link>
        </nav>

        {/* FOOTER */}
        <div className="so-sidebar-footer">
          <div className="so-sidebar-user">
            <div className="so-user-avatar">R</div>
            <div className="so-user-meta">
              <div className="so-user-name">Operator</div>
              <div className="so-user-tag">Live workspace</div>
            </div>
          </div>

          {/* Logout */}
          <Link href="/logout" className="so-logout-btn">
            Logout
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="so-main">
        <div className="so-main-inner">{children}</div>
      </main>
    </div>
  );
}
