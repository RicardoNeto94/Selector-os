
import Image from "next/image";
import Link from "next/link";
import "../../styles/dashboard.css";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }) {
  return (
    <div className="so-dashboard-root">
      {/* SIDEBAR */}
      <aside className="so-sidebar">
        <div className="so-sidebar-logo">S</div>

        <nav className="so-sidebar-nav">
          <Link href="/dashboard" className="so-nav-dot so-nav-active">
            ⬤
          </Link>
          <Link href="/dashboard/menu" className="so-nav-dot">
            ☰
          </Link>
          <Link href="/dashboard/dishes" className="so-nav-dot">
            🍽
          </Link>
          <Link href="/dashboard/allergen" className="so-nav-dot">
            ⚕
          </Link>
          <Link href="/dashboard/settings" className="so-nav-dot">
            ⚙️
          </Link>
          <Link href="/dashboard/billing" className="so-nav-dot">
            💳
          </Link>
        </nav>

        <div className="so-sidebar-bottom">
          <div className="so-nav-dot" aria-label="Profile">
            🙂
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <main className="so-main">
        <header className="so-topbar">
          <div className="so-topbar-text">
            <div className="so-topbar-title">Hello, Operator!</div>
            <div className="so-topbar-subtitle">
              Explore your restaurants, menus and allergen activity from a
              single cockpit.
            </div>
          </div>

          <div className="so-search">
            <span role="img" aria-label="search">
              🔍
            </span>
            <input placeholder="Search anything…" />
          </div>

          <button className="so-circle-btn" aria-label="Notifications">
            🔔
          </button>
        </header>

        {children}
      </main>
    </div>
  );
}
