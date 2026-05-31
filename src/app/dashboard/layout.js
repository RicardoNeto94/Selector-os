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

function NavItem({
  href,
  isActive,
  icon: Icon,
  label
}) {

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

      <span className="so-nav-label">
        {label}
      </span>

    </Link>

  );

}

export default function DashboardLayout({
  children
}) {

  const pathname = usePathname();

  const isActive = useMemo(() => {

    return (href) => {

      if (href === "/dashboard") {
        return pathname === "/dashboard";
      }

      return pathname?.startsWith(href);

    };

  }, [pathname]);

  return (

    <div className="so-dashboard-root">

      {/* =======================================================
          DESKTOP / TABLET SIDEBAR
      ======================================================= */}

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

            {/* OVERVIEW */}

            <div className="so-sidebar-section-label">
              Overview
            </div>

            <NavItem
              href="/dashboard"
              isActive={isActive("/dashboard")}
              icon={Squares2X2Icon}
              label="Dashboard"
            />

            {/* OPERATIONS */}

            {/* CONTENT */}

<div className="so-sidebar-section-label">
  Content
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
              href="/dashboard/wine-menus"
              isActive={isActive("/dashboard/wine-menus")}
              icon={BookOpenIcon}
              label="Wine Menus"
            />

            <NavItem
              href="/dashboard/experiences"
              isActive={isActive("/dashboard/experiences")}
              icon={RectangleStackIcon}
              label="Dinning Experiences"
            />
            <NavItem
  href="/dashboard/spa"
  isActive={isActive("/dashboard/spa")}
  icon={SwatchIcon}
  label="Spa"
/>
<div className="so-sidebar-section-label">
  Inventory
</div>  

<NavItem
              href="/dashboard/wine-cellar/inventory"
              isActive={isActive("/dashboard/wine-cellar/inventory")}
              icon={BeakerIcon}
              label="Inventory"
            />
             <NavItem
              href="/dashboard/wines"
              isActive={isActive("/dashboard/wines")}
              icon={BeakerIcon}
              label="Wine Cellar"
            />
            {/* ACCOUNT */}

            <div className="so-sidebar-section-label">
              Account
            </div>

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

            <div className="so-user-avatar">
              R
            </div>

            <div className="so-user-meta">

              <div className="so-user-name">
                Burman Hotel OÜ
              </div>

              <div className="so-user-tag">
                Premium Plan
              </div>

            </div>

          </div>

          <Link
            href="/logout"
            className="so-logout-btn"
          >
            Log out
          </Link>

        </div>

      </aside>

      {/* =======================================================
          MAIN CONTENT
      ======================================================= */}

      <main
        className="so-main"
        style={{
          background: "var(--so-bg-page)",
          color: "var(--so-text-main)"
        }}
      >

        {children}

      </main>

      {/* =======================================================
          MOBILE BOTTOM NAV
      ======================================================= */}

      <div className="so-mobile-nav">

        <Link
          href="/dashboard"
          className={
            "so-mobile-nav-item " +
            (isActive("/dashboard")
              ? "so-mobile-nav-item--active"
              : "")
          }
        >

          <Squares2X2Icon className="so-mobile-nav-icon" />

          <span>
            Dashboard
          </span>

        </Link>

        <Link
          href="/dashboard/wines"
          className={
            "so-mobile-nav-item " +
            (isActive("/dashboard/wines")
              ? "so-mobile-nav-item--active"
              : "")
          }
        >

          <BeakerIcon className="so-mobile-nav-icon" />

          <span>
            Wines
          </span>

        </Link>

        <Link
          href="/dashboard/wine-cellar/inventory"
          className={
            "so-mobile-nav-item " +
            (isActive("/dashboard/wine-cellar/inventory")
              ? "so-mobile-nav-item--active"
              : "")
          }
        >

          <RectangleStackIcon className="so-mobile-nav-icon" />

          <span>
            Inventory
          </span>

        </Link>

        <Link
          href="/dashboard/menu"
          className={
            "so-mobile-nav-item " +
            (isActive("/dashboard/menu")
              ? "so-mobile-nav-item--active"
              : "")
          }
        >

          <SwatchIcon className="so-mobile-nav-icon" />

          <span>
            Menus
          </span>

        </Link>

        <Link
          href="/dashboard/settings"
          className={
            "so-mobile-nav-item " +
            (isActive("/dashboard/settings")
              ? "so-mobile-nav-item--active"
              : "")
          }
        >

          <Cog6ToothIcon className="so-mobile-nav-icon" />

          <span>
            Settings
          </span>

        </Link>

      </div>

    </div>

  );

}