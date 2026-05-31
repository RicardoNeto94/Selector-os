"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";

export default function SpaDashboardPage() {

return (
<div className="so-main-inner space-y-8">

  <div>

    <h1 className="text-3xl font-light">
      Burman Spa
    </h1>

    <p className="mt-2 text-[var(--text-muted)]">
      Manage treatments, wellness products and food & beverage for the guest iPad experience.
    </p>

  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

    <Link
      href="/dashboard/spa/treatments"
      className="panel p-8 block hover:scale-[1.01] transition-all"
    >

      <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)] mb-4">
        Spa Catalogue
      </div>

      <h2 className="text-2xl font-light mb-3">
        Treatments
      </h2>

      <p className="text-sm text-[var(--text-muted)] leading-6">
        Manage massages, facials, body rituals, wellness journeys and signature spa experiences.
      </p>

      <div className="mt-8 text-sm font-medium text-[#8a3a2c]">
        Open Editor →
      </div>

    </Link>

    <Link
      href="/dashboard/spa/selfcare"
      className="panel p-8 block hover:scale-[1.01] transition-all"
    >

      <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)] mb-4">
        Spa Catalogue
      </div>

      <h2 className="text-2xl font-light mb-3">
        Wellness Products
      </h2>

      <p className="text-sm text-[var(--text-muted)] leading-6">
        Manage self care, bath rituals, skincare, oils, teas and spa retail items.
      </p>

      <div className="mt-8 text-sm font-medium text-[#8a3a2c]">
        Open Editor →
      </div>

    </Link>

    <Link
      href="/dashboard/spa/fnb"
      className="panel p-8 block hover:scale-[1.01] transition-all"
    >

      <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)] mb-4">
        Spa Catalogue
      </div>

      <h2 className="text-2xl font-light mb-3">
        Food & Beverage
      </h2>

      <p className="text-sm text-[var(--text-muted)] leading-6">
        Manage juices, smoothies, tea selection, light bites, champagne and wellness drinks.
      </p>

      <div className="mt-8 text-sm font-medium text-[#8a3a2c]">
        Open Editor →
      </div>

    </Link>

  </div>

  <div className="panel p-6">

    <div className="text-lg font-medium mb-2">
      Guest iPad Page
    </div>

    <p className="text-sm text-[var(--text-muted)] mb-5">
      Preview the live Burman Spa guest experience.
    </p>

    <a
      href="/spa/burman"
      target="_blank"
      className="button inline-block"
    >
      Open Guest View
    </a>

  </div>

</div>

);

}
