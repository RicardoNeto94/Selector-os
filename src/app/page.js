"use client";

import Link from "next/link";
import "@/styles/vaxeron.css";

export default function HomePage() {
  return (
    <main className="min-h-screen">

      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-10 py-6">

        <div className="text-[var(--accent)] tracking-widest font-semibold">
          VAXERON
        </div>

        <div className="flex gap-8 text-sm text-[var(--text-muted)]">
          <span>Product</span>
          <span>Solutions</span>
          <span>Resources</span>
          <span>About</span>
        </div>

        <div className="flex gap-4">
          <Link href="/sign-in" className="text-[var(--text-muted)]">
            Log in
          </Link>

          <button className="button">
            Request Access
          </button>
        </div>

      </nav>

      {/* HERO */}
      <section className="so-main-inner px-10 py-24 grid grid-cols-2 gap-16 items-center">

        {/* LEFT */}
        <div>
          <h1 className="text-6xl font-light leading-tight">
            Infrastructure for <br />
            <span>refined hospitality.</span>
          </h1>

          <p className="mt-6 max-w-md">
            Menus, wine, spa, and guest experience — unified in one controlled system.
          </p>

          <div className="flex gap-4 mt-8">
            <button className="button">
              Request Access
            </button>

            <button className="input">
              Book Walkthrough
            </button>
          </div>
        </div>

        {/* RIGHT MOCK */}
        <div className="panel h-[340px]" />

      </section>

      {/* FEATURES */}
      <section className="so-main-inner px-10 grid grid-cols-4 gap-6 pb-24">

        {[
          ["Menus", "Designed once. Consistent everywhere."],
          ["Wine Cellar", "Inventory built for service."],
          ["Spa & Services", "Control in execution."],
          ["Guest Interface", "Seamless guest experience."]
        ].map(([title, desc]) => (
          <div key={title} className="panel p-6">

            <h3 className="text-lg text-[var(--accent)]">
              {title}
            </h3>

            <p className="mt-2 text-sm">
              {desc}
            </p>

          </div>
        ))}

      </section>

      {/* CTA */}
      <section className="text-center py-24 border-t border-[var(--border)]">

        <h2 className="text-3xl">
          For teams that operate with precision.
        </h2>

        <p className="mt-2">
          Let VAXERON elevate every aspect of your operation.
        </p>

        <div className="flex justify-center gap-4 mt-6">
          <button className="button">
            Request Access
          </button>

          <button className="input">
            Book Walkthrough
          </button>
        </div>

      </section>

    </main>
  );
}