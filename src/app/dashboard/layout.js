"use client";

import "../../styles/dashboard.css";
import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

import {
  Squares2X2Icon,
  RectangleStackIcon,
  SwatchIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  BeakerIcon,
  BookOpenIcon
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

function NavItem({ href, isActive, icon: Icon, label }) {
  return (
    <Link
      href={href}
      className={
        "so-nav-item " +
        (isActive ? "so-nav-item--active" : "")
      }
    >
      <div className="so-nav-icon-wrap">
        <Icon className="so-nav-icon" />
      </div>

      <span className="so-nav-label">{label}</span>
    </Link>
  );
}

export default function DashboardLayout({ children }) {

  const pathname = usePathname();

  const isActive = useMemo(() => {
    return (href) => {
      if (href === "/dashboard") return pathname === "/dashboard";
      return pathname?.startsWith(href);
    };
  }, [pathname]);

  return (
    <div className="so-dashboard-root">

      {/* SIDEBAR */}
      <aside className="so-sidebar">

        <div>

          {/* LOGO */}
          <div className="so-sidebar-brand">
            <div className="so-logo-wrap">
              <Image
                src="/selectoros-logo.png"
                alt="SelectorOS"
                width={140}
                height={60}
                className="so-logo"
                priority
              />
            </div>
          </div>

          {/* NAV */}
          <nav className="so-sidebar-nav">

            <div className="so-sidebar-section-label">
              Overview
            </div>

            <NavItem
              href="/dashboard"
              isActive={isActive("/dashboard")}
              icon={Squares2X2Icon}
              label="Dashboard"
            />

            <div className="so-sidebar-section-label">
              Operations
            </div>

            <NavItem
              href="/dashboard/dishes"
              isActive={isActive("/dashboard/dishes")}
              icon={RectangleStackIcon}
              label="Dishes"
            />

            <NavItem
              href="/dashboard/menu"
              isActive={isActive("/dashboard/menu")}
              icon={SwatchIcon}
              label="Menus"
            />

            <NavItem
              href="/dashboard/wines"
              isActive={isActive("/dashboard/wines")}
              icon={BeakerIcon}
              label="Wine Cellar"
            />

            <NavItem
              href="/dashboard/wine-menus"
              isActive={isActive("/dashboard/wine-menus")}
              icon={BookOpenIcon}
              label="Wine Menus"
            />
            <NavItem
  href="/dashboard/experiences"
  isActive={isActive("/dashboard/experiences")}
  icon={RectangleStackIcon}
  label="Experiences"
/>

            <div className="so-sidebar-section-label">
              Account
            </div>

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
              <div className="so-user-name">
                Operator
              </div>
              <div className="so-user-tag">
                Starter Plan
              </div>
            </div>
          </div>

          <Link href="/logout" className="so-logout-btn">
            Log out
          </Link>

        </div>

      </aside>

      {/* 🔥 CRITICAL FIX HERE */}
      <main
        className="so-main"
        style={{
          background: "var(--so-bg-page)",
          color: "var(--so-text-main)"
        }}
      >
        {children}
      </main>

    </div>
  );
}