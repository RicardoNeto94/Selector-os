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
    <div className="min-h-screen bg-[#f5f6fa] flex flex-col">
      
      {/* HEADER (Logo + Restaurant status) */}
      <header className="bg-gradient-to-br from-brand-dark to-brand-darkAlt text-white shadow-soft">
        
        <div className="mx-auto max-w-7xl px-8 py-4 flex items-center justify-between">
          
          {/* LEFT SIDE: LOGO */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-bold">
              S
            </div>
            <div>
              <div className="text-xl font-semibold tracking-tight">SelectorOS</div>
              <div className="text-xs text-white/60 -mt-0.5">
                Service-ready allergen & menu cockpit
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: STATUS */}
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

     {/* 🔥 NEW CENTERED HORIZONTAL NAV MENU WITH ICONS */}
<nav className="mx-auto max-w-7xl px-8 pb-4 flex justify-center text-sm">
  <div className="flex gap-4 overflow-x-auto">
    {topTabs.map((item) => {
      const active =
        pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(item.href));

      return (
        <Link
          key={item.href}
          href={item.href}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full transition whitespace-nowrap
            ${
              active
                ? "bg-white text-brand-dark shadow-md"
                : "text-white/70 hover:bg-white/10"
            }
          `}
        >
          <span className="text-base">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      );
    })}
  </div>
</nav>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 md:px-8 py-6">
        <div className="rounded-2xl shadow-soft bg-white/70 backdrop-blur-sm p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
