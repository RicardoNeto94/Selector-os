"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const dynamic = "force-dynamic";

/* TOP BAR TABS */
const topTabs = [
  { href: "/dashboard", label: "Overview", icon: "🏠" },
  { href: "/dashboard/menu", label: "Menus", icon: "📋" },
  { href: "/dashboard/dishes", label: "Dishes", icon: "🍽️" },
  { href: "/dashboard/allergen", label: "Allergens", icon: "⚠️" },
  { href: "/dashboard/billing", label: "Billing", icon: "💳" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#232428] to-[#101114] text-slate-100">
      {/* TOP BAR */}
      <header className="border-b border-white/10 bg-gradient-to-r from-[#111827] to-[#020617]">
        <div className="mx-auto flex items-center justify-between px-6 py-4 max-w-7xl">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-white/20 text-sm font-semibold">
              S
            </div>
            <div>
              <div className="text-sm font-semibold">SelectorOS</div>
              <div className="text-xs text-slate-400">
                Service-ready allergen &amp; menu cockpit
              </div>
            </div>
          </div>

          {/* Active restaurant + status */}
          <div className="flex items-center gap-3 text-xs">
            <div className="text-right">
              <div className="uppercase tracking-[0.18em] text-slate-400 text-[10px]">
                Active restaurant
              </div>
              <div className="text-sm font-semibold">My Restaurant</div>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-3 py-1 border border-emerald-500/40 text-[11px] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live</span>
            </div>
          </div>
        </div>

        {/* CENTERED NAV TABS */}
        <nav className="sticky top-0 z-30 bg-gradient-to-br from-[#111827] to-[#020617] shadow-sm">
          <div className="mx-auto max-w-7xl px-6 py-3 flex justify-center text-sm">
            <div className="flex gap-4 overflow-x-auto">
              {topTabs.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      relative flex items-center gap-2 px-4 py-2 whitespace-nowrap
                      transition-all duration-200
                      ${
                        active
                          ? "text-white font-semibold"
                          : "text-slate-300 hover:text-white"
                      }
                    `}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                    {active && (
                      <span className="absolute inset-x-4 -bottom-1 h-0.5 rounded-full bg-emerald-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 md:px-8 py-8">
        <div
          className="
            rounded-3xl border border-white/10
            bg-slate-950/70 backdrop-blur-2xl
            shadow-[0_32px_80px_rgba(0,0,0,0.75)]
            p-6 md:p-8
          "
        >
          {children}
        </div>
      </main>
    </div>
  );
}
