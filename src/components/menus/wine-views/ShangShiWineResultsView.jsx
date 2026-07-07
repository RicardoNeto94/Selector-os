"use client";

import {
  useMemo,
  useState,
  useEffect,
} from "react";

const ITEMS_PER_PAGE = 12;

function getWine(item) {
  if (!item) {
    return null;
  }

  const wine =
    item.wines ||
    item.wine ||
    null;

  if (!wine) {
    return null;
  }

  return {
    id: wine.id || "",

    name:
      wine.name || "Unknown Wine",

    producer:
      wine.producer || "",

    country:
      wine.country || "",

    region:
      wine.region || "",

    subregion:
      wine.subregion || "",

    wine_type:
      wine.wine_type || "Collection",

    grapes:
      wine.grapes || "",

    vintage:
      wine.vintage || "NV",

    price:
      item.price_override ??
      wine.price ??
      0,

    description:
      item.description ||
      wine.description ||
      "",

    service_type:
      item.service_type || "bottle",

    glass_price:
      item.glass_price !== null &&
      item.glass_price !== undefined
        ? Number(item.glass_price)
        : null,
  };
}

function matches(value, filter) {
  if (!filter) {
    return true;
  }

  return (
    String(value || "")
      .trim()
      .toLowerCase() ===
    String(filter || "")
      .trim()
      .toLowerCase()
  );
}

function isByTheGlass(wine) {
  return (
    wine.service_type === "glass" ||
    wine.service_type === "both"
  );
}

