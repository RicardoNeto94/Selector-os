// src/app/dashboard/layout.js
import "../../styles/dashboard.css";
import Link from "next/link";
import {
  Squares2X2Icon,
  RectangleStackIcon,
  SwatchIcon,
  Cog6ToothIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }) {
  return (
    <div className="so-dashboard-root">
  <aside className="so-sidebar hidden md:flex">
    { /* desktop sidebar */ }
  </aside>

  <header className="so-mobile-nav md:hidden">
    { /* mobile bottom navigation */ }
  </header>

  <main className="so-content">
    {children}
  </main>
</div>

        {/* NAVIGATION */}
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

        {/* USER FOOTER */}
        <div className="so-sidebar-footer">
          <div className="so-sidebar-user">
            <div className="so-user-avatar">R</div>
            <div className="so-user-meta">
              <span className="so-user-name">Operator</span>
              <span className="so-user-tag">Live workspace</span>
            </div>
          </div>

          {/* Logout goes to /logout (client page that calls supabase.auth.signOut) */}
         <Link href="/logout" className="so-logout-btn so-logout-apple">
  Logout
</Link>  
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="so-main">{children}</main>
    </div>
  );
}
