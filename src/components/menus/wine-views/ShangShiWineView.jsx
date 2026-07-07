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
      className="
        h-[100dvh]
        overflow-hidden
        flex
        items-center
        justify-center
        px-8
        touch-none
      "
      style={{
        background: `
          radial-gradient(
            circle at top,
            rgba(201,169,106,.06),
            transparent 35%
          ),
          linear-gradient(
            180deg,
            #003223 0%,
            #001a12 100%
          )
        `,
      }}
    >
      <div
        className={`
          w-full
          max-w-[720px]
          transition-all
          duration-300
          ${
            transitioning
              ? "opacity-0 blur-sm scale-[0.985]"
              : "opacity-100 scale-100"
          }
        `}
      >
        {/* HERO */}

        <div className="text-center mb-14 md:mb-16">
          <img
            src="/shangshi-logo.png"
            className="
              h-24
              md:h-28
              mx-auto
              mb-8
              opacity-95
            "
          />

          <div
            className="
              text-[#E3C588]
              uppercase
              tracking-[0.48em]
              text-[9px]
              mb-4
            "
          >
            WINE SELECTION
          </div>

          <div
            className="
              w-12
              h-[1px]
              mx-auto
              bg-[#E3C588]/20
              mb-6
            "
          />

          <p
            className="
              text-[#E3C588]/50
              text-[12px]
              font-light
              tracking-[0.01em]
            "
          >
            A journey through exceptional vineyards
          </p>

          <div
            className="
              mt-5
              text-[#E3C588]/35
              text-[9px]
              tracking-[0.32em]
              uppercase
            "
          >
            {guestItems.length} Wines Available
          </div>
        </div>

        {/* PRIMARY FILTERS */}

        <div
          className="
            flex
            justify-center
            gap-7
            flex-wrap
            mb-7
          "
        >
          {[
            "red",
            "white",
            "sparkling",
            "rose",
          ].map((type) => (
            <button
              key={type}
              onClick={() =>
                setFilters({
                  ...filters,
                  wine_type:
                    filters.wine_type === type
                      ? ""
                      : type,
                })
              }
              className={`
                uppercase
                tracking-[0.3em]
                text-[9px]
                transition-all
                ${
                  filters.wine_type === type
                    ? "text-[#E3C588]"
                    : "text-[#E3C588]/35"
                }
              `}
            >
              {type}
            </button>
          ))}
        </div>

        {/* BY THE GLASS */}

        {byTheGlassCount > 0 && (
          <div className="text-center mb-9">
            <button
              onClick={() =>
                setFilters({
                  ...filters,
                  service_type:
                    filters.service_type === "glass"
                      ? ""
                      : "glass",
                })
              }
              className={`
                inline-flex
                items-center
                gap-3
                px-5
                py-2.5
                border
                rounded-full
                uppercase
                tracking-[0.4em]
                text-[9px]
                transition-all
                ${
                  filters.service_type === "glass"
                    ? "border-[#E3C588]/50 bg-[#E3C588]/10 text-[#E3C588]"
                    : "border-[#E3C588]/15 text-[#E3C588]/50"
                }
              `}
            >
              By the Glass
              <span
                className="
                  tracking-normal
                  text-[9px]
                  opacity-60
                "
              >
                {byTheGlassCount}
              </span>
            </button>
          </div>
        )}

        {/* ADVANCED */}

        <div className="mb-9">
          <div
            className="
              flex
              items-center
              justify-center
              gap-4
              md:gap-6
            "
          >
            <button
              onClick={() =>
                setShowAdvanced(!showAdvanced)
              }
              className="
                flex
                items-center
                gap-3
                text-[#E3C588]/42
                uppercase
                tracking-[0.28em]
                text-[8px]
                transition-colors
                hover:text-[#E3C588]/75
              "
            >
              <span>Country</span>
              <span className="text-[#E3C588]/18">·</span>
              <span>Region</span>
              <span className="text-[#E3C588]/18">·</span>
              <span>Vintage</span>
              <span className="text-[#E3C588]/18">·</span>
              <span>Grape</span>
              <span className="text-[#E3C588]/18">·</span>
              <span>Price</span>

              <span
                className={`
                  ml-1
                  text-[#E3C588]/55
                  text-[13px]
                  font-light
                  transition-transform
                  duration-300
                  ${
                    showAdvanced
                      ? "rotate-45"
                      : "rotate-0"
                  }
                `}
              >
                +
              </span>
            </button>
          </div>

          <div
            className={`
              grid
              transition-all
              duration-300
              ease-out
              ${
                showAdvanced
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }
            `}
          >
            <div className="overflow-hidden">
              <div
                className="
                  grid
                  grid-cols-2
                  md:grid-cols-5
                  gap-x-7
                  gap-y-6
                  pt-8
                "
              >
                {[
                  {
                    key: "country",
                    label: "Country",
                    values: countries,
                  },
                  {
                    key: "region",
                    label: "Region",
                    values: regions,
                  },
                  {
                    key: "vintage",
                    label: "Vintage",
                    values: vintages,
                  },
                  {
                    key: "grapes",
                    label: "Grape",
                    values: grapes,
                  },
                ].map((field) => (
                  <label
                    key={field.key}
                    className="min-w-0"
                  >
                    <span
                      className="
                        block
                        mb-3
                        text-[#E3C588]/28
                        text-[7px]
                        uppercase
                        tracking-[0.3em]
                      "
                    >
                      {field.label}
                    </span>

                    <select
                      value={filters[field.key]}
                      onChange={(e) => {
                        const value = e.target.value;

                        setFilters((current) => {
                          const next = {
                            ...current,
                            [field.key]: value,
                          };

                          if (field.key === "country") {
                            next.region = "";
                            next.vintage = "";
                            next.grapes = "";
                          }

                          if (field.key === "region") {
                            next.vintage = "";
                            next.grapes = "";
                          }

                          if (field.key === "vintage") {
                            next.grapes = "";
                          }

                          return next;
                        });
                      }}
                      className="
                        w-full
                        min-w-0
                        appearance-none
                        bg-transparent
                        border-0
                        border-b
                        border-[#E3C588]/12
                        rounded-none
                        pb-2.5
                        pr-2
                        text-[#E3C588]/75
                        text-[10px]
                        outline-none
                        cursor-pointer
                      "
                    >
                      <option
                        value=""
                        className="text-black"
                      >
                        All
                      </option>

                      {field.values.map((value) => (
                        <option
                          key={value}
                          value={value}
                          className="text-black"
                        >
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}

                <label className="min-w-0">
                  <span
                    className="
                      block
                      mb-3
                      text-[#E3C588]/28
                      text-[7px]
                      uppercase
                      tracking-[0.3em]
                    "
                  >
                    Price
                  </span>

                  <select
                    value={filters.price}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        price: e.target.value,
                      })
                    }
                    className="
                      w-full
                      appearance-none
                      bg-transparent
                      border-0
                      border-b
                      border-[#E3C588]/12
                      rounded-none
                      pb-2.5
                      pr-2
                      text-[#E3C588]/75
                      text-[10px]
                      outline-none
                      cursor-pointer
                    "
                  >
                    <option
                      value=""
                      className="text-black"
                    >
                      All
                    </option>

                    <option value="0-50" className="text-black">
                      Under €50
                    </option>

                    <option value="50-100" className="text-black">
                      €50–100
                    </option>

                    <option value="100-150" className="text-black">
                      €100–150
                    </option>

                    <option value="150+" className="text-black">
                      €150+
                    </option>
                  </select>
                </label>
              </div>

              {Object.values(filters).some(Boolean) && (
                <div
                  className="
                    flex
                    justify-end
                    pt-5
                  "
                >
                  <button
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
                    className="
                      text-[#E3C588]/30
                      text-[7px]
                      uppercase
                      tracking-[0.3em]
                      transition-colors
                      hover:text-[#E3C588]/60
                    "
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-6">
          <button
            onClick={() => {
              setTransitioning(true);

              setTimeout(() => {
                setShowResults(true);
              }, 300);
            }}
            className="
              w-full
              border-b
              border-[#E3C588]/20
              pb-4
              text-[#E3C588]
              uppercase
              tracking-[0.48em]
              text-[11px]
              opacity-80
              hover:opacity-100
              transition-all
            "
          >
            Show Selection
          </button>
        </div>
      </div>
    </div>
  );
}