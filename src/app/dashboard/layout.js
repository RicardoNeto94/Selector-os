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
      {/* LEFT SIDEBAR – desktop & tablet */}
      <aside className="so-sidebar">
        {/* Brand */}
        <div className="so-sidebar-brand">
          <img
            src="/selectoros-logo.svg"
            alt="SelectorOS"
            className="so-sidebar-logo-img"
          />
        </div>

        {/* NAVIGATION */}
        <nav className="so-sidebar-nav">
          <Link href="/dashboard" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <Squares2X2Icon className="so-nav-icon" />
            </span>
            <span>Dashboard</span>
          </Link>

          <Link href="/dishes" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <RectangleStackIcon className="so-nav-icon" />
            </span>
            <span>Dishes</span>
          </Link>

          <Link href="/menu-editor" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <SwatchIcon className="so-nav-icon" />
            </span>
            <span>Menu editor</span>
          </Link>

          <Link href="/billing" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <CreditCardIcon className="so-nav-icon" />
            </span>
            <span>Billing</span>
          </Link>

          <Link href="/settings" className="so-nav-item">
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
              <span className="so-user-name">Operator</span>
              <span className="so-user-tag">Live workspace</span>
            </div>
          </div>

          <form action="/auth/sign-out" method="post">
            <button type="submit" className="so-logout-btn">
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="so-main">
        <div className="so-main-inner page-fade">{children}</div>
      </main>
    </div>
  );
}
