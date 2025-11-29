"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  QueueListIcon,
  Squares2X2Icon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const NAV_ITEMS = [
  { id: "dashboard", href: "/dashboard", icon: HomeIcon },
  { id: "dishes", href: "/dashboard/dishes", icon: QueueListIcon },
  { id: "menu", href: "/dashboard/menu", icon: Squares2X2Icon },
  { id: "settings", href: "/dashboard/settings", icon: Cog6ToothIcon },
];

function isActive(pathname, href) {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar-wall fixed inset-y-0 left-0 w-20 flex flex-col items-center py-6 z-40">
      {/* Mini logo */}
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-black/40 text-[10px] font-semibold tracking-[0.22em]">
        SO
      </div>

      {/* Nav icons */}
      <nav className="flex flex-col gap-3">
        {NAV_ITEMS.map(({ id, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={id} href={href} className="block">
              <div className={`sidebar-pill ${active ? "active" : ""}`}>
                <Icon className="sidebar-icon" />
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
