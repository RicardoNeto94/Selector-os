"use client";

import {
  useEffect,
  useMemo,
  useRef,
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

function hasPositivePrice(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function normalizeServings(servings) {
  return (Array.isArray(servings) ? servings : [])
    .map((serving) => ({
      ...serving,
      serving_cl: Number(serving.serving_cl),
      price: serving.price === null || serving.price === undefined
        ? null
        : Number(serving.price),
    }))
    .filter((serving) => hasPositivePrice(serving.price))
    .sort((a, b) => Number(a.serving_cl || 0) - Number(b.serving_cl || 0));
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
        : rawWine.price !== null && rawWine.price !== undefined
          ? Number(rawWine.price)
          : null,

    service_type:
      item.service_type ||
      "bottle",

    glass_price:
      item.glass_price !== null &&
      item.glass_price !== undefined
        ? Number(item.glass_price)
        : null,

    servings: normalizeServings(item.servings),
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

function glassOffers(wine) {
  if (!isByTheGlass(wine)) {
    return [];
  }

  if (wine.servings?.length > 0) {
    return wine.servings;
  }

  return hasPositivePrice(wine.glass_price)
    ? [{ id: `${wine.id}-glass`, serving_cl: null, price: Number(wine.glass_price) }]
    : [];
}

function hasBottleOffer(wine) {
  return wine?.service_type !== "glass" && hasPositivePrice(wine?.price);
}

function hasGuestOffer(wine) {
  return hasBottleOffer(wine) || glassOffers(wine).length > 0;
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

  const candidatePrices = serviceType === "glass"
    ? glassOffers(wine).map((serving) => Number(serving.price))
    : hasBottleOffer(wine)
      ? [Number(wine.price)]
      : glassOffers(wine).map((serving) => Number(serving.price));

  const price = candidatePrices.length > 0
    ? Math.min(...candidatePrices)
    : 0;

  if (priceFilter === "0-50") {
    return price > 0 && price <= 50;
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
  isOnline = true,
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

  const [moreOpen, setMoreOpen] =
    useState(false);

  const [selectedWine, setSelectedWine] =
    useState(null);

  const scrollRef = useRef(null);
  const detailScrollRef = useRef(null);

  useEffect(() => {
    setLocalFilters({
      ...EMPTY_FILTERS,
      ...(filters || {}),
    });
  }, [filters]);

  useEffect(() => {
    if (!selectedWine) {
      return;
    }

    requestAnimationFrame(() => {
      detailScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    });
  }, [selectedWine]);

  /* =====================================================
     NORMALIZED WINE ROWS
  ===================================================== */

  const wineRows = useMemo(() => {
    return (items || [])
      .map((item, index) => {
        const wine = getWine(item);

        if (!wine || !hasGuestOffer(wine)) {
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

  const visibleCategories = useMemo(() => {
    const preferred = [
      "sparkling",
      "white",
      "red",
    ];

    return preferred
      .map((type) =>
        categories.find(
          (category) =>
            normalizeLower(category) === type
        )
      )
      .filter(Boolean);
  }, [categories]);

  const moreCategories = useMemo(() => {
    const visible = new Set(
      visibleCategories.map((category) =>
        normalizeLower(category)
      )
    );

    return categories.filter(
      (category) =>
        !visible.has(
          normalizeLower(category)
        )
    );
  }, [
    categories,
    visibleCategories,
  ]);

  const categoryCounts = useMemo(() => {
    const counts = new Map();

    wineRows.forEach(({ wine }) => {
      const key = normalizeLower(wine.wine_type);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });

    return counts;
  }, [wineRows]);

  const byTheGlassCount = useMemo(
    () => wineRows.filter(({ wine }) => glassOffers(wine).length > 0).length,
    [wineRows]
  );

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
          glassOffers(wine).length > 0
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
        glassOffers(wineA).length > 0
          ? Number(glassOffers(wineA)[0].price)
          : hasBottleOffer(wineA)
            ? Number(wineA.price)
            : Number(glassOffers(wineA)[0]?.price || Number.MAX_SAFE_INTEGER);

      const priceB =
        localFilters.service_type === "glass" &&
        glassOffers(wineB).length > 0
          ? Number(glassOffers(wineB)[0].price)
          : hasBottleOffer(wineB)
            ? Number(wineB.price)
            : Number(glassOffers(wineB)[0]?.price || Number.MAX_SAFE_INTEGER);

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
        : "Wine Collection";

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
    setMoreOpen(false);

    setLocalFilters((current) => ({
      ...current,
      wine_type: category,
      service_type: "",
    }));

    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function selectByTheGlass() {
    setSelectedWine(null);
    setMoreOpen(false);

    setLocalFilters((current) => ({
      ...current,
      wine_type: "",
      service_type: "glass",
    }));

    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
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
    const showBottlePrice = hasBottleOffer(selectedWine);

    const selectedGlassOffers = glassOffers(selectedWine);

    return (
      <div
        ref={detailScrollRef}
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
                text-[12px]
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
                text-[20px]
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

            <section className="border-t border-[#C9A96A]/[0.055] pt-8">
              {showBottlePrice && (
                <div className="flex min-h-[58px] items-center justify-between gap-6 border-b border-[#C9A96A]/10 py-7">
                  <div>
                    <div className="text-[15px] text-[#E7DDC9]/78">
                      Bottle
                    </div>

                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#C9A96A]/42">
                      {selectedWine.bottle_size
                        ? `${selectedWine.bottle_size}`
                        : "Bottle service"}
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

              {selectedGlassOffers.map((serving) => (
                <div key={serving.id || `${serving.serving_cl}-${serving.price}`} className="flex min-h-[58px] items-center justify-between gap-6 border-b border-[#C9A96A]/10 py-5 last:border-b-0">
                  <div>
                    <div className="text-[15px] text-[#E7DDC9]/78">By the glass</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#C9A96A]/42">
                      {serving.serving_cl ? `${formatPrice(serving.serving_cl)} cl serving` : "Glass serving"}
                    </div>
                  </div>
                  <div className="font-serif text-[30px] font-light text-[#E3C588]">€{formatPrice(serving.price)}</div>
                </div>
              ))}
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
      ref={scrollRef}
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
        paddingTop: "env(safe-area-inset-top)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
      }}
    >
      <div className="mx-auto min-h-full w-full max-w-[1080px] px-6 pb-24 pt-5 sm:px-10 lg:px-14">
        {/* AMAN-STYLE HEADER */}

        <header className="mb-6">
          <div className="grid min-h-[132px] grid-cols-[1fr_auto_1fr] items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="
                mt-3
                flex
                min-h-[44px]
                items-center
                gap-2
                justify-self-start
                text-[11px]
                uppercase
                tracking-[0.18em]
                text-[#E3C588]
              "
            >
              <span className="text-[20px]">‹</span>
              Back
            </button>

            <div className="flex min-w-0 flex-col items-center text-center">
              <img
                src="/shangshi-logo.png"
                alt="Shang Shi"
                className="
                  h-12
                  w-auto
                  shrink-0
                  object-contain
                  sm:h-14
                "
              />

              <div
                className="
                  mt-2
                  text-[9px]
                  uppercase
                  tracking-[0.24em]
                  text-[#D8B873]
                "
              >
                Shang Shi
              </div>

              <div
                className="
                  mt-1
                  font-serif
                  text-[24px]
                  font-light
                  tracking-[-0.01em]
                  text-[#F4F0E8]
                  sm:text-[28px]
                "
              >
                Wine Collection
              </div>

              <div
                className={`mt-2 text-[8px] uppercase tracking-[0.18em] ${
                  isOnline ? "text-[#D8B873]/45" : "text-[#F0B88D]"
                }`}
                aria-live="polite"
              >
                {isOnline ? "Live cellar" : "Connection interrupted"}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-self-end gap-1">
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
                  <circle cx="11" cy="11" r="6.5" />
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
            <div className="mx-auto mt-5 max-w-[760px]">
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
                    text-[#D7C7A8]/56
                  "
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4 4" />
                </svg>

                <input
                  autoFocus
                  value={localFilters.name}
                  onChange={(event) =>
                    setLocalFilters(
                      (current) => ({
                        ...current,
                        name: event.target.value,
                      })
                    )
                  }
                  placeholder="Search producer, wine, region or grape"
                  className="
                    h-[54px]
                    w-full
                    rounded-xl
                    border
                    border-[#C9A96A]/14
                    bg-[#00150f]/45
                    py-4
                    pl-12
                    pr-12
                    text-[15px]
                    text-[#F4F0E8]
                    outline-none
                    placeholder:text-[#C9A96A]/28
                    focus:border-[#C9A96A]/32
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
                      text-[#C9A96A]/55
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
            -mx-6
            border-b
            border-[#C9A96A]/[0.08]
            bg-[#00251b]/90
            px-5
            backdrop-blur-xl
            
            sm:-mx-10
            sm:px-7
            lg:-mx-14
            lg:px-9
          "
        >
          <div
            className="
              flex
              min-h-[62px]
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
                min-h-[62px]
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
              <span className="ml-2 text-[9px] tracking-normal opacity-45">
                {wineRows.length}
              </span>

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
                min-h-[62px]
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
              <span className="ml-2 text-[9px] tracking-normal opacity-45">
                {byTheGlassCount}
              </span>

              {localFilters.service_type ===
                "glass" && (
                <span className="absolute inset-x-0 bottom-0 h-px bg-[#E3C588]" />
              )}
            </button>

            {visibleCategories.map((category) => {
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
                    min-h-[62px]
                    shrink-0
                    items-center
                    text-[11px]
                    uppercase
                    tracking-[0.14em]
                    ${
                      active
                        ? "text-[#E3C588]"
                        : "text-[#D8CBAE]/64"
                    }
                  `}
                >
                  {displayWineType(category)}
                  <span className="ml-2 text-[9px] tracking-normal opacity-45">
                    {categoryCounts.get(normalizeLower(category)) || 0}
                  </span>

                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-px bg-[#E3C588]" />
                  )}
                </button>
              );
            })}

            {moreCategories.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setMoreOpen(
                    (current) => !current
                  )
                }
                className={`
                  relative
                  flex
                  min-h-[62px]
                  shrink-0
                  items-center
                  gap-2
                  text-[11px]
                  uppercase
                  tracking-[0.14em]
                  ${
                    moreCategories.some(
                      (category) =>
                        matchesExact(
                          activeWineType,
                          category
                        )
                    )
                      ? "text-[#E3C588]"
                      : "text-[#D8CBAE]/64"
                  }
                `}
              >
                More styles
                <span className="text-[13px] opacity-60">
                  {moreOpen ? "⌃" : "⌄"}
                </span>

                {moreCategories.some(
                  (category) =>
                    matchesExact(
                      activeWineType,
                      category
                    )
                ) && (
                  <span className="absolute inset-x-0 bottom-0 h-px bg-[#E3C588]" />
                )}
              </button>
            )}
          </div>

          {moreOpen && (
            <div className="border-t border-[#C9A96A]/[0.06] py-3">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {moreCategories.map(
                  (category) => {
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
                          selectCategory(
                            category
                          )
                        }
                        className={`
                          min-h-[36px]
                          text-[10px]
                          uppercase
                          tracking-[0.13em]
                          ${
                            active
                              ? "text-[#E3C588]"
                              : "text-[#D8CBAE]/52"
                          }
                        `}
                      >
                        {displayWineType(
                          category
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </nav>

        {/* COLLECTION INTRO */}

        <section className="pb-8 pt-14">
          <div
            className="
              text-[10px]
              uppercase
              tracking-[0.18em]
              text-[#D8B873]
            "
          >
            {filteredItems.length}{" "}
            {filteredItems.length === 1
              ? "selection"
              : "selections"}
          </div>

          <h1
            className="
              mt-4
              max-w-[680px]
              font-serif
              text-[30px]
              font-light
              leading-[1.22]
              tracking-[-0.02em]
              text-[#F4F0E8]
              sm:text-[34px]
            "
          >
            {localFilters.service_type === "glass"
              ? "Wines served by the glass."
              : activeWineType
                ? `${displayWineType(activeWineType)} wines.`
                : "Curated wines from around the world."}
          </h1>

          <div className="mt-7 flex items-center gap-2">
            <span className="h-px w-14 bg-[#C9A96A]/45" />
            <span className="h-2 w-2 rotate-45 border border-[#D8B873]/70" />
            <span className="h-px w-14 bg-[#C9A96A]/45" />
          </div>
        </section>

        {/* WINES */}

        <div className="border-t border-[#C9A96A]/[0.045]">
          {filteredItems.map((item) => {
            const wine =
              getWine(item);

            if (!wine) {
              return null;
            }

            const wineGlassOffers = glassOffers(wine);
            const byTheGlass = wineGlassOffers.length > 0;

            const showBottlePrice = hasBottleOffer(wine);

            const rowKey =
              item.id ||
              `${wine.id}-${wine.service_type}`;

            return (
              <article
                key={rowKey}
                className="
                  border-b
                  border-[#C9A96A]/[0.09]
                "
                style={{ contentVisibility: "auto", containIntrinsicSize: "92px" }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedWine(wine)
                  }
                  className="
                    grid
                    min-h-[92px]
                    w-full
                    grid-cols-[minmax(0,1fr)_auto]
                    items-center
                    gap-8
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
                          mb-3
                          truncate
                          text-[10px]
                          font-medium
                          uppercase
                          leading-[1.3]
                          tracking-[0.12em]
                          text-[#D7C7A8]/48
                        "
                      >
                        {wine.producer}
                      </div>
                    )}

                    <div
                      className="
                        font-serif
                        text-[16px]
                        font-light
                        leading-[1.35]
                        tracking-[-0.01em]
                        text-[#F4F0E8]
                        sm:text-[22px]
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
                        text-[#D7C7A8]/48
                      "
                    >
                      {[
                        [wine.region, wine.country]
                          .filter(Boolean)
                          .join(", "),
                        wine.vintage,
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

                  <div className="flex min-w-[96px] items-center justify-end gap-3">
                    <div className="text-right">
                      {showBottlePrice && (
                        <div>
                          <div
                            className="
                              font-serif
                              text-[28px]
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

                      {byTheGlass && wineGlassOffers.map((serving, index) => (
                        <div key={serving.id || `${serving.serving_cl}-${serving.price}`} className={showBottlePrice || index > 0 ? "mt-3" : ""}>
                          <div className="font-serif text-[21px] font-light text-[#E3C588]">€{formatPrice(serving.price)}</div>
                          <div className="mt-1 text-[8px] uppercase tracking-[0.16em] text-[#C9A96A]/38">
                            {serving.serving_cl ? `${formatPrice(serving.serving_cl)} cl` : "Glass"}
                          </div>
                        </div>
                      ))}
                    </div>


                  </div>
                </button>
              </article>
            );
          })}
        </div>

        {filteredItems.length > 0 && (
          <div className="flex items-center justify-center gap-5 py-14">
            <span className="h-px w-24 bg-[#C9A96A]/25" />
            <span className="font-serif text-[22px] text-[#D8B873]/75">
              SS
            </span>
            <span className="h-px w-24 bg-[#C9A96A]/25" />
          </div>
        )}

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
