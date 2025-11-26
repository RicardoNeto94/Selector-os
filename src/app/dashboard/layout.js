"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import "../../styles/globals.css";

export default function DashboardLayout({ children }) {
  const [logoSmall, setLogoSmall] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLogoSmall(true), 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">

      {/* Sidebar */}
      <aside className="
        w-64 
        bg-white/80 
        backdrop-blur-xl 
        border-r 
        px-6 
        py-8 
        flex 
        flex-col 
        justify-between 
      ">
        <nav className="space-y-6">
          <div className="space-y-3">
            <Link href="/dashboard" className="block text-lg font-semibold text-gray-900 hover:text-green-600 transition">
              Dashboard
            </Link>

            <Link href="/dashboard/menu" className="block text-gray-700 hover:text-green-600 transition">
              🍽️ Menus
            </Link>

            <Link href="/dashboard/dishes" className="block text-gray-700 hover:text-green-600 transition">
              🥢 Dishes
            </Link>

            <Link href="/dashboard/allergens" className="block text-gray-700 hover:text-green-600 transition">
              ⚠️ Allergens
            </Link>
          </div>

          <div className="pt-6 border-t space-y-3">
            <Link href="/dashboard/settings" className="block text-gray-700 hover:text-green-600 transition">
              ⚙️ Settings
            </Link>

            <Link href="/dashboard/billing" className="block text-gray-700 hover:text-green-600 transition">
              💳 Billing
            </Link>

            <Link href="/logout" className="block text-red-500 hover:text-red-600 transition">
              ⤫ Log out
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">

        {/* Top bar */}
        <header className="h-16 border-b bg-white/70 backdrop-blur-lg flex items-center px-6 relative shadow-sm">

          <div
            className={`transition-all duration-500 font-bold tracking-tight ${
              logoSmall
                ? "text-xl text-green-600 absolute right-6"
                : "text-4xl mx-auto"
            }`}
          >
            Selector<span className="text-green-500">OS</span>
          </div>
        </header>

        {/* Horizontal tabs */}
        <div className="border-b bg-white/60 backdrop-blur-md flex space-x-6 px-6 py-4 text-sm">
          <Tab href="/dashboard" label="Overview" />
          <Tab href="/dashboard/menu" label="Menu" />
          <Tab href="/dashboard/dishes" label="Dishes" />
          <Tab href="/dashboard/allergens" label="Allergens" />
          <Tab href="/dashboard/settings" label="Settings" />
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-12 py-10">
          {children}
        </main>

      </div>
    </div>
  );
}

/* Reusable tab with active indicator */
function Tab({ href, label }) {
  const isActive = typeof window !== "undefined" && window.location.pathname === href;

  return (
    <Link
      href={href}
      className={`
        relative pb-2 transition 
        ${isActive ? "text-green-600 font-semibold" : "text-gray-600 hover:text-gray-900"}
      `}
    >
      {label}
      {isActive && (
        <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-green-500 rounded-full"></span>
      )}
    </Link>
  );
}
