"use client";

import "../../styles/dashboard.css";

import Link from "next/link";
import Image from "next/image";

import { useCallback } from "react";
import { usePathname } from "next/navigation";

import {
  Squares2X2Icon,
  RectangleStackIcon,
  SwatchIcon,
  Cog6ToothIcon,
  BeakerIcon,
  BuildingStorefrontIcon,
  CircleStackIcon,
  SparklesIcon,
  ArrowsRightLeftIcon,
  ClipboardDocumentCheckIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

/* =======================================================
   NAV ITEM
======================================================= */

function NavItem({
  href,
  isActive,
  icon: Icon,
  label,
}) {
  return (
    <Link
      href={href}
      className={
        "so-nav-item " +
        (isActive
          ? "so-nav-item--active"
          : "")
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

/* =======================================================
   SECTION LABEL
======================================================= */

function SectionLabel({
  children,
}) {
  return (
    <div className="so-sidebar-section-label">
      {children}
    </div>
  );
}

/* =======================================================
   DASHBOARD LAYOUT
======================================================= */

export default function DashboardLayout({
  children,
}) {
  const pathname = usePathname();

  /* =====================================================
     ACTIVE ROUTE
  ===================================================== */

  const isActive = useCallback(
    (href) => {
      if (!pathname) {
        return false;
      }

      if (href === "/dashboard") {
        return pathname === "/dashboard";
      }

      return (
        pathname === href ||
        pathname.startsWith(
          `${href}/`
        )
      );
    },
    [pathname]
  );

  return (
    <div className="so-dashboard-root">

      {/* ===================================================
          DESKTOP / TABLET SIDEBAR
      =================================================== */}

      <aside className="so-sidebar so-sidebar--compact">

        <div>

          {/* =================================================
              BRAND
          ================================================= */}

          <div className="so-sidebar-brand">

            <div className="so-logo-wrap">

              <Image
                src="/selectoros-logo.png"
                alt="Vaxeron"
                width={112}
                height={48}
                className="so-logo"
                priority
              />

            </div>

          </div>

          {/* =================================================
              NAVIGATION
          ================================================= */}

          <nav className="so-sidebar-nav">

            {/* ===============================================
                OVERVIEW
            =============================================== */}

            <SectionLabel>
              Overview
            </SectionLabel>

            <NavItem
              href="/dashboard"
              isActive={isActive(
                "/dashboard"
              )}
              icon={Squares2X2Icon}
              label="Dashboard"
            />

            {/* ===============================================
                EXPERIENCE
            =============================================== */}

            <SectionLabel>
              Experience
            </SectionLabel>

            <NavItem
              href="/dashboard/dishes"
              isActive={isActive(
                "/dashboard/dishes"
              )}
              icon={RectangleStackIcon}
              label="Dishes"
            />

            <NavItem
              href="/dashboard/menu"
              isActive={isActive(
                "/dashboard/menu"
              )}
              icon={SwatchIcon}
              label="Menus"
            />

            <NavItem
              href="/dashboard/experiences"
              isActive={isActive(
                "/dashboard/experiences"
              )}
              icon={SparklesIcon}
              label="Dining"
            />

            <NavItem
              href="/dashboard/spa"
              isActive={isActive(
                "/dashboard/spa"
              )}
              icon={SparklesIcon}
              label="Spa"
            />

            {/* ===============================================
                WINE OPERATIONS
            =============================================== */}

            <SectionLabel>
              Wine
            </SectionLabel>

            <NavItem
              href="/dashboard/wines"
              isActive={isActive(
                "/dashboard/wines"
              )}
              icon={BeakerIcon}
              label="Wine Cellar"
            />

            <NavItem
              href="/dashboard/wine-cellar/venues"
              isActive={isActive(
                "/dashboard/wine-cellar/venues"
              )}
              icon={BuildingStorefrontIcon}
              label="Venue Wines"
            />

            <NavItem
              href="/dashboard/wine-cellar/inventory"
              isActive={isActive(
                "/dashboard/wine-cellar/inventory"
              )}
              icon={CircleStackIcon}
              label="Stock Control"
            />
            <NavItem
  href="/dashboard/wine-cellar/reconciliation"
  isActive={isActive(
    "/dashboard/wine-cellar/reconciliation"
  )}
  icon={ClipboardDocumentCheckIcon}
  label="Reconciliation"
/>

            <NavItem
              href="/dashboard/wine-cellar/transfers"
              isActive={isActive(
                "/dashboard/wine-cellar/transfers"
              )}
              icon={ArrowsRightLeftIcon}
              label="Movements"
            />

            {/* ===============================================
                ACCOUNT
            =============================================== */}

            <NavItem
  href="/dashboard/planner"
  isActive={isActive("/dashboard/planner")}
  icon={ClipboardDocumentCheckIcon}
  label="Planner"
/>

            <SectionLabel>
              Account
            </SectionLabel>

<NavItem
  href="/dashboard/team"
  isActive={isActive(
    "/dashboard/team"
  )}
  icon={UsersIcon}
  label="Team & Access"
/>
            <NavItem
              href="/dashboard/settings"
              isActive={isActive(
                "/dashboard/settings"
              )}
              icon={Cog6ToothIcon}
              label="Settings"
            />

          </nav>

        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

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

      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <main
        className="so-main"
        style={{
          background:
            "var(--so-bg-page)",

          color:
            "var(--so-text-main)",
        }}
      >
        {children}
      </main>

      {/* ===================================================
          MOBILE NAVIGATION
      =================================================== */}

      <div className="so-mobile-nav">

        <Link
          href="/dashboard"
          className={
            "so-mobile-nav-item " +
            (
              isActive("/dashboard")
                ? "so-mobile-nav-item--active"
                : ""
            )
          }
        >
          <Squares2X2Icon className="so-mobile-nav-icon" />

          <span>
            Home
          </span>
        </Link>

        <Link
          href="/dashboard/wines"
          className={
            "so-mobile-nav-item " +
            (
              isActive(
                "/dashboard/wines"
              )
                ? "so-mobile-nav-item--active"
                : ""
            )
          }
        >
          <BeakerIcon className="so-mobile-nav-icon" />

          <span>
            Cellar
          </span>
        </Link>

        <Link
          href="/dashboard/wine-cellar/venues"
          className={
            "so-mobile-nav-item " +
            (
              isActive(
                "/dashboard/wine-cellar/venues"
              )
                ? "so-mobile-nav-item--active"
                : ""
            )
          }
        >
          <BuildingStorefrontIcon className="so-mobile-nav-icon" />

          <span>
            Venues
          </span>
        </Link>

        <Link
          href="/dashboard/wine-cellar/inventory"
          className={
            "so-mobile-nav-item " +
            (
              isActive(
                "/dashboard/wine-cellar/inventory"
              )
                ? "so-mobile-nav-item--active"
                : ""
            )
          }
        >
          <CircleStackIcon className="so-mobile-nav-icon" />

          <span>
            Stock
          </span>
        </Link>

        <Link
          href="/dashboard/wine-cellar/transfers"
          className={
            "so-mobile-nav-item " +
            (
              isActive(
                "/dashboard/wine-cellar/transfers"
              )
                ? "so-mobile-nav-item--active"
                : ""
            )
          }
        >
          <ArrowsRightLeftIcon className="so-mobile-nav-icon" />

          <span>
            History
          </span>
        </Link>

      </div>

    </div>
  );
}