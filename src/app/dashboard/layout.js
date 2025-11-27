"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/menu", label: "Menu" },
  { href: "/dashboard/dishes", label: "Dishes" },
  { href: "/dashboard/allergen", label: "Allergens" },
  { href: "/dashboard/settings", label: "Settings" },
];

const sidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/dashboard/menu", label: "Menus", icon: "📋" },
  { href: "/dashboard/dishes", label: "Dishes", icon: "🍽️" },
  { href: "/dashboard/allergen", label: "Allergen", icon: "⚠️" },
  { href: "/dashboard/billing", label: "Billing", icon: "💳" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex flex-col">
      {/* TOP BAR */}
      <header className="bg-gradient-to-br from-brand-dark to-brand-darkAlt text-white shadow-soft">
        <nav className="mx-auto max-w-7xl px-8 pb-3 flex gap-4 text-sm overflow-x-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-bold">
              S
            </div>
            <div>
              <div className="text-xl font-semibold tracking-tight">
                SelectorOS
              </div>
              <div className="text-xs text-white/60 -mt-0.5">
                Service-ready allergen & menu cockpit
              </div>
            </div>
          </div>

          {/* Small top stats / placeholders */}
          <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[11px] uppercase tracking-wide text-white/40">
                Active restaurant
              </span>
              <span className="font-medium">My Restaurant</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <button className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full transition">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Live</span>
            </button>
          </div>
        </div>

        {/* TOP TABS (Overview / Menu / Dishes / Allergens / Settings) */}
        <nav className="mx-auto max-w-7xl px-8 pb-3 flex gap-4 text-sm overflow-x-auto">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-full transition whitespace-nowrap
                  ${
                    active
                      ? "bg-white text-brand-dark shadow-md"
                      : "text-white/65 hover:bg-white/10"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* BODY */}
      <div className="flex flex-1 w-full px-4 md:px-8 py-6 gap-6">
        {/* SIDEBAR */}
        <aside className="hidden md:flex flex-col w-60 bg-white rounded-2xl shadow-card p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase px-2 mb-3">
            Navigation
          </div>
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition
                    ${
                      active
                        ? "bg-[#111827] text-white shadow-soft"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-4 border-t border-gray-100">
            <button className="w-full text-left text-xs text-gray-400 hover:text-gray-700 px-2 py-1">
              Log out
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1">
          {/* Slight “floating” effect */}
          <div className="rounded-2xl shadow-soft bg-white/70 backdrop-blur-sm p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
