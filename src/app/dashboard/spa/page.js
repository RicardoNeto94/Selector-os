"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowTopRightOnSquareIcon,
  BeakerIcon,
  BuildingStorefrontIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const SPA_AREAS = [
  {
    href: "/dashboard/spa/treatments",
    eyebrow: "Spa catalogue",
    title: "Treatments",
    description:
      "Manage massages, facials, body rituals, wellness journeys and signature spa experiences.",
    icon: SparklesIcon,
    accent: "from-[#e8f0ec] to-[#d8e5df]",
    iconBackground: "bg-[#dfeae5]",
    iconColor: "text-[#55766b]",
  },
  {
    href: "/dashboard/spa/selfcare",
    eyebrow: "Retail & self care",
    title: "Wellness Products",
    description:
      "Manage self care, bath rituals, skincare, oils, teas and spa retail items.",
    icon: BuildingStorefrontIcon,
    accent: "from-[#edf1e9] to-[#dfe8dc]",
    iconBackground: "bg-[#e3ebe0]",
    iconColor: "text-[#64785e]",
  },
  {
    href: "/dashboard/spa/fnb",
    eyebrow: "Food & beverage",
    title: "Spa Refreshments",
    description:
      "Manage juices, smoothies, tea selection, light bites, champagne and wellness drinks.",
    icon: BeakerIcon,
    accent: "from-[#e4ebe2] to-[#dce4da]",
    iconBackground: "bg-[#dfe8dd]",
    iconColor: "text-[#596f56]",
  },
];

export default function SpaDashboardPage() {
  return (
    <div className="so-main-inner space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-[20px] border border-[#dbe6e0] bg-[#f4f8f5] px-5 py-5 sm:px-7">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#9fc1b5]/20 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.24em] text-[#638076]">
              Wellness operations
            </div>

            <h1 className="text-[31px] font-light leading-none text-[#342720] sm:text-[36px]">
              Burman Spa
            </h1>

            <p className="mt-2 max-w-2xl text-[12px] leading-5 text-[#75685f]">
              Manage treatments, wellness products and refreshments presented
              through the guest iPad experience.
            </p>
          </div>

          <a
            href="/spa/burman"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#294039] bg-[#294039] px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 hover:bg-[#36544b]"
          >
            Open guest view
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#a09287]">
              Spa catalogue
            </div>

            <h2 className="mt-1 text-[21px] font-medium text-[#3b2c25]">
              Manage the guest experience
            </h2>
          </div>

          <p className="max-w-md text-[12px] leading-5 text-[#8b7e74]">
            Select an area to update its categories, products and guest-facing
            content.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {SPA_AREAS.map((area) => {
            const Icon = area.icon;

            return (
              <Link
                href={area.href}
                key={area.href}
                className="group relative min-h-[205px] overflow-hidden rounded-[18px] border border-[#e7ddd4] bg-white/78 p-5 transition duration-200 hover:border-[#b9ccc5] hover:bg-white"
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${area.accent} opacity-65`}
                  aria-hidden="true"
                />

                <div className="relative flex h-full flex-col">
                  <div
                    className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${area.iconBackground} ${area.iconColor}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#9d8f84]">
                    {area.eyebrow}
                  </div>

                  <h3 className="mt-2 text-[21px] font-medium tracking-[-0.02em] text-[#3a2c25]">
                    {area.title}
                  </h3>

                  <p className="mt-2 max-w-sm text-[12px] leading-5 text-[#7b6f66]">
                    {area.description}
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#944a39]">
                      Open editor
                    </span>

                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e6d9cf] text-[#944a39] transition group-hover:border-[#944a39] group-hover:bg-[#944a39] group-hover:text-white">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}
