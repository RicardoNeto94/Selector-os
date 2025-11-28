"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  const items = [
    { id: "dashboard", icon: HomeIcon, label: "Overview", href: "/dashboard" },
    { id: "menu", icon: Squares2X2Icon, label: "Menus", href: "/dashboard/menu" },
    { id: "dishes", icon: ClipboardDocumentListIcon, label: "Dishes", href: "/dashboard/dishes" },
    { id: "allergen", icon: ExclamationTriangleIcon, label: "Allergens", href: "/dashboard/allergen" },
    { id: "billing", icon: CreditCardIcon, label: "Billing", href: "/dashboard/billing" },
    { id: "settings", icon: Cog6ToothIcon, label: "Settings", href: "/dashboard/settings" },
  ];

  const getActive = () => {
    if (!pathname) return "";
    const parts = pathname.split("/").filter(Boolean); // ["dashboard", "menu"]
    return parts[1] || "dashboard";
  };

  const active = getActive();

  return (
    <aside
      className={`sidebar-wall fixed left-0 top-0 h-screen ${
        expanded ? "w-56" : "w-20"
      } flex flex-col items-center py-4 gap-6 transition-all duration-300 z-40`}
    >
      {/* Expand / collapse */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="sidebar-pill flex items-center justify-center"
      >
        <span className="sidebar-icon text-lg text-slate-100">
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
          const Icon = item.icon;
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
                <Icon className="sidebar-icon text-slate-100" />
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
