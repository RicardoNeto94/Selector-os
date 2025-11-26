"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

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
            <Link href="/dashboard" className="sidebar-item block text-lg font-semibold text-gray-900 hover:text-green-600 transition">
              Dashboard
            </Link>

            <Link href="/dashboard/menu" className="sidebar-item block text-gray-700 hover:text-green-600 transition">
              🍽️ Menus
            </Link>

            <Link href="/dashboard/dishes" className="sidebar-item block text-gray-700 hover:text-green-600 transition">
              🥢 Dishes
            </Link>

            <Link href="/dashboard/allergens" className="sidebar-item block text-gray-700 hover:text-green-600 transition">
              ⚠️ Allergens
            </Link>
          </div>

          <div className="pt-6 border-t space-y-3">
            <Link href="/dashboard/settings" className="sidebar-item block text-gray-700 hover:text-green-600 transition">
              ⚙️ Settings
            </Link>

            <Link href="/dashboard/billing" className="sidebar-item block text-gray-700 hover:text-green-600 transition">
              💳 Billing
            </Link>

            <Link href="/logout" className="sidebar-item block text-red-500 hover:text-red-600 transition">
              ⤫ Log out
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">

        {/* Top bar */}
        <header className="h-16 border-b flex items-center px-6 relative bg-white">

          {/* Animated Logo */}
          <div
            className={`transition-all duration-500 font-bold ${
              logoSmall
                ? "text-xl text-green-600 absolute left-6"
                : "text-4xl mx-auto"
            }`}
          >
            Selector<span className="text-green-500">OS</span>
          </div>

          {/* PROFILE BUTTON */}
          <div className="absolute right-6">
            <ProfileDropdown />
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
        <main className="flex-1 overflow-y-auto px-12 py-10 page-fade">
          {children}
        </main>

      </div>
    </div>
  );
}

/* ---------------------------------------------
   TAB COMPONENT
----------------------------------------------*/

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

/* ---------------------------------------------
   PROFILE DROPDOWN COMPONENT
----------------------------------------------*/

function ProfileDropdown() {
  const supabase = createClientComponentClient();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const ref = useRef(null);

  // Load user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function close(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/sign-in";
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-full transition"
      >
        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold">
          {user?.email?.charAt(0)?.toUpperCase() || "U"}
        </div>

        <ChevronDownIcon className="w-4 h-4 text-gray-600" />
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-56 rounded-xl bg-white shadow-xl border p-4 z-50 animate-fade-scale">
          <p className="text-sm text-gray-700 font-medium truncate">
            {user?.email}
          </p>

          <hr className="my-3" />

          <button
            onClick={logout}
            className="w-full text-left text-red-600 hover:bg-red-50 py-2 px-2 rounded-lg font-semibold transition"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
