"use client";

import {
  useMemo,
  useState,
} from "react";

const ITEMS_PER_PAGE = 10;

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
      item.service_type ||
      "bottle",

    glass_price:
      item.glass_price !== null &&
      item.glass_price !== undefined
        ? Number(item.glass_price)
        : null,
  };
}

function isByTheGlass(wine) {
  return (
    wine.service_type === "glass" ||
    wine.service_type === "both"
  );
}

export default function KoyoWineResultsView({
  menu,
  items = [],
  filters = {},
  onBack,
}) {
  const [currentPage, setCurrentPage] =
    useState(1);

  const [expandedWine, setExpandedWine] =
    useState(null);

  const [selectedType, setSelectedType] =
    useState("");

  /* =====================================
     FILTER
  ===================================== */

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const wine =
        getWine(item);

      if (!wine) {
        return false;
      }

      const matchesType =
        !selectedType ||
        String(
          wine.wine_type || ""
        )
          .trim()
          .toUpperCase() ===
          String(selectedType)
            .trim()
            .toUpperCase();

      const matchesService =
        !filters.service_type ||
        (
          filters.service_type ===
            "glass" &&
          isByTheGlass(wine)
        );

      return (
        matchesType &&
        matchesService
      );
    });
  }, [
    items,
    selectedType,
    filters.service_type,
  ]);

  /* =====================================
     CATEGORIES
  ===================================== */

  const categories = [
    ...new Set(
      items
        .map((item) => {
          const wine =
            getWine(item);

          if (!wine) {
            return null;
          }

          return (
            wine.wine_type ||
            "Collection"
          )
            .trim()
            .toUpperCase();
        })
        .filter(Boolean)
    ),
  ];

  /* =====================================
     SORT
  ===================================== */

  const sortedItems = useMemo(() => {
    return [...filtered].sort(
      (a, b) => {
        const wineA =
          getWine(a);

        const wineB =
          getWine(b);

        const priceA =
          filters.service_type ===
            "glass" &&
          isByTheGlass(wineA)
            ? Number(
                wineA?.glass_price || 0
              )
            : Number(
                wineA?.price || 0
              );

        const priceB =
          filters.service_type ===
            "glass" &&
          isByTheGlass(wineB)
            ? Number(
                wineB?.glass_price || 0
              )
            : Number(
                wineB?.price || 0
              );

        return priceA - priceB;
      }
    );
  }, [
    filtered,
    filters.service_type,
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
        fixed
        inset-0

        min-h-[100dvh]
        w-screen

        overflow-x-hidden
        overflow-y-auto

        bg-[#f8f4ec]
      "
      style={{
        background: `
          linear-gradient(
            180deg,
            #f8f4ec 0%,
            #efe7da 100%
          )
        `,
      }}
    >
      {/* PAPER TEXTURE */}

      <div
        className="
          absolute
          inset-0
          pointer-events-none
          opacity-[0.05]
          mix-blend-multiply
        "
        style={{
          backgroundImage: `
            url('/textures/rice-paper.png')
          `,
        }}
      />

      {/* JAPANESE BRANCH */}

      <div
        className="
          absolute
          top-0
          right-[-40px]

          w-[420px]
          h-[620px]

          pointer-events-none
          opacity-[0.12]
        "
        style={{
          backgroundImage: `
            url('/textures/japanese-branch.png')
          `,

          backgroundRepeat:
            "no-repeat",

          backgroundSize:
            "contain",

          backgroundPosition:
            "top right",

          mixBlendMode:
            "multiply",
        }}
      />

      {/* SOFT INK ATMOSPHERE */}

      <div
        className="
          absolute
          inset-0
          pointer-events-none
          opacity-[0.05]
        "
        style={{
          background: `
            radial-gradient(
              circle at 20% 10%,
              rgba(120,90,40,.12),
              transparent 35%
            ),

            radial-gradient(
              circle at 80% 90%,
              rgba(60,40,20,.08),
              transparent 40%
            )
          `,
        }}
      />

      {/* CONTENT */}

      <div
        className="
          relative
          z-10

          w-full

          px-6
          md:px-10
          lg:px-14

          pb-20
          pt-10
        "
      >
        {/* HEADER */}

        <div
          className="
            text-center
            mb-12
          "
        >
          <img
            src="/koyologo.png"
            className="
              h-16
              md:h-20

              mx-auto
              mb-8

              opacity-95
            "
          />

          <div
            className="
              text-[#7d6854]

              uppercase

              tracking-[0.45em]

              text-[10px]

              mb-4
            "
          >
            {filters.service_type ===
            "glass"
              ? "KOYO BY THE GLASS"
              : "KOYO WINE COLLECTION"}
          </div>

          <div
            className="
              w-16
              h-[1px]

              mx-auto

              bg-[#cdbda8]

              mb-5
            "
          />

          <div
            className="
              text-[#857260]

              text-[14px]

              font-light
            "
          >
            {filtered.length}

            {filters.service_type ===
            "glass"
              ? " wines by the glass"
              : " wines available"}
          </div>
        </div>

        {/* FILTER BAR */}

        <div
          className="
            sticky
            top-4
            z-50

            mb-12
          "
        >
          <div
            className="
              rounded-full

              bg-[#f5f1ea]/90

              border
              border-[#ddd1c2]

              shadow-[0_10px_30px_rgba(120,90,40,0.06)]

              backdrop-blur-xl

              px-7
              py-4

              flex
              items-center
              justify-between

              gap-6
            "
          >
            <button
              onClick={onBack}
              className="
                text-[#7d6854]

                uppercase

                tracking-[0.22em]

                text-[10px]

                hover:opacity-60

                transition-all
              "
            >
              ← Back
            </button>

            <div
              className="
                flex
                gap-6

                flex-wrap

                justify-center
              "
            >
              <button
                onClick={() => {
                  setSelectedType("");

                  setCurrentPage(1);
                }}
                className={`
                  uppercase

                  tracking-[0.22em]

                  text-[10px]

                  transition-all

                  ${
                    !selectedType
                      ? "text-[#1e1b16]"
                      : "text-[#8e7b67]"
                  }
                `}
              >
                ALL
              </button>

              {categories.map(
                (category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedType(
                        category
                      );

                      setCurrentPage(1);
                    }}
                    className={`
                      uppercase

                      tracking-[0.22em]

                      text-[10px]

                      transition-all

                      ${
                        selectedType ===
                        category
                          ? "text-[#1e1b16]"
                          : "text-[#8e7b67]"
                      }
                    `}
                  >
                    {category}
                  </button>
                )
              )}
            </div>

            <div
              className="
                text-[#8e7b67]

                text-[10px]
              "
            >
              {currentPage}
              /
              {totalPages}
            </div>
          </div>
        </div>

        {/* WINES */}

        <div className="space-y-6">
          {paginatedItems.map(
            (item) => {
              const wine =
                getWine(item);

              if (!wine) {
                return null;
              }

              const expanded =
                expandedWine ===
                item.id;

              const byTheGlass =
                isByTheGlass(wine);

              return (
                <div
                  key={item.id}
                  className="
                    border-b
                    border-[#ddd1c2]

                    pb-5

                    cursor-pointer

                    transition-all
                    duration-500
                  "
                  onClick={() => {
                    setExpandedWine(
                      expanded
                        ? null
                        : item.id
                    );
                  }}
                >
                  <div
                    className="
                      flex
                      justify-between
                      gap-10
                      items-start
                    "
                  >
                    <div
                      className="
                        max-w-[78%]
                      "
                    >
                      <div
                        className="
                          text-[#8f7b68]

                          uppercase

                          tracking-[0.28em]

                          text-[9px]

                          mb-3
                        "
                      >
                        {wine.producer}
                      </div>

                      <div
                        className="
                          text-[#1e1b16]

                          text-[13px]
                          md:text-[15px]

                          leading-[1.25]

                          font-light

                          tracking-[-0.02em]

                          font-serif
                        "
                      >
                        {wine.name}
                      </div>

                      <div
                        className="
                          mt-4

                          text-[#857260]

                          text-[13px]
                        "
                      >
                        {wine.country}
                        {" · "}
                        {wine.vintage ||
                          "NV"}
                      </div>

                      {byTheGlass && (
                        <div
                          className="
                            mt-3

                            text-[#9f8267]

                            uppercase

                            tracking-[0.25em]

                            text-[8px]
                          "
                        >
                          Available by the glass
                        </div>
                      )}
                    </div>

                    <div
                      className="
                        text-right

                        whitespace-nowrap

                        font-serif
                      "
                    >
                      {wine.service_type !==
                        "glass" && (
                        <div
                          className="
                            text-[#1e1b16]

                            text-[14px]
                            md:text-[16px]

                            font-light
                          "
                        >
                          €{wine.price}
                        </div>
                      )}

                      {byTheGlass && (
                        <div
                          className={
                            wine.service_type ===
                            "both"
                              ? `
                                mt-2

                                text-[#7d6854]

                                text-[12px]
                                md:text-[13px]
                              `
                              : `
                                text-[#1e1b16]

                                text-[14px]
                                md:text-[16px]

                                font-light
                              `
                          }
                        >
                          €{wine.glass_price}

                          <span
                            className="
                              ml-2

                              text-[8px]

                              uppercase

                              tracking-[0.2em]

                              opacity-50

                              font-sans
                            "
                          >
                            glass
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {expanded && (
                    <div
                      className="
                        mt-6
                        pt-6

                        max-w-[700px]

                        text-[#6d5b4a]

                        text-[14px]

                        leading-[1.9]

                        font-light
                      "
                    >
                      {wine.description ||
                        "Curated for the Koyo omakase experience."}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>

        {/* EMPTY */}

        {paginatedItems.length === 0 && (
          <div
            className="
              text-center

              text-[#857260]

              text-[13px]

              py-20
            "
          >
            No wines match this selection.
          </div>
        )}

        {/* PAGINATION */}

        {sortedItems.length > 0 && (
          <div
            className="
              flex
              justify-center
              items-center

              gap-6

              mt-16
            "
          >
            <button
              disabled={
                currentPage === 1
              }
              onClick={() =>
                setCurrentPage(
                  (page) => page - 1
                )
              }
              className="
                text-[#8e7b67]

                text-[16px]

                disabled:opacity-20
              "
            >
              ←
            </button>

            {Array.from({
              length: Math.min(
                5,
                totalPages
              ),
            }).map((_, index) => {
              const startPage =
                Math.max(
                  1,
                  Math.min(
                    currentPage - 2,
                    totalPages - 4
                  )
                );

              const page =
                startPage + index;

              if (
                page > totalPages
              ) {
                return null;
              }

              return (
                <button
                  key={page}
                  onClick={() =>
                    setCurrentPage(page)
                  }
                  className={
                    currentPage === page
                      ? "text-[#1e1b16]"
                      : "text-[#9e8d7c]"
                  }
                >
                  {page}
                </button>
              );
            })}

            <button
              disabled={
                currentPage ===
                totalPages
              }
              onClick={() =>
                setCurrentPage(
                  (page) => page + 1
                )
              }
              className="
                text-[#8e7b67]

                text-[16px]

                disabled:opacity-20
              "
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}