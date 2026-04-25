"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#05070a] text-white">

      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-10 py-6">
        <div className="text-[#c6a46c] tracking-widest font-semibold">
          VAXERON
        </div>

        <div className="flex gap-8 text-sm text-white/60">
          <span>Product</span>
          <span>Solutions</span>
          <span>Resources</span>
          <span>About</span>
        </div>

        <div className="flex gap-4">
          <Link href="/sign-in" className="text-white/70">
            Log in
          </Link>

          <button className="border border-[#c6a46c] text-[#c6a46c] px-4 py-2 rounded-lg">
            Request Access
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-10 py-24 grid grid-cols-2 gap-16 items-center">

        {/* LEFT */}
        <div>
          <h1 className="text-6xl font-light leading-tight">
            Infrastructure for <br />
            <span className="text-[#c6a46c]">refined hospitality.</span>
          </h1>

          <p className="text-white/50 mt-6 max-w-md">
            Menus, wine, spa, and guest experience — unified in one controlled system.
          </p>

          <div className="flex gap-4 mt-8">
            <button className="bg-[#c6a46c] text-black px-6 py-3 rounded-xl">
              Request Access
            </button>

            <button className="border border-white/20 px-6 py-3 rounded-xl">
              Book Walkthrough
            </button>
          </div>
        </div>

        {/* RIGHT MOCK */}
        <div className="bg-gradient-to-br from-[#0b0e12] to-[#11151a] rounded-2xl h-[340px] shadow-2xl" />
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-10 grid grid-cols-4 gap-6 pb-24">

        {[
          ["Menus", "Designed once. Consistent everywhere."],
          ["Wine Cellar", "Inventory built for service."],
          ["Spa & Services", "Control in execution."],
          ["Guest Interface", "Seamless guest experience."]
        ].map(([title, desc]) => (
          <div
            key={title}
            className="bg-[#0c0f14] p-6 rounded-2xl border border-white/5"
          >
            <h3 className="text-lg text-[#c6a46c]">{title}</h3>
            <p className="text-white/50 mt-2 text-sm">{desc}</p>
          </div>
        ))}

      </section>

      {/* CTA */}
      <section className="text-center py-24 border-t border-white/5">
        <h2 className="text-3xl">
          For teams that operate with precision.
        </h2>

        <p className="text-white/50 mt-2">
          Let VAXERON elevate every aspect of your operation.
        </p>

        <div className="flex justify-center gap-4 mt-6">
          <button className="bg-[#c6a46c] text-black px-6 py-3 rounded-xl">
            Request Access
          </button>

          <button className="border border-white/20 px-6 py-3 rounded-xl">
            Book Walkthrough
          </button>
        </div>
      </section>

    </main>
  );
}