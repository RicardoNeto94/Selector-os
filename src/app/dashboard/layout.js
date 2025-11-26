"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// FIXED — correct path to globals.css
import "../../globals.css";

export default function DashboardLayout({ children }) {
  const [logoSmall, setLogoSmall] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLogoSmall(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r px-6 py-8 flex flex-col space-y-6 shadow-sm">
        <nav className="flex flex-col space-y-4 text-gray-700">

          <Link href="/dashboard" className="font-semibold hover:text-green-600">
            Dashboard
          </Link>

          <Link href="/dashboard/menu" className="hover:text-green-600">
            Menus
          </Link>

          <Link href="/dashboard/dishes" className="hover:text-green-600">
            Dishes
          </Link>

          <Link href="/dashboard/allergens" className="hover:text-green-600">
            Allergens
          </Link>

          <div className="border-t pt-4 mt-4 space-y-4">
            <Link href="/dashboard/settings" className="hover:text-green-600">
              Settings
            </Link>

            <Link href="/dashboard/billing" className="hover:text-green-600">
              Billing
            </Link>

            <Link href="/logout" className="hover:text-red-500">
              Log out
            </Link>
          </div>

        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">

        {/* Top bar with animated logo */}
        <header className="h-16 border-b flex items-center px-6 relative">
          <div
            className={`transition-all duration-500 font-bold ${
              logoSmall
                ? "text-xl text-green-600 absolute right-6"
                : "text-4xl mx-auto"
            }`}
          >
            Selector<span className="text-green-500">OS</span>
          </div>
        </header>

        {/* Horizontal scroll menu */}
        <div className="border-b flex space-x-4 overflow-x-auto px-6 py-3 bg-gray-50 text-sm">
          <Link href="/dashboard" className="font-medium hover:text-green-600">
            Overview
          </Link>
          <Link href="/dashboard/menu" className="hover:text-green-600">
            Menu
          </Link>
          <Link href="/dashboard/dishes" className="hover:text-green-600">
            Dishes
          </Link>
          <Link href="/dashboard/allergens" className="hover:text-green-600">
            Allergens
          </Link>
          <Link href="/dashboard/settings" className="hover:text-green-600">
            Settings
          </Link>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          {children}
        </main>

      </div>
    </div>
  );
}
