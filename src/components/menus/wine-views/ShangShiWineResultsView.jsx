"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

/* =======================================================
   HELPERS
======================================================= */

function normalize(value) {
  return String(value ?? "").trim();
}

function normalizeLower(value) {
  return normalize(value).toLowerCase();
}

function formatPrice(value) {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-IE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getWine(item) {
  if (!item) {
    return null;
  }

  const rawWine = Array.isArray(item.wines)
    ? item.wines[0]
    : item.wines || item.wine || null;

  if (!rawWine) {
    return null;
  }

  return {
    id:
      rawWine.id ||
      item.id ||
      "",

    menuItemId:
      item.id || "",

    name:
      rawWine.name ||
      "Unknown Wine",

    producer:
      rawWine.producer || "",

    country:
      rawWine.country || "",

    region:
      rawWine.region || "",

    subregion:
      rawWine.subregion || "",

    wine_type:
      rawWine.wine_type ||
      "Collection",

    grapes:
      rawWine.grapes || "",

    vintage:
      rawWine.vintage || "NV",

    bottle_size:
      rawWine.bottle_size ||
      rawWine.bottle_size_ml ||
      "",

    alcohol:
      rawWine.alcohol ||
      rawWine.alcohol_percentage ||
      "",

    description:
      item.description ||
      rawWine.description ||
      "",

    pairing:
      item.pairing ||
      item.food_pairing ||
      rawWine.pairing ||
      rawWine.food_pairing ||
      "",

    price:
      item.price_override !== null &&
      item.price_override !== undefined
        ? Number(item.price_override)
        : Number(rawWine.price || 0),

    service_type:
      item.service_type ||
      "bottle",

    glass_price:
      item.glass_price !== null &&
      item.glass_price !== undefined
        ? Number(item.glass_price)
        : null,
  };
}

function matchesExact(value, filter) {
  if (!filter) {
    return true;
  }

  return (
    normalizeLower(value) ===
    normalizeLower(filter)
  );
}

function isByTheGlass(wine) {
  return (
    wine?.service_type === "glass" ||
    wine?.service_type === "both"
  );
}

function includesSearch(wine, search) {
  const query =
    normalizeLower(search);

  if (!query) {
    return true;
  }

  return [
    wine.name,
    wine.producer,
    wine.country,
    wine.region,
    wine.subregion,
    wine.grapes,
    wine.vintage,
  ].some((value) =>
    normalizeLower(value).includes(query)
  );
}

function matchesPriceRange(
  wine,
  priceFilter,
  serviceType
) {
  if (!priceFilter) {
    return true;
  }

  const useGlassPrice =
    serviceType === "glass" &&
    isByTheGlass(wine);

  const price = useGlassPrice
    ? Number(wine.glass_price || 0)
    : Number(wine.price || 0);

  if (priceFilter === "0-50") {
    return price >= 0 && price <= 50;
  }

  if (priceFilter === "50-100") {
    return price > 50 && price <= 100;
  }

  if (priceFilter === "100-150") {
    return price > 100 && price <= 150;
  }

  if (priceFilter === "150+") {
    return price > 150;
  }

  return true;
}

function displayWineType(value) {
  const normalized =
    normalizeLower(value);

  if (normalized === "rose") {
    return "Rosé";
  }

  return normalize(value)
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

/* =======================================================
   CONSTANTS
======================================================= */

const CATEGORY_ORDER = [
  "sparkling",
  "champagne",
  "white",
  "rose",
  "red",
  "orange",
  "sweet",
  "dessert",
  "fortified",
];

const EMPTY_FILTERS = {
  wine_type: "",
  country: "",
  region: "",
  vintage: "",
  grapes: "",
  name: "",
  price: "",
  service_type: "",
};

/* =======================================================
   PAGE
======================================================= */

export default function ShangShiWineResultsView({
  menu,
  items = [],
  filters = {},
  onBack,
}) {
  const [localFilters, setLocalFilters] =
    useState({
      ...EMPTY_FILTERS,
      ...(filters || {}),
    });

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [filtersOpen, setFiltersOpen] =
    useState(false);

  const [selectedWine, setSelectedWine] =
    useState(null);

  useEffect(() => {
    setLocalFilters({
      ...EMPTY_FILTERS,
      ...(filters || {}),
    });
  }, [filters]);

  /* =====================================================
     NORMALIZED WINE ROWS
  ===================================================== */

  const wineRows = useMemo(() => {
    return (items || [])
      .map((item, index) => {
        const wine = getWine(item);

        if (!wine) {
          return null;
        }

        return {
          item,
          wine,
          originalIndex: index,
        };
      })
      .filter(Boolean);
  }, [items]);

  /* =====================================================
     FILTER OPTIONS
  ===================================================== */

  const countries = useMemo(() => {
    return [
      ...new Set(
        wineRows
          .map(({ wine }) =>
            normalize(wine.country)
          )
          .filter(Boolean)
      ),
    ].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [wineRows]);

  const regions = useMemo(() => {
    return [
      ...new Set(
        wineRows
          .filter(
            ({ wine }) =>
              !localFilters.country ||
              matchesExact(
                wine.country,
                localFilters.country
              )
          )
          .map(({ wine }) =>
            normalize(wine.region)
          )
          .filter(Boolean)
      ),
    ].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [
    wineRows,
    localFilters.country,
  ]);

  const vintages = useMemo(() => {
    return [
      ...new Set(
        wineRows
          .filter(
            ({ wine }) =>
              (
                !localFilters.country ||
                matchesExact(
                  wine.country,
                  localFilters.country
                )
              ) &&
              (
                !localFilters.region ||
                matchesExact(
                  wine.region,
                  localFilters.region
                )
              )
          )
          .map(({ wine }) =>
            normalize(wine.vintage)
          )
          .filter(Boolean)
      ),
    ].sort((a, b) => {
      if (a === "NV") {
        return 1;
      }

      if (b === "NV") {
        return -1;
      }

      return Number(b) - Number(a);
    });
  }, [
    wineRows,
    localFilters.country,
    localFilters.region,
  ]);

  const grapes = useMemo(() => {
    const grapeMap = new Map();

    wineRows.forEach(({ wine }) => {
      normalize(wine.grapes)
        .split(/[,;/+&|]+/)
        .map((grape) =>
          normalize(grape)
        )
        .filter(Boolean)
        .forEach((grape) => {
          const key =
            normalizeLower(grape);

          if (!grapeMap.has(key)) {
            grapeMap.set(key, grape);
          }
        });
    });

    return [
      ...grapeMap.values(),
    ].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [wineRows]);

  /* =====================================================
     CATEGORIES
  ===================================================== */

  const categories = useMemo(() => {
    const uniqueTypes = [
      ...new Set(
        wineRows
          .map(({ wine }) =>
            normalize(wine.wine_type)
          )
          .filter(Boolean)
      ),
    ];

    return uniqueTypes.sort((a, b) => {
      const aIndex =
        CATEGORY_ORDER.indexOf(
          normalizeLower(a)
        );

      const bIndex =
        CATEGORY_ORDER.indexOf(
          normalizeLower(b)
        );

      if (
        aIndex === -1 &&
        bIndex === -1
      ) {
        return a.localeCompare(b);
      }

      if (aIndex === -1) {
        return 1;
      }

      if (bIndex === -1) {
        return -1;
      }

      return aIndex - bIndex;
    });
  }, [wineRows]);

  const primaryCategories = useMemo(() => {
    return categories.filter(
      (category) =>
        ![
          "sake",
          "soft-drinks",
          "soft drinks",
        ].includes(normalizeLower(category))
    );
  }, [categories]);

  const secondaryCategories = useMemo(() => {
    return categories.filter((category) =>
      [
        "sake",
        "soft-drinks",
        "soft drinks",
      ].includes(normalizeLower(category))
    );
  }, [categories]);

  /* =====================================================
     FILTERED RESULTS
  ===================================================== */

  const filteredRows = useMemo(() => {
    return wineRows.filter(({ wine }) => {
      const matchesService =
        !localFilters.service_type ||
        (
          localFilters.service_type ===
            "glass" &&
          isByTheGlass(wine)
        );

      const matchesGrape =
        !localFilters.grapes ||
        normalizeLower(
          wine.grapes
        ).includes(
          normalizeLower(
            localFilters.grapes
          )
        );

      return (
        matchesExact(
          wine.wine_type,
          localFilters.wine_type
        ) &&
        matchesExact(
          wine.country,
          localFilters.country
        ) &&
        matchesExact(
          wine.region,
          localFilters.region
        ) &&
        matchesExact(
          wine.vintage,
          localFilters.vintage
        ) &&
        matchesGrape &&
        matchesService &&
        includesSearch(
          wine,
          localFilters.name
        ) &&
        matchesPriceRange(
          wine,
          localFilters.price,
          localFilters.service_type
        )
      );
    });
  }, [
    wineRows,
    localFilters,
  ]);

  const filteredItems = useMemo(() => {
  return [...filteredRows]
    .sort((a, b) => {
      const wineA = a.wine;
      const wineB = b.wine;

      const priceA =
        localFilters.service_type === "glass" &&
        isByTheGlass(wineA)
          ? Number(wineA.glass_price || 0)
          : Number(wineA.price || 0);

      const priceB =
        localFilters.service_type === "glass" &&
        isByTheGlass(wineB)
          ? Number(wineB.glass_price || 0)
          : Number(wineB.price || 0);

      return priceA - priceB;
    })
    .map(({ item }) => item);
}, [
  filteredRows,
  localFilters.service_type,
]);

  const activeWineType =
    localFilters.wine_type;

  const sectionTitle =
    localFilters.service_type === "glass"
      ? "By the Glass"
      : activeWineType
        ? `${displayWineType(
            activeWineType
          )} Wines`
        : "All Selections";

  const activeFilterCount = [
    localFilters.country,
    localFilters.region,
    localFilters.vintage,
    localFilters.grapes,
    localFilters.price,
  ].filter(Boolean).length;

  /* =====================================================
     FILTER ACTIONS
  ===================================================== */

  function selectCategory(category) {
    setSelectedWine(null);

    setLocalFilters((current) => ({
      ...current,
      wine_type: category,
      service_type: "",
    }));
  }

  function selectByTheGlass() {
    setSelectedWine(null);

    setLocalFilters((current) => ({
      ...current,
      wine_type: "",
      service_type: "glass",
    }));
  }

  function clearAllFilters() {
    setLocalFilters({
      ...EMPTY_FILTERS,
    });
  }

  /* =====================================================
     FULL-SCREEN WINE DETAILS
  ===================================================== */

  if (selectedWine) {
    const showBottlePrice =
      selectedWine.service_type !==
      "glass";

    const showGlassPrice =
      isByTheGlass(selectedWine) &&
      selectedWine.glass_price !== null;

    return (
      <div
        className="
          fixed
          inset-0
          z-[100]
          h-[100dvh]
          overflow-y-auto
          bg-[#001a12]
          text-[#F4F0E8]
        "
        style={{
          background: `
            radial-gradient(
              circle at 50% -10%,
              rgba(201, 169, 106, 0.08),
              transparent 38%
            ),
            linear-gradient(
              180deg,
              #003023 0%,
              #001710 100%
            )
          `,
          WebkitOverflowScrolling:
            "touch",
        }}
      >
        <div className="mx-auto min-h-full w-full max-w-[760px] px-6 pb-16 pt-6 sm:px-8">
          <div className="flex min-h-[48px] items-center justify-between gap-4">
            <button
              type="button"
              onClick={() =>
                setSelectedWine(null)
              }
              className="
                flex
                min-h-[44px]
                items-center
                gap-2
                text-[11px]
                uppercase
                tracking-[0.18em]
                text-[#E3C588]
              "
            >
              <span className="text-[20px]">
                ‹
              </span>

              {sectionTitle}
            </button>

            <button
              type="button"
              aria-label="Close wine details"
              onClick={() =>
                setSelectedWine(null)
              }
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-full
                border
                border-[#C9A96A]/18
                text-[24px]
                font-light
                text-[#E3C588]
              "
            >
              ×
            </button>
          </div>

          <article className="pt-12 sm:pt-16">
            {selectedWine.producer && (
              <div
                className="
                  mb-5
                  text-[11px]
                  uppercase
                  tracking-[0.24em]
                  text-[#D8B873]
                "
              >
                {selectedWine.producer}
              </div>
            )}

            <h1
              className="
                max-w-[620px]
                font-serif
                text-[38px]
                font-light
                leading-[1.08]
                tracking-[-0.025em]
                text-[#F4F0E8]
                sm:text-[48px]
              "
            >
              {selectedWine.name}
            </h1>

            <div
              className="
                mt-8
                space-y-2
                text-[16px]
                leading-[1.55]
                text-[#E7DDC9]/75
              "
            >
              {selectedWine.subregion && (
                <div>
                  {selectedWine.subregion}
                </div>
              )}

              <div>
                {[
                  selectedWine.region,
                  selectedWine.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </div>

              <div>
                {[
                  selectedWine.vintage,
                  selectedWine.grapes,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>

            <div
              className="
                my-10
                flex
                items-center
                gap-4
              "
            >
              <span className="h-px flex-1 bg-[#C9A96A]/18" />
              <span className="text-[10px] text-[#D8B873]">
                ◇
              </span>
              <span className="h-px flex-1 bg-[#C9A96A]/18" />
            </div>

            {selectedWine.description && (
              <section className="mb-10">
                <h2
                  className="
                    mb-4
                    text-[11px]
                    uppercase
                    tracking-[0.22em]
                    text-[#D8B873]
                  "
                >
                  About this wine
                </h2>

                <p
                  className="
                    text-[16px]
                    font-light
                    leading-[1.85]
                    text-[#E7DDC9]/72
                  "
                >
                  {selectedWine.description}
                </p>
              </section>
            )}

            {selectedWine.pairing && (
              <section className="mb-10 border-t border-[#C9A96A]/[0.07] pt-8">
                <h2
                  className="
                    mb-4
                    text-[11px]
                    uppercase
                    tracking-[0.22em]
                    text-[#D8B873]
                  "
                >
                  Pairing suggestion
                </h2>

                <p
                  className="
                    text-[16px]
                    font-light
                    leading-[1.75]
                    text-[#E7DDC9]/72
                  "
                >
                  {selectedWine.pairing}
                </p>
              </section>
            )}

            <section className="border-t border-[#C9A96A]/12 pt-8">
              {showBottlePrice && (
                <div className="flex min-h-[58px] items-center justify-between gap-6 border-b border-[#C9A96A]/10 py-4">
                  <div>
                    <div className="text-[15px] text-[#E7DDC9]/78">
                      Bottle
                    </div>

                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#C9A96A]/42">
                      {selectedWine.bottle_size
                        ? `${selectedWine.bottle_size}`
                        : "75 cl"}
                    </div>
                  </div>

                  <div className="font-serif text-[30px] font-light text-[#E3C588]">
                    €
                    {formatPrice(
                      selectedWine.price
                    )}
                  </div>
                </div>
              )}

              {showGlassPrice && (
                <div className="flex min-h-[58px] items-center justify-between gap-6 py-4">
                  <div>
                    <div className="text-[15px] text-[#E7DDC9]/78">
                      By the glass
                    </div>

                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#C9A96A]/42">
                      Glass serving
                    </div>
                  </div>

                  <div className="font-serif text-[30px] font-light text-[#E3C588]">
                    €
                    {formatPrice(
                      selectedWine.glass_price
                    )}
                  </div>
                </div>
              )}
            </section>
          </article>
        </div>
      </div>
    );
  }

  /* =====================================================
     RESULTS VIEW
  ===================================================== */

  return (
    <div
      className="
        h-[100dvh]
        overflow-y-auto
        bg-[#001a12]
        text-[#F4F0E8]
      "
      style={{
        background: `
          radial-gradient(
            circle at 50% -10%,
            rgba(201, 169, 106, 0.075),
            transparent 35%
          ),
          linear-gradient(
            180deg,
            #003023 0%,
            #001710 100%
          )
        `,
        WebkitOverflowScrolling:
          "touch",
        overscrollBehavior:
          "contain",
        touchAction: "pan-y",
        scrollbarWidth: "none",
      }}
    >
      <div className="mx-auto min-h-full w-full max-w-[1180px] px-5 pb-20 pt-4 sm:px-7 lg:px-9">
        {/* COMPACT HEADER */}

        <header className="mb-3">
          <div className="flex min-h-[52px] items-center justify-between gap-5">
            <button
              type="button"
              onClick={onBack}
              className="
                flex
                min-h-[44px]
                items-center
                gap-2
                text-[11px]
                uppercase
                tracking-[0.18em]
                text-[#E3C588]
              "
            >
              <span className="text-[20px]">
                ‹
              </span>
              Back
            </button>

            <div className="flex min-w-0 items-center gap-3">
  <img
    src="/shangshi-logo.png"
    alt="Shang Shi"
    className="
      h-11
      w-auto
      shrink-0
      object-contain
      opacity-100
      sm:h-12
    "
  />

  <div className="min-w-0">
    <div
      className="
        truncate
        text-[9px]
        uppercase
        tracking-[0.2em]
        text-[#D8B873]
      "
    >
      Shang Shi
    </div>

    <div
      className="
        mt-0.5
        truncate
        font-serif
        text-[19px]
        font-light
        tracking-[0.01em]
        text-[#F4F0E8]
        sm:text-[21px]
      "
    >
      Wine Collection
    </div>
  </div>
</div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Search wines"
                onClick={() =>
                  setSearchOpen(
                    (current) => !current
                  )
                }
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  text-[#E3C588]
                  transition
                  hover:bg-[#C9A96A]/[0.06]
                "
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="6.5"
                  />
                  <path d="m16 16 4 4" />
                </svg>
              </button>

              <button
                type="button"
                aria-label="Refine wine selection"
                onClick={() =>
                  setFiltersOpen(true)
                }
                className="
                  relative
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  text-[#E3C588]
                  transition
                  hover:bg-[#C9A96A]/[0.06]
                "
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M4 6h16" />
                  <path d="M7 12h10" />
                  <path d="M10 18h4" />
                </svg>

                {activeFilterCount > 0 && (
                  <span
                    className="
                      absolute
                      right-0
                      top-0
                      flex
                      h-4
                      min-w-4
                      items-center
                      justify-center
                      rounded-full
                      bg-[#D8B873]
                      px-1
                      text-[8px]
                      text-[#001a12]
                    "
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="mt-4">
              <div className="relative">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="
                    absolute
                    left-4
                    top-1/2
                    h-5
                    w-5
                    -translate-y-1/2
                    text-[#D7C7A8]/68
                  "
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="6.5"
                  />
                  <path d="m16 16 4 4" />
                </svg>

                <input
                  autoFocus
                  value={localFilters.name}
                  onChange={(event) =>
                    setLocalFilters(
                      (current) => ({
                        ...current,
                        name:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Search producer, wine, region or grape"
                  className="
                    h-13
                    w-full
                    rounded-xl
                    border
                    border-[#C9A96A]/16
                    bg-[#00150f]/55
                    py-4
                    pl-12
                    pr-12
                    text-[15px]
                    text-[#F4F0E8]
                    outline-none
                    placeholder:text-[#C9A96A]/32
                    focus:border-[#C9A96A]/35
                  "
                />

                {localFilters.name && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() =>
                      setLocalFilters(
                        (current) => ({
                          ...current,
                          name: "",
                        })
                      )
                    }
                    className="
                      absolute
                      right-2
                      top-1/2
                      flex
                      h-10
                      w-10
                      -translate-y-1/2
                      items-center
                      justify-center
                      text-[20px]
                      text-[#C9A96A]/60
                    "
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          )}
        </header>

        {/* CATEGORY TABS */}

        <nav
          className="
            sticky
            top-0
            z-40
            -mx-5
            border-b
            border-[#C9A96A]/[0.08]
            bg-[#002018]/88
            px-5
            backdrop-blur-2xl
            sm:-mx-7
            sm:px-7
            lg:-mx-9
            lg:px-9
          "
        >
          <div
            className="
              flex
              min-h-[54px]
              items-center
              gap-7
              overflow-x-auto
              whitespace-nowrap
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
          >
            <button
              type="button"
              onClick={() =>
                selectCategory("")
              }
              className={`
                relative
                flex
                min-h-[54px]
                shrink-0
                items-center
                text-[11px]
                uppercase
                tracking-[0.14em]
                ${
                  !activeWineType &&
                  !localFilters.service_type
                    ? "text-[#E3C588]"
                    : "text-[#D8CBAE]/72"
                }
              `}
            >
              All wines

              {!activeWineType &&
                !localFilters.service_type && (
                  <span className="absolute inset-x-0 bottom-0 h-px bg-[#E3C588]" />
                )}
            </button>

            <button
              type="button"
              onClick={selectByTheGlass}
              className={`
                relative
                flex
                min-h-[54px]
                shrink-0
                items-center
                text-[11px]
                uppercase
                tracking-[0.14em]
                ${
                  localFilters.service_type ===
                  "glass"
                    ? "text-[#E3C588]"
                    : "text-[#D8CBAE]/72"
                }
              `}
            >
              By the glass

              {localFilters.service_type ===
                "glass" && (
                <span className="absolute inset-x-0 bottom-0 h-px bg-[#E3C588]" />
              )}
            </button>

            {primaryCategories.map((category) => {
              const active =
                matchesExact(
                  activeWineType,
                  category
                ) &&
                !localFilters.service_type;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    selectCategory(category)
                  }
                  className={`
                    relative
                    flex
                    min-h-[54px]
                    shrink-0
                    items-center
                    text-[11px]
                    uppercase
                    tracking-[0.14em]
                    ${
                      active
                        ? "text-[#E3C588]"
                        : "text-[#D8CBAE]/72"
                    }
                  `}
                >
                  {displayWineType(
                    category
                  )}

                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-px bg-[#E3C588]" />
                  )}
                </button>
              );
            })}

            {secondaryCategories.length > 0 && (
              <>
                <span className="h-5 w-px shrink-0 bg-[#C9A96A]/14" />

                {secondaryCategories.map((category) => {
                  const active =
                    matchesExact(
                      activeWineType,
                      category
                    ) &&
                    !localFilters.service_type;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() =>
                        selectCategory(category)
                      }
                      className={`
                        relative
                        flex
                        min-h-[54px]
                        shrink-0
                        items-center
                        text-[11px]
                        uppercase
                        tracking-[0.14em]
                        ${
                          active
                            ? "text-[#E3C588]"
                            : "text-[#D8CBAE]/58"
                        }
                      `}
                    >
                      {displayWineType(category)}

                      {active && (
                        <span className="absolute inset-x-0 bottom-0 h-px bg-[#E3C588]" />
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </nav>

        {/* SECTION HEADING */}

        <section className="pb-3 pt-6">
          <h1
            className="
              font-serif
              text-[28px]
              font-light
              tracking-[-0.015em]
              text-[#F4F0E8]
            "
          >
            {sectionTitle}
          </h1>

          <div
            className="
              mt-2
              flex
              flex-wrap
              items-center
              gap-x-3
              gap-y-1
              text-[10px]
              uppercase
              tracking-[0.15em]
              text-[#D8B873]
            "
          >
            <span>
              {filteredItems.length}{" "}
              {filteredItems.length === 1
                ? "selection"
                : "selections"}
            </span>

            <span className="text-[#C9A96A]/28">·</span>

            <span className="text-[#C9A96A]/58">
              Price low to high
            </span>
          </div>
        </section>

        {/* WINES */}

        <div className="border-t border-[#C9A96A]/[0.07]">
          {filteredItems.map((item) => {
            const wine =
              getWine(item);

            if (!wine) {
              return null;
            }

            const byTheGlass =
              isByTheGlass(wine);

            const showBottlePrice =
              wine.service_type !==
              "glass";

            const rowKey =
              item.id ||
              `${wine.id}-${wine.service_type}`;

            return (
              <article
                key={rowKey}
                className="
                  border-b
                  border-[#C9A96A]/12
                "
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedWine(wine)
                  }
                  className="
                    grid
                    min-h-[102px]
                    w-full
                    grid-cols-[minmax(0,1fr)_auto]
                    items-center
                    gap-5
                    px-1
                    py-4
                    text-left
                    transition-colors
                    hover:bg-[#C9A96A]/[0.025]
                    active:bg-[#C9A96A]/[0.05]
                  "
                >
                  <div className="min-w-0">
                    {wine.producer && (
                      <div
                        className="
                          mb-2
                          truncate
                          text-[10px]
                          font-medium
                          uppercase
                          leading-[1.3]
                          tracking-[0.16em]
                          text-[#D8B873]/72
                        "
                      >
                        {wine.producer}
                      </div>
                    )}

                    <div
                      className="
                        font-serif
                        text-[17px]
                        font-light
                        leading-[1.35]
                        tracking-[-0.01em]
                        text-[#F4F0E8]
                        sm:text-[18px]
                      "
                    >
                      {wine.name}
                    </div>

                    <div
                      className="
                        mt-2
                        flex
                        flex-wrap
                        items-center
                        gap-x-2
                        gap-y-1
                        text-[11px]
                        leading-[1.45]
                        text-[#C9A96A]/55
                      "
                    >
                      {[
                        wine.region,
                        wine.country,
                        wine.vintage,
                        wine.grapes,
                      ]
                        .filter(Boolean)
                        .map(
                          (
                            value,
                            index
                          ) => (
                            <span
                              key={`${value}-${index}`}
                              className="flex items-center gap-2"
                            >
                              {index > 0 && (
                                <span className="opacity-35">
                                  ·
                                </span>
                              )}
                              {value}
                            </span>
                          )
                        )}
                    </div>
                  </div>

                  <div className="flex min-w-[92px] items-center justify-end gap-3">
                    <div className="text-right">
                      {showBottlePrice && (
                        <div>
                          <div
                            className="
                              font-serif
                              text-[21px]
                              font-light
                              text-[#E3C588]
                            "
                          >
                            €
                            {formatPrice(
                              wine.price
                            )}
                          </div>

                          {wine.service_type ===
                            "both" && (
                            <div
                              className="
                                mt-1
                                text-[8px]
                                uppercase
                                tracking-[0.16em]
                                text-[#C9A96A]/38
                              "
                            >
                              Bottle
                            </div>
                          )}
                        </div>
                      )}

                      {byTheGlass &&
                        wine.glass_price !==
                          null && (
                          <div
                            className={
                              wine.service_type ===
                              "both"
                                ? "mt-3"
                                : ""
                            }
                          >
                            <div
                              className="
                                font-serif
                                text-[21px]
                                font-light
                                text-[#E3C588]
                              "
                            >
                              €
                              {formatPrice(
                                wine.glass_price
                              )}
                            </div>

                            <div
                              className="
                                mt-1
                                text-[8px]
                                uppercase
                                tracking-[0.16em]
                                text-[#C9A96A]/38
                              "
                            >
                              Glass
                            </div>
                          </div>
                        )}
                    </div>

                    <span
                      className="
                        ml-1
                        text-[23px]
                        font-light
                        text-[#D8B873]/32
                      "
                    >
                      ›
                    </span>
                  </div>
                </button>
              </article>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="py-24 text-center">
            <div
              className="
                font-serif
                text-[24px]
                font-light
                text-[#F4F0E8]
              "
            >
              No wines found
            </div>

            <p
              className="
                mx-auto
                mt-3
                max-w-[320px]
                text-[13px]
                leading-[1.7]
                text-[#C9A96A]/52
              "
            >
              Adjust the current search or
              refine the selected filters.
            </p>

            <button
              type="button"
              onClick={clearAllFilters}
              className="
                mt-7
                min-h-[46px]
                rounded-full
                border
                border-[#C9A96A]/25
                px-6
                text-[10px]
                uppercase
                tracking-[0.18em]
                text-[#E3C588]
              "
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* FULL-SCREEN FILTER SHEET */}

      {filtersOpen && (
        <div className="fixed inset-0 z-[90] bg-[#001710]">
          <div
            className="
              h-[100dvh]
              overflow-y-auto
              px-6
              pb-8
              pt-5
            "
            style={{
              background: `
                radial-gradient(
                  circle at 50% -10%,
                  rgba(201, 169, 106, 0.075),
                  transparent 35%
                ),
                linear-gradient(
                  180deg,
                  #003023 0%,
                  #001710 100%
                )
              `,
              WebkitOverflowScrolling:
                "touch",
            }}
          >
            <div className="mx-auto max-w-[680px]">
              <div className="flex min-h-[52px] items-center justify-between">
                <div>
                  <div
                    className="
                      text-[10px]
                      uppercase
                      tracking-[0.22em]
                      text-[#D8B873]
                    "
                  >
                    Refine
                  </div>

                  <div
                    className="
                      mt-1
                      font-serif
                      text-[26px]
                      font-light
                      text-[#F4F0E8]
                    "
                  >
                    Wine Selection
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() =>
                    setFiltersOpen(false)
                  }
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-[#C9A96A]/18
                    text-[24px]
                    text-[#E3C588]
                  "
                >
                  ×
                </button>
              </div>

              <div className="mt-8 space-y-4">
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
                    key: "grapes",
                    label: "Grape",
                    values: grapes,
                  },
                  {
                    key: "vintage",
                    label: "Vintage",
                    values: vintages,
                  },
                ].map((field) => (
                  <label
                    key={field.key}
                    className="block"
                  >
                    <span
                      className="
                        mb-2
                        block
                        text-[10px]
                        uppercase
                        tracking-[0.18em]
                        text-[#C9A96A]/55
                      "
                    >
                      {field.label}
                    </span>

                    <select
                      value={
                        localFilters[
                          field.key
                        ]
                      }
                      onChange={(event) => {
                        const value =
                          event.target.value;

                        setLocalFilters(
                          (current) => {
                            const next = {
                              ...current,
                              [field.key]:
                                value,
                            };

                            if (
                              field.key ===
                              "country"
                            ) {
                              next.region = "";
                              next.vintage = "";
                              next.grapes = "";
                            }

                            if (
                              field.key ===
                              "region"
                            ) {
                              next.vintage = "";
                              next.grapes = "";
                            }

                            return next;
                          }
                        );
                      }}
                      className="
                        h-[54px]
                        w-full
                        appearance-none
                        rounded-xl
                        border
                        border-[#C9A96A]/16
                        bg-[#00150f]/55
                        px-4
                        text-[15px]
                        text-[#F4F0E8]
                        outline-none
                      "
                    >
                      <option
                        value=""
                        className="text-black"
                      >
                        All
                      </option>

                      {field.values.map(
                        (value) => (
                          <option
                            key={value}
                            value={value}
                            className="text-black"
                          >
                            {value}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                ))}

                <label className="block">
                  <span
                    className="
                      mb-2
                      block
                      text-[10px]
                      uppercase
                      tracking-[0.18em]
                      text-[#C9A96A]/55
                    "
                  >
                    Price
                  </span>

                  <select
                    value={
                      localFilters.price
                    }
                    onChange={(event) =>
                      setLocalFilters(
                        (current) => ({
                          ...current,
                          price:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="
                      h-[54px]
                      w-full
                      appearance-none
                      rounded-xl
                      border
                      border-[#C9A96A]/16
                      bg-[#00150f]/55
                      px-4
                      text-[15px]
                      text-[#F4F0E8]
                      outline-none
                    "
                  >
                    <option
                      value=""
                      className="text-black"
                    >
                      All prices
                    </option>

                    <option
                      value="0-50"
                      className="text-black"
                    >
                      Under €50
                    </option>

                    <option
                      value="50-100"
                      className="text-black"
                    >
                      €50–100
                    </option>

                    <option
                      value="100-150"
                      className="text-black"
                    >
                      €100–150
                    </option>

                    <option
                      value="150+"
                      className="text-black"
                    >
                      €150+
                    </option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setLocalFilters(
                      (current) => ({
                        ...current,
                        service_type:
                          current.service_type ===
                          "glass"
                            ? ""
                            : "glass",
                        wine_type:
                          current.service_type ===
                          "glass"
                            ? current.wine_type
                            : "",
                      })
                    )
                  }
                  className={`
                    flex
                    min-h-[56px]
                    w-full
                    items-center
                    justify-between
                    rounded-xl
                    border
                    px-4
                    text-left
                    ${
                      localFilters.service_type ===
                      "glass"
                        ? "border-[#D8B873]/45 bg-[#D8B873]/10"
                        : "border-[#C9A96A]/16 bg-[#00150f]/55"
                    }
                  `}
                >
                  <span>
                    <span
                      className="
                        block
                        text-[15px]
                        text-[#F4F0E8]
                      "
                    >
                      By the Glass
                    </span>

                    <span
                      className="
                        mt-1
                        block
                        text-[10px]
                        text-[#C9A96A]/48
                      "
                    >
                      Show wines available
                      by the glass
                    </span>
                  </span>

                  <span
                    className={`
                      flex
                      h-6
                      w-11
                      items-center
                      rounded-full
                      p-1
                      transition
                      ${
                        localFilters.service_type ===
                        "glass"
                          ? "justify-end bg-[#D8B873]"
                          : "justify-start bg-[#C9A96A]/18"
                      }
                    `}
                  >
                    <span className="h-4 w-4 rounded-full bg-[#F4F0E8]" />
                  </span>
                </button>
              </div>

              <div
                className="
                  sticky
                  bottom-0
                  mt-10
                  flex
                  items-center
                  gap-3
                  border-t
                  border-[#C9A96A]/12
                  bg-[#001710]/96
                  py-5
                  backdrop-blur-xl
                "
              >
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="
                    min-h-[50px]
                    px-4
                    text-[10px]
                    uppercase
                    tracking-[0.16em]
                    text-[#C9A96A]/65
                  "
                >
                  Clear all
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFiltersOpen(false)
                  }
                  className="
                    min-h-[50px]
                    flex-1
                    rounded-xl
                    bg-[#D8B873]
                    px-5
                    text-[11px]
                    uppercase
                    tracking-[0.16em]
                    text-[#001710]
                  "
                >
                  Show{" "}
                  {filteredItems.length}{" "}
                  {filteredItems.length === 1
                    ? "Wine"
                    : "Wines"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}