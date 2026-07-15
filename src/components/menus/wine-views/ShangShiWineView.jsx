"use client";

import { useMemo, useState } from "react";
import WineResultsView from "./ShangShiWineResultsView";

function getWine(item) {
  if (Array.isArray(item?.wines)) {
    return item.wines[0] || {};
  }

  return item?.wines || item || {};
}

function normalize(str) {
  return String(str || "").trim();
}

export default function ShangShiWineView({
  menu,
  items,
}) {
  const [filters, setFilters] = useState({
    wine_type: "",
    country: "",
    region: "",
    vintage: "",
    grapes: "",
    price: "",
    service_type: "",
  });

  const [showResults, setShowResults] =
    useState(false);

  const [showAdvanced, setShowAdvanced] =
    useState(false);

  const [transitioning, setTransitioning] =
    useState(false);

  /* =======================================================
     GUEST WINE DATA
  ======================================================= */

  const guestItems = useMemo(() => {
    return (items || []).map((item) => {
      const wine = getWine(item);

      return {
        ...item,

        service_type:
          item?.service_type || "bottle",

        glass_price:
          item?.glass_price !== null &&
          item?.glass_price !== undefined
            ? Number(item.glass_price)
            : null,

        price_override:
          item?.price_override !== null &&
          item?.price_override !== undefined
            ? Number(item.price_override)
            : null,

        wines: {
          ...wine,

          price:
            item?.price_override !== null &&
            item?.price_override !== undefined
              ? Number(item.price_override)
              : wine.price,
        },
      };
    });
  }, [items]);

  const wines = useMemo(() => {
    return guestItems.map(getWine);
  }, [guestItems]);

  const byTheGlassCount = useMemo(() => {
    return guestItems.filter(
      (item) =>
        (item.service_type === "glass" ||
          item.service_type === "both") &&
        item.glass_price !== null
    ).length;
  }, [guestItems]);

  /* =======================================================
     ADAPTIVE FILTER DATA
  ======================================================= */

  const countries = [
    ...new Set(
      wines
        .map((wine) =>
          normalize(wine.country)
        )
        .filter(Boolean)
    ),
  ].sort();

  const filteredRegionsSource = wines.filter(
    (wine) =>
      !filters.country ||
      normalize(wine.country) ===
        filters.country
  );

  const regions = [
    ...new Set(
      filteredRegionsSource
        .map((wine) =>
          normalize(wine.region)
        )
        .filter(Boolean)
    ),
  ].sort();

  const filteredVintageSource =
    filteredRegionsSource.filter(
      (wine) =>
        !filters.region ||
        normalize(wine.region) ===
          filters.region
    );

  const vintages = [
    ...new Set(
      filteredVintageSource
        .map((wine) => wine.vintage)
        .filter(Boolean)
    ),
  ].sort((a, b) => b - a);

  const filteredGrapeSource =
    filteredVintageSource.filter(
      (wine) =>
        !filters.vintage ||
        String(wine.vintage) ===
          String(filters.vintage)
    );

  const grapes = [
    ...new Set(
      filteredGrapeSource
        .flatMap((wine) =>
          normalize(wine.grapes)
            .split(/[,;/+&|]+/)
            .map((grape) => grape.trim())
            .filter(Boolean)
        )
    ),
  ].sort((a, b) =>
    a.localeCompare(b)
  );

  /* =======================================================
     RESULTS
  ======================================================= */

  if (showResults) {
    return (
      <WineResultsView
        menu={menu}
        items={guestItems}
        filters={filters}
        onBack={() => {
          setShowResults(false);

          setTimeout(() => {
            setTransitioning(false);
          }, 50);
        }}
      />
    );
  }

  return (
    <div
      className="relative h-[100dvh] overflow-hidden bg-[#00140e] text-[#F3E9D2]"
      style={{
        backgroundImage: `
          linear-gradient(
            90deg,
            rgba(0, 18, 13, 0.34) 0%,
            rgba(0, 18, 13, 0.46) 48%,
            rgba(0, 12, 8, 0.20) 100%
          ),
          url('/wine/shangshi-wine-background.png')
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#00140e]/20 via-[#00140e]/30 to-[#00140e]/10" />

      <div
        className={`relative z-10 h-full transition-all duration-300 ${
          transitioning
            ? "opacity-0 blur-sm scale-[0.99]"
            : "opacity-100 scale-100"
        }`}
      >
        <div className="absolute left-8 top-7 md:left-12 md:top-10">
          <img
            src="/shangshi-logo.png"
            alt="Shang Shi"
            className="h-16 opacity-95 md:h-20"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(true)}
          className="absolute right-8 top-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.26em] text-[#E3C588]/70 transition-colors hover:text-[#E3C588] md:right-12 md:top-11 md:text-[12px]"
        >
          Advanced Filters
          <span className="text-[18px] leading-none">☷</span>
        </button>

        <main className="flex h-full items-center justify-center px-8 md:px-16">
          <section className="mt-6 w-full max-w-[1020px] text-center">
            <div className="mb-5 text-[13px] uppercase tracking-[0.42em] text-[#E3C588]/82 md:text-[14px]">
              THE
            </div>

            <h1 className="mb-7 font-serif text-[52px] font-light leading-[0.95] tracking-[0.04em] text-[#F2E8D4] md:text-[76px] lg:text-[88px]">
              WINE COLLECTION
            </h1>

            <div className="mb-7 flex items-center justify-center gap-4">
              <span className="h-px w-24 bg-[#E3C588]/35" />
              <span className="text-[13px] text-[#E3C588]/70">◇</span>
              <span className="h-px w-24 bg-[#E3C588]/35" />
            </div>

            <p className="mx-auto mb-5 max-w-[670px] text-[17px] font-light leading-[1.7] text-[#D9CBB2]/72 md:text-[19px]">
              A curated cellar selected to complement the elegance and depth of
              Cantonese cuisine.
            </p>

            <div className="mb-10 text-[11px] uppercase tracking-[0.28em] text-[#E3C588]/62 md:text-[12px]">
              {guestItems.length} Wines Available
            </div>

            <div className="mb-8 flex items-center justify-center gap-10 md:gap-16">
              {["red", "white", "rose", "sparkling"].map((type) => {
                const active = filters.wine_type === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        wine_type: active ? "" : type,
                      })
                    }
                    className={`relative pb-3 text-[12px] uppercase tracking-[0.26em] transition-colors md:text-[13px] ${
                      active
                        ? "text-[#E3C588]"
                        : "text-[#F2E8D4]/68 hover:text-[#E3C588]"
                    }`}
                  >
                    {type}
                    <span
                      className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 bg-[#E3C588] transition-all ${
                        active ? "w-10 opacity-100" : "w-0 opacity-0"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {byTheGlassCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    ...filters,
                    service_type:
                      filters.service_type === "glass" ? "" : "glass",
                  })
                }
                className={`mb-10 inline-flex items-center gap-3 text-[12px] uppercase tracking-[0.24em] transition-colors md:text-[13px] ${
                  filters.service_type === "glass"
                    ? "text-[#E3C588]"
                    : "text-[#E3C588]/62 hover:text-[#E3C588]"
                }`}
              >
                <span className="text-[18px] leading-none">♧</span>
                <span>By the Glass</span>
                <span className="text-[11px] tracking-normal opacity-70">
                  {byTheGlassCount}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setTransitioning(true);
                setTimeout(() => setShowResults(true), 300);
              }}
              className="group mx-auto flex w-full max-w-[760px] items-center justify-between border border-[#E3C588]/38 bg-[#E3C588]/[0.04] px-8 py-5 text-[13px] uppercase tracking-[0.34em] text-[#E3C588] transition-all hover:border-[#E3C588]/58 hover:bg-[#E3C588]/[0.08] md:text-[14px]"
            >
              <span>Explore the Collection</span>
              <span className="text-[23px] leading-none transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
          </section>
        </main>
      </div>

      {showAdvanced && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5 py-6">
          <button
            type="button"
            aria-label="Close advanced filters"
            onClick={() => setShowAdvanced(false)}
            className="absolute inset-0 bg-[#00110c]/84 backdrop-blur-md"
          />

          <section className="relative z-10 max-h-[82dvh] w-full max-w-[760px] overflow-y-auto rounded-[24px] border border-[#E3C588]/18 bg-[#06261c]/96 px-6 py-7 shadow-2xl md:px-9 md:py-8">
            <div className="mb-7 flex items-start justify-between gap-6">
              <div>
                <div className="mb-2 text-[12px] uppercase tracking-[0.32em] text-[#E3C588] md:text-[13px]">
                  Advanced Filters
                </div>
                <p className="text-[14px] font-light text-[#E3C588]/42 md:text-[15px]">
                  Refine the collection by origin, vintage, grape or price.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(false)}
                className="h-10 w-10 shrink-0 rounded-full border border-[#E3C588]/18 text-[22px] leading-none text-[#E3C588]/70 transition-all hover:border-[#E3C588]/35 hover:text-[#E3C588]"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
              {[
                { key: "country", label: "Country", values: countries },
                { key: "region", label: "Region", values: regions },
                { key: "vintage", label: "Vintage", values: vintages },
                { key: "grapes", label: "Grape", values: grapes },
              ].map((field) => (
                <label key={field.key} className="min-w-0">
                  <span className="mb-3 block text-[11px] uppercase tracking-[0.26em] text-[#E3C588]/35">
                    {field.label}
                  </span>
                  <select
                    value={filters[field.key]}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilters((current) => {
                        const next = { ...current, [field.key]: value };
                        if (field.key === "country") {
                          next.region = "";
                          next.vintage = "";
                          next.grapes = "";
                        }
                        if (field.key === "region") {
                          next.vintage = "";
                          next.grapes = "";
                        }
                        if (field.key === "vintage") next.grapes = "";
                        return next;
                      });
                    }}
                    className="w-full appearance-none rounded-xl border border-[#E3C588]/14 bg-[#001a12]/35 px-4 py-3.5 text-[15px] text-[#E3C588]/82 outline-none"
                  >
                    <option value="" className="text-black">All</option>
                    {field.values.map((value) => (
                      <option key={value} value={value} className="text-black">
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              ))}

              <label className="min-w-0">
                <span className="mb-3 block text-[11px] uppercase tracking-[0.26em] text-[#E3C588]/35">
                  Price
                </span>
                <select
                  value={filters.price}
                  onChange={(e) =>
                    setFilters({ ...filters, price: e.target.value })
                  }
                  className="w-full appearance-none rounded-xl border border-[#E3C588]/14 bg-[#001a12]/35 px-4 py-3.5 text-[15px] text-[#E3C588]/82 outline-none"
                >
                  <option value="" className="text-black">All</option>
                  <option value="0-50" className="text-black">Under €50</option>
                  <option value="50-100" className="text-black">€50–100</option>
                  <option value="100-150" className="text-black">€100–150</option>
                  <option value="150+" className="text-black">€150+</option>
                </select>
              </label>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-4 border-t border-[#E3C588]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    wine_type: "",
                    country: "",
                    region: "",
                    vintage: "",
                    grapes: "",
                    price: "",
                    service_type: "",
                  })
                }
                className="text-[11px] uppercase tracking-[0.26em] text-[#E3C588]/45 transition-colors hover:text-[#E3C588]/80"
              >
                Clear Filters
              </button>

              <button
                type="button"
                onClick={() => setShowAdvanced(false)}
                className="min-w-[210px] rounded-full border border-[#E3C588]/35 bg-[#E3C588]/10 px-7 py-3.5 text-[12px] uppercase tracking-[0.26em] text-[#E3C588] transition-all hover:bg-[#E3C588]/15"
              >
                Apply Filters
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}