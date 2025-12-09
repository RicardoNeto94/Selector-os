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
        <div className="so-sidebar-brand">
          <div className="so-sidebar-brand-mark">S</div>
          <div className="so-sidebar-brand-text">
            <span className="so-sidebar-brand-name">SelectorOS</span>
            <span className="so-sidebar-brand-sub">Operator</span>
          </div>
        </div>

        <nav className="so-sidebar-nav">
          <Link href="/dashboard" className="so-nav-item">
            <span className="so-nav-icon-wrap">
              <Squares2X2Icon className="so-nav-icon" />
            </span>
            <span className="so-nav-label">Dashboard</span>
          </Link>

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
            <span className="so-nav-label">Menu editor</span>
          </Link>

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

        <div className="so-sidebar-footer">
          {/* user badge + logout go here */}
        </div>
      </aside>

      {/* RIGHT: MAIN AREA */}
      <main className="so-main">
        <div className="so-main-inner">{children}</div>
      </main>
    </div>
  );
}