export default function ShangShiWineResultsView({
  menu,
  items,
  filters = {},
  onBack,
}) {
  const [currentPage, setCurrentPage] =
    useState(1);

  const [expandedWine, setExpandedWine] =
    useState(null);

  const [localFilters, setLocalFilters] =
    useState({
      wine_type: "",
      country: "",
      region: "",
      vintage: "",
      grapes: "",
      name: "",
      price: "",
      service_type: "",
      ...(filters || {}),
    });

  useEffect(() => {
    setCurrentPage(1);
  }, [JSON.stringify(localFilters)]);

  /* =====================================
     FILTER
  ===================================== */

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const wine = getWine(item);

      if (!wine) {
        return false;
      }

      const matchesService =
        !localFilters.service_type ||
        (localFilters.service_type ===
          "glass" &&
          isByTheGlass(wine));

      const matchesGrape =
        !localFilters.grapes ||
        String(wine.grapes || "")
          .toLowerCase()
          .includes(
            String(
              localFilters.grapes
            ).toLowerCase()
          );

      let matchesPrice = true;

      if (localFilters.price) {
        const price =
          localFilters.service_type ===
            "glass" &&
          isByTheGlass(wine)
            ? Number(wine.glass_price || 0)
            : Number(wine.price || 0);

        if (
          localFilters.price === "0-50"
        ) {
          matchesPrice =
            price >= 0 && price <= 50;
        }

        if (
          localFilters.price === "50-100"
        ) {
          matchesPrice =
            price > 50 && price <= 100;
        }

        if (
          localFilters.price ===
          "100-150"
        ) {
          matchesPrice =
            price > 100 && price <= 150;
        }

        if (
          localFilters.price === "150+"
        ) {
          matchesPrice = price > 150;
        }
      }

      return (
        matches(
          wine.wine_type,
          localFilters.wine_type
        ) &&
        matches(
          wine.country,
          localFilters.country
        ) &&
        matches(
          wine.region,
          localFilters.region
        ) &&
        matches(
          wine.vintage,
          localFilters.vintage
        ) &&
        matches(
          wine.name,
          localFilters.name
        ) &&
        matchesGrape &&
        matchesService &&
        matchesPrice
      );
    });
  }, [items, localFilters]);

  /* =====================================
     CATEGORIES
  ===================================== */

  const categories = [
    ...new Set(
      items
        .map((item) => {
          const wine = getWine(item);

          if (!wine) {
            return null;
          }

          return (
            wine.wine_type ||
            "Collection"
          );
        })
        .filter(Boolean)
    ),
  ];

  /* =====================================
     SORT
  ===================================== */

  const sortedItems = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const wineA = getWine(a);
      const wineB = getWine(b);

      const priceA =
        localFilters.service_type ===
          "glass" &&
        isByTheGlass(wineA)
          ? Number(
              wineA?.glass_price || 0
            )
          : Number(wineA?.price || 0);

      const priceB =
        localFilters.service_type ===
          "glass" &&
        isByTheGlass(wineB)
          ? Number(
              wineB?.glass_price || 0
            )
          : Number(wineB?.price || 0);

      return priceA - priceB;
    });
  }, [
    filtered,
    localFilters.service_type,
  ]);

  /* =====================================
     PAGINATION
  ===================================== */

  const totalPages = Math.max(
    1,
    Math.ceil(
      sortedItems.length /
        ITEMS_PER_PAGE
    )
  );

  const paginatedItems =
    sortedItems.slice(
      (currentPage - 1) *
        ITEMS_PER_PAGE,

      currentPage *
        ITEMS_PER_PAGE
    );

  /* =====================================
     RENDER
  ===================================== */

  return (
    <div
      className="
        h-[100dvh]
        overflow-y-auto
        px-6
        md:px-10
        pb-24
        pt-8
      "
      style={{
        background: `
          radial-gradient(
            circle at 50% -10%,
            rgba(201, 169, 106, .075),
            transparent 34%
          ),
          linear-gradient(
            180deg,
            #003223 0%,
            #001a12 100%
          )
        `,
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        touchAction: "pan-y",
      }}
    >
      <div className="max-w-[980px] mx-auto">
        {/* HEADER */}

        <header className="text-center pt-2 mb-10 md:mb-12">
          <img
            src="/shangshi-logo.png"
            alt="Shang Shi"
            className="
              h-16
              md:h-[72px]
              mx-auto
              mb-7
              opacity-95
            "
          />

          <div
            className="
              text-[#E3C588]
              uppercase
              tracking-[0.52em]
              text-[9px]
              mb-3
            "
          >
            {localFilters.service_type === "glass"
              ? "By the Glass"
              : "Wine Collection"}
          </div>

          <p
            className="
              text-[#C9A96A]/45
              text-[11px]
              tracking-[0.04em]
            "
          >
            {filtered.length}
            {localFilters.service_type === "glass"
              ? " wines available by the glass"
              : " wines available"}
          </p>
        </header>

        {/* STICKY NAV */}

        <div className="sticky top-3 z-50 mb-12 md:mb-14">
          <div
            className="
              min-h-[58px]
              backdrop-blur-3xl
              bg-[#002419]/90
              border
              border-[#C9A96A]/15
              rounded-full
              px-5
              md:px-7
              flex
              items-center
              gap-5
              shadow-[0_18px_50px_rgba(0,0,0,0.14)]
            "
          >
            <button
              onClick={onBack}
              className="
                shrink-0
                text-[#C9A96A]/65
                uppercase
                tracking-[0.28em]
                text-[9px]
                transition-colors
                hover:text-[#E3C588]
              "
            >
              ← Back
            </button>

            <div
              className="
                flex-1
                flex
                items-center
                justify-center
                gap-5
                md:gap-7
                overflow-x-auto
                whitespace-nowrap
                [scrollbar-width:none]
                [&::-webkit-scrollbar]:hidden
              "
            >
              {categories.map((category) => {
                const active =
                  localFilters.wine_type === category;

                return (
                  <button
                    key={category}
                    onClick={() => {
                      setCurrentPage(1);
                      setExpandedWine(null);

                      setLocalFilters({
                        ...localFilters,
                        wine_type: active ? "" : category,
                      });
                    }}
                    className={`
                      relative
                      shrink-0
                      py-5
                      uppercase
                      tracking-[0.3em]
                      text-[8px]
                      transition-colors
                      ${
                        active
                          ? "text-[#E3C588]"
                          : "text-[#C9A96A]/40 hover:text-[#C9A96A]/70"
                      }
                    `}
                  >
                    {category}

                    {active && (
                      <span
                        className="
                          absolute
                          left-1/2
                          bottom-[13px]
                          h-px
                          w-5
                          -translate-x-1/2
                          bg-[#E3C588]/70
                        "
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div
              className="
                shrink-0
                text-[#C9A96A]/35
                text-[9px]
                tracking-[0.12em]
              "
            >
              {currentPage}/{totalPages}
            </div>
          </div>
        </div>

        {/* WINES */}

        <div className="border-t border-[#C9A96A]/10">
          {paginatedItems.map((item) => {
            const wine = getWine(item);

            if (!wine) {
              return null;
            }

            const expanded =
              expandedWine === item.id;

            const byTheGlass =
              isByTheGlass(wine);

            const showBottlePrice =
              wine.service_type !== "glass";

            return (
              <article
                key={item.id}
                className="
                  group
                  border-b
                  border-[#C9A96A]/10
                  transition-colors
                  hover:bg-[#C9A96A]/[0.025]
                "
              >
                <button
                  type="button"
                  className="
                    w-full
                    text-left
                    py-7
                    md:py-8
                    px-1
                    md:px-3
                  "
                  onClick={() => {
                    setExpandedWine(
                      expanded ? null : item.id
                    );
                  }}
                >
                  <div
                    className="
                      grid
                      grid-cols-[1fr_auto]
                      gap-8
                      md:gap-16
                      items-start
                    "
                  >
                    <div className="min-w-0 max-w-[650px]">
                      {wine.producer && (
                        <div
                          className="
                            text-[#C9A96A]/40
                            uppercase
                            tracking-[0.28em]
                            text-[8px]
                            mb-3
                          "
                        >
                          {wine.producer}
                        </div>
                      )}

                      <h2
                        className="
                          text-[#F4F0E8]
                          text-[15px]
                          md:text-[16px]
                          font-light
                          tracking-[-0.01em]
                          leading-[1.45]
                        "
                      >
                        {wine.name}
                      </h2>

                      <div
                        className="
                          mt-3
                          flex
                          flex-wrap
                          items-center
                          gap-x-2
                          gap-y-1
                          text-[#C9A96A]/50
                          text-[11px]
                        "
                      >
                        {wine.country && (
                          <span>{wine.country}</span>
                        )}

                        {wine.region && (
                          <>
                            <span className="opacity-35">·</span>
                            <span>{wine.region}</span>
                          </>
                        )}

                        <span className="opacity-35">·</span>
                        <span>{wine.vintage || "NV"}</span>
                      </div>
                    </div>

                    <div
                      className="
                        min-w-[88px]
                        text-right
                        whitespace-nowrap
                        pt-1
                      "
                    >
                      {showBottlePrice && (
                        <div>
                          <div
                            className="
                              text-[#D8B873]
                              text-[17px]
                              md:text-[19px]
                              font-light
                              tracking-[-0.01em]
                            "
                          >
                            €{wine.price}
                          </div>

                          {wine.service_type === "both" && (
                            <div
                              className="
                                mt-1
                                text-[#C9A96A]/30
                                uppercase
                                tracking-[0.25em]
                                text-[7px]
                              "
                            >
                              bottle
                            </div>
                          )}
                        </div>
                      )}

                      {byTheGlass && (
                        <div
                          className={
                            wine.service_type === "both"
                              ? "mt-4"
                              : ""
                          }
                        >
                          <div
                            className="
                              text-[#D8B873]
                              text-[17px]
                              md:text-[19px]
                              font-light
                              tracking-[-0.01em]
                            "
                          >
                            €{wine.glass_price}
                          </div>

                          <div
                            className="
                              mt-1
                              text-[#C9A96A]/35
                              uppercase
                              tracking-[0.25em]
                              text-[7px]
                            "
                          >
                            glass
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {expanded && (
                    <div
                      className="
                        mt-6
                        pt-6
                        border-t
                        border-[#C9A96A]/[0.07]
                        max-w-[650px]
                        text-[#C9A96A]/48
                        text-[12px]
                        leading-[1.8]
                      "
                    >
                      {wine.description ||
                        "Selected for the Shang Shi wine collection."}
                    </div>
                  )}
                </button>
              </article>
            );
          })}
        </div>

        {/* EMPTY */}

        {paginatedItems.length === 0 && (
          <div
            className="
              text-center
              text-[#C9A96A]/45
              text-[12px]
              py-24
            "
          >
            No wines match this selection.
          </div>
        )}

        {/* PAGINATION */}

        {sortedItems.length > 0 && totalPages > 1 && (
          <nav
            className="
              flex
              justify-center
              items-center
              gap-7
              mt-14
            "
            aria-label="Wine pages"
          >
            <button
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((page) => page - 1)
              }
              className="
                text-[#C9A96A]/50
                disabled:opacity-15
                text-[15px]
              "
            >
              ←
            </button>

            {Array.from({
              length: Math.min(5, totalPages),
            }).map((_, index) => {
              const startPage = Math.max(
                1,
                Math.min(
                  currentPage - 2,
                  totalPages - 4
                )
              );

              const page = startPage + index;

              if (page > totalPages) {
                return null;
              }

              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`
                    min-w-5
                    text-[10px]
                    tracking-[0.12em]
                    transition-colors
                    ${
                      currentPage === page
                        ? "text-[#E3C588]"
                        : "text-[#C9A96A]/25"
                    }
                  `}
                >
                  {page}
                </button>
              );
            })}

            <button
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) => page + 1)
              }
              className="
                text-[#C9A96A]/50
                disabled:opacity-15
                text-[15px]
              "
            >
              →
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
