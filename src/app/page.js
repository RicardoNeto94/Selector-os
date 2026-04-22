"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {

  const router = useRouter();

  useEffect(() => {
    const lastSlug = localStorage.getItem("lastSlug");

    // 🔥 If opened from QR before → go back to that menu
    if (lastSlug) {
      router.replace(`/menu/${lastSlug}`);
      return;
    }

    // fallback → go to landing page (handled below)
  }, []);

  return (
    <main className="min-h-screen text-white">

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">

        <h1 className="text-5xl font-semibold">
          The operating system for restaurant menus
        </h1>

        <p className="text-slate-400 mt-4 text-lg max-w-2xl mx-auto">
          SelectorOS helps restaurants manage dishes, allergens and menus
          from a single workspace.
        </p>

        <div className="flex justify-center gap-4 mt-8">

          <a
            href="/sign-up"
            className="px-6 py-3 rounded-full bg-white text-black font-medium"
          >
            Start Workspace
          </a>

          <a
            href="/sign-in"
            className="px-6 py-3 rounded-full border border-white/30"
          >
            Login
          </a>

        </div>

      </section>

    </main>
  );
}