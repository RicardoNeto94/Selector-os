"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  const items = [
    { id: "dashboard", icon: "🏠", label: "Overview", href: "/dashboard" },
    { id: "menu", icon: "📋", label: "Menus", href: "/dashboard/menu" },
    { id: "dishes", icon: "🍽️", label: "Dishes", href: "/dashboard/dishes" },
    { id: "allergen", icon: "⚠️", label: "Allergens", href: "/dashboard/allergen" },
    { id: "billing", icon: "💳", label: "Billing", href: "/dashboard/billing" },
    { id: "settings", icon: "⚙️", label: "Settings", href: "/dashboard/settings" },
  ];

  // Detect active section by pathname:
  const getActive = () => {
    if (!pathname) return "";
    const parts = pathname.split("/").filter(Boolean); // ["dashboard", "menu"]
    return parts[1] || "dashboard";
  };

  const active = getActive();

  return (
    <aside
      className={`sidebar-wall ${
        expanded ? "w-56" : "w-20"
      } min-h-screen flex flex-col items-center py-6 gap-6 transition-all duration-300`}
    >
      {/* Expand / collapse */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="sidebar-pill flex items-center justify-center"
      >
        <span className="sidebar-icon text-lg">
          {expanded ? "←" : "→"}
        </span>
        {expanded && (
          <span className="ml-2 text-xs text-slate-200 whitespace-nowrap">
            Collapse
          </span>
        )}
      </button>

      {/* Menu items */}
      <div className="mt-4 flex flex-col items-stretch gap-4 w-full">
        {items.map((item) => {
          const isActive = active === item.id;

          return (
            <div
              key={item.id}
              className={`flex items-center ${
                expanded ? "justify-start pl-1" : "justify-center"
              }`}
            >
              <Link
                href={item.href}
                className={`sidebar-pill ${isActive ? "active" : ""}`}
              >
                <span className="sidebar-icon text-2xl">{item.icon}</span>
              </Link>

              {expanded && (
                <span className="ml-3 text-sm text-slate-100 whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
