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
  BeakerIcon,
  BookOpenIcon
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

const PLAN = "starter";

const FULL_LOGO_SRC = "/selectoros-logo.png";

function NavItem({ href, isActive, icon: Icon, label, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={"so-nav-item" + (isActive ? " so-nav-item--active" : "")}
    >
      <span className="so-nav-icon-wrap">
        <Icon className="so-nav-icon shrink-0" />
      </span>

      <span className="so-nav-label">{label}</span>
    </Link>
  );
}

export default function DashboardLayout({ children }) {

  const pathname = usePathname();
  const isPro = PLAN !== "starter";

  const [menusOpen, setMenusOpen] = useState(true);

  const isActive = useMemo(() => {
    return (href) => {
      if (href === "/dashboard") return pathname === "/dashboard";
      return pathname?.startsWith(href);
    };
  }, [pathname]);

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
    <div className="so-dashboard-root">

      {/* SIDEBAR */}
      <aside className="so-sidebar">

        {/* BRAND */}
        <div>

          <div className="so-sidebar-brand">
            <Image
              src={FULL_LOGO_SRC}
              alt="SelectorOS logo"
              width={96}
              height={40}
              className="so-sidebar-logo"
              priority
            />
          </div>

          {/* NAV */}
          <nav className="so-sidebar-nav">

            <div className="so-sidebar-section-label">Overview</div>

            <NavItem
              href="/dashboard"
              isActive={isActive("/dashboard")}
              icon={Squares2X2Icon}
              label="Dashboard"
            />

            <div className="so-sidebar-section-label">Workspace</div>

            <NavItem
              href="/dashboard/dishes"
              isActive={isActive("/dashboard/dishes")}
              icon={RectangleStackIcon}
              label="Dishes"
            />

            {/* WINE CELLAR */}
            <NavItem
              href="/dashboard/wines"
              isActive={isActive("/dashboard/wines")}
              icon={BeakerIcon}
              label="Wine Cellar"
            />

            {/* WINE MENUS */}
            <NavItem
              href="/dashboard/wine-menus"
              isActive={isActive("/dashboard/wine-menus")}
              icon={BookOpenIcon}
              label="Wine Menus"
            />

            {/* MENUS */}
            <div className="so-nav-group">

              <NavItem
                href="/dashboard/menu"
                isActive={isActive("/dashboard/menu")}
                icon={SwatchIcon}
                label="Menus"
                onClick={handleMenusClick}
              />

              {menusOpen && (
                <div className="so-nav-sub">

                  <span className="so-nav-sub-item">
                    Primary menu
                  </span>

                  <span
                    className={
                      "so-nav-sub-item " + (!isPro ? "so-nav-locked" : "")
                    }
                  >
                    {!isPro && (
                      <LockClosedIcon className="so-lock-icon shrink-0" />
                    )}
                    Menu 2
                  </span>

                  <span
                    className={
                      "so-nav-sub-item " + (!isPro ? "so-nav-locked" : "")
                    }
                  >
                    {!isPro && (
                      <LockClosedIcon className="so-lock-icon shrink-0" />
                    )}
                    Menu 3
                  </span>

                </div>
              )}
            </div>

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

        {children}

      </main>

    </div>
  );
}
