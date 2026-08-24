"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Papa from "papaparse";

import {
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  BuildingStorefrontIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";


import { createClient } from "@/lib/supabase/client";
import { normalizeWineCategory, positiveBottleQuantity, sumNetBottles, sumPositiveBottles } from "@/lib/wineInventory";
import "./wine-cellar.css";
/* =======================================================
   CONSTANTS
======================================================= */

const WINE_TYPE_ORDER = [
  "red",
  "white",
  "sparkling",
  "rose",
  "rosé",
  "sake",
  "non-alcoholic",
  "orange",
  "dessert",
  "fortified",
];

const WINE_CHART_COLORS = [
  "#385a50",
  "#7e9e92",
  "#c2a36f",
  "#b87366",
  "#8d798f",
  "#d3b37f",
  "#657a91",
  "#9b8c73",
];

/* =======================================================
   HELPERS
======================================================= */

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatNumber(value) {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(Math.abs(numericValue) < 0.001 ? 0 : numericValue);
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString(
    "en-IE",
    {
      maximumFractionDigits: 0,
    }
  );
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

function getWineTypeLabel(type) {
  if (!type) {
    return "Unknown";
  }

  if (normalize(type) === "rose") {
    return "Rosé";
  }

  return String(type)
    .charAt(0)
    .toUpperCase() +
    String(type).slice(1);
}

async function loadAllActiveWines(supabase) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const result = await supabase
      .from("wines")
      .select(`
        *,
        wine_inventory(
          id,
          quantity,
          location_id
        )
      `)
      .eq("is_active", true)
      .range(from, from + pageSize - 1);

    if (result.error) return result;
    rows.push(...(result.data || []));
    if ((result.data || []).length < pageSize) {
      return { data: rows, error: null };
    }
  }
}

/* =======================================================
   KPI CARD
======================================================= */

function MetricCard({
  label,
  value,
  detail,
}) {
  return (
    <div
      className="
        bg-white/75
        border
        border-[#eadfd5]
        rounded-[24px]
        px-5
        py-5
        min-w-0
      "
    >
      <div
        className="
          text-[9px]
          uppercase
          tracking-[0.2em]
          text-[#91a1ba]
        "
      >
        {label}
      </div>

      <div
        className="
          mt-3
          text-[28px]
          leading-none
          font-medium
          tracking-[-0.035em]
          text-[#30231f]
        "
      >
        {value}
      </div>

      {detail && (
        <div
          className="
            mt-3
            text-[10px]
            text-[#9b8d85]
          "
        >
          {detail}
        </div>
      )}
    </div>
  );
}

/* =======================================================
   PAGE
======================================================= */

export default function WinesPage() {
  const router = useRouter();

  const supabase = createClient();

  const [wines, setWines] =
    useState([]);

  const [locations, setLocations] =
    useState([]);

  const [movements, setMovements] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [compuCashStatus, setCompuCashStatus] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [selectedCompositionType, setSelectedCompositionType] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  const [file, setFile] =
    useState(null);

  const [importing, setImporting] =
    useState(false);

  const [
    importProgress,
    setImportProgress,
  ] = useState(0);

  const [
    importCurrent,
    setImportCurrent,
  ] = useState(0);

  const [
    importTotal,
    setImportTotal,
  ] = useState(0);

  /* =====================================================
     LOAD
  ===================================================== */

  useEffect(() => {
    loadCommandCentre();
    loadCompuCashStatus();
  }, []);

  async function loadCompuCashStatus() {
    try {
      const response = await fetch("/api/compucash/status", { cache: "no-store" });
      if (response.ok) setCompuCashStatus(await response.json());
    } catch (error) {
      console.error("COMPUCASH STATUS LOAD ERROR:", error);
    }
  }

  async function loadCommandCentre() {
    setLoading(true);

    const [
      winesResult,
      locationsResult,
      movementsResult,
    ] = await Promise.all([
      loadAllActiveWines(supabase),

      supabase
        .from("wine_locations")
        .select(`
          id,
          name,
          location_type,
          is_active
        `)
        .eq("is_active", true)
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("wine_movements")
        .select(`
          id,
          wine_id,
          from_location,
          to_location,
          quantity,
          movement_type,
          notes,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        })
        .limit(12),
    ]);

    if (winesResult.error) {
      console.error(
        "WINES ERROR:",
        winesResult.error
      );
    }

    if (locationsResult.error) {
      console.error(
        "LOCATIONS ERROR:",
        locationsResult.error
      );
    }

    if (movementsResult.error) {
      console.error(
        "MOVEMENTS ERROR:",
        movementsResult.error
      );
    }

    const mappedWines = (
      winesResult.data || []
    ).map((wine) => {
      const inventory =
        wine.wine_inventory || [];

      const stock = sumPositiveBottles(inventory);
      const netStock = sumNetBottles(inventory);

      return {
        ...wine,
        stock,
        netStock,
        inventory,
      };
    });

    setWines(mappedWines);

    setLocations(
      locationsResult.data || []
    );

    setMovements(
      movementsResult.data || []
    );

    setLoading(false);
  }

  /* =====================================================
     MAPS
  ===================================================== */

  const winesMap = useMemo(() => {
    const map = {};

    wines.forEach((wine) => {
      map[String(wine.id)] = wine;
    });

    return map;
  }, [wines]);

  const locationsMap = useMemo(() => {
    const map = {};

    locations.forEach((location) => {
      map[String(location.id)] =
        location;
    });

    return map;
  }, [locations]);

  /* =====================================================
     CORE METRICS
  ===================================================== */

  const totalBottles = useMemo(() => {
    return wines.reduce(
      (sum, wine) =>
        sum +
        Number(wine.stock || 0),
      0
    );
  }, [wines]);

  const uniqueWines = useMemo(() => {
    return wines.filter(
      (wine) =>
        Number(wine.stock || 0) > 0
    ).length;
  }, [wines]);

  const cellarValue = useMemo(() => {
    return wines.reduce(
      (sum, wine) =>
        sum +
        (
          Number(wine.stock || 0) *
          Number(wine.price || 0)
        ),
      0
    );
  }, [wines]);

  /* =====================================================
     WINE COMPOSITION
  ===================================================== */

  const wineComposition = useMemo(() => {
    const stats = {};

    wines.forEach((wine) => {
      if (
        Number(wine.stock || 0) <= 0
      ) {
        return;
      }

      const type = normalizeWineCategory(wine);

      if (!stats[type]) {
        stats[type] = 0;
      }

      stats[type] += Number(
        wine.stock || 0
      );
    });

    return Object.entries(stats)
      .map(([type, quantity]) => ({
        type,
        quantity,

        percentage:
          totalBottles > 0
            ? (
                (
                  quantity /
                  totalBottles
                ) * 100
              )
            : 0,
      }))
      .sort((a, b) => {
        const aIndex =
          WINE_TYPE_ORDER.indexOf(
            a.type
          );

        const bIndex =
          WINE_TYPE_ORDER.indexOf(
            b.type
          );

        if (
          aIndex !== -1 &&
          bIndex !== -1
        ) {
          return aIndex - bIndex;
        }

        return (
          b.quantity -
          a.quantity
        );
      });
  }, [wines, totalBottles]);

  /* =====================================================
     LOCATION DISTRIBUTION
  ===================================================== */

  const locationDistribution =
    useMemo(() => {
      return locations
        .map((location) => {
          let quantity = 0;

          wines.forEach((wine) => {
            (
              wine.inventory || []
            ).forEach((row) => {
              if (
                String(
                  row.location_id
                ) ===
                String(location.id)
              ) {
                quantity += positiveBottleQuantity(row.quantity);
              }
            });
          });

          return {
            ...location,
            quantity,
          };
        })
        .filter(
          (location) =>
            location.quantity > 0
        )
        .sort(
          (a, b) =>
            b.quantity -
            a.quantity
        );
    }, [locations, wines]);

  const selectedComposition = wineComposition.find(
    (item) => item.type === selectedCompositionType
  ) || wineComposition[0] || null;

  const selectedLocation = locationDistribution.find(
    (location) => String(location.id) === String(selectedLocationId)
  ) || locationDistribution[0] || null;

  const compositionSegments = useMemo(() => {
    let cursor = 0;
    return wineComposition.slice(0, 8).map((item, index) => {
      const start = cursor;
      cursor += item.percentage;
      return { ...item, start, color: WINE_CHART_COLORS[index % WINE_CHART_COLORS.length] };
    });
  }, [wineComposition]);

  /* =====================================================
     ATTENTION
  ===================================================== */

  const zeroStockWines = useMemo(() => {
    return wines.filter(
      (wine) =>
        Number(wine.stock || 0) === 0
    );
  }, [wines]);

  const lowStockWines = useMemo(() => {
    return wines.filter((wine) => {
      const stock = Number(
        wine.stock || 0
      );

      return (
        stock > 0 &&
        stock <= 6
      );
    });
  }, [wines]);

  const highValueLowStock =
    useMemo(() => {
      return wines
        .filter((wine) => {
          const stock = Number(
            wine.stock || 0
          );

          const price = Number(
            wine.price || 0
          );

          return (
            stock > 0 &&
            stock <= 3 &&
            price >= 150
          );
        })
        .sort(
          (a, b) =>
            Number(b.price || 0) -
            Number(a.price || 0)
        );
    }, [wines]);

  /* =====================================================
     RECENT ADDITIONS
  ===================================================== */

  const recentAdditions = useMemo(() => {
    return [...wines]
      .filter(
        (wine) =>
          Number(wine.stock || 0) > 0
      )
      .sort((a, b) => {
        return (
          new Date(
            b.created_at || 0
          ) -
          new Date(
            a.created_at || 0
          )
        );
      })
      .slice(0, 6);
  }, [wines]);

  /* =====================================================
     SEARCH
  ===================================================== */

  const searchResults = useMemo(() => {
    const query = normalize(search);

    if (!query) {
      return [];
    }

    return wines
      .filter((wine) => {
        return [
          wine.name,
          wine.producer,
          wine.country,
          wine.region,
          wine.vintage,
        ].some((value) =>
          normalize(value).includes(
            query
          )
        );
      })
      .slice(0, 8);
  }, [search, wines]);

  /* =====================================================
     CSV IMPORT
  ===================================================== */

  async function importCSV() {
    if (!file) {
      return;
    }

    setImporting(true);

    setImportProgress(0);
    setImportCurrent(0);

    Papa.parse(file, {
      header: true,

      skipEmptyLines: true,

      complete: async function (
        results
      ) {
        const rows =
          results.data || [];

        setImportTotal(rows.length);

        const LOCATION_MAP = {
          MS: "Main Cellar",
          MF: "Main Cellar",

          SS: "Shang Shi",

          K: "Koyo",
          KY: "Koyo",

          E: "Ecrin",

          FD: "Fox Den",

          BC: "Bombay Club",

          PC: "Peacock",
        };

        for (
          let index = 0;
          index < rows.length;
          index += 1
        ) {
          const row = rows[index];

          setImportCurrent(
            index + 1
          );

          setImportProgress(
            Math.round(
              (
                (index + 1) /
                rows.length
              ) * 100
            )
          );

          const wineName =
            row["Wine"]?.trim();

          const producer =
            row["Producer"]?.trim();

          const qtyLocations =
            row[
              "Qty. Location"
            ]?.trim();

          const sku =
            row["SKU"]?.trim();

          if (
            !wineName ||
            !qtyLocations ||
            !sku
          ) {
            continue;
          }

          let {
            data: wine,
          } = await supabase
            .from("wines")
            .select("id, sku")
            .eq("sku", sku)
            .maybeSingle();

          if (!wine) {
            const {
              data: fallbackWine,
            } = await supabase
              .from("wines")
              .select("id, sku")
              .eq("name", wineName)
              .eq(
                "producer",
                producer || ""
              )
              .maybeSingle();

            if (fallbackWine) {
              wine = fallbackWine;

              await supabase
                .from("wines")
                .update({
                  sku,
                })
                .eq(
                  "id",
                  wine.id
                );
            }
          }

          if (!wine) {
            continue;
          }

          const splitLocations =
            qtyLocations.split(",");

          for (
            const entry
            of splitLocations
          ) {
            const [
              codeRaw,
              qtyRaw,
            ] = entry.split(":");

            if (
              !codeRaw ||
              !qtyRaw
            ) {
              continue;
            }

            const code =
              codeRaw.trim();

            const quantity =
              Number(qtyRaw.trim());

            const locationName =
              LOCATION_MAP[code];

            if (!locationName) {
              continue;
            }

            const {
              data: location,
            } = await supabase
              .from("wine_locations")
              .select("id")
              .eq(
                "name",
                locationName
              )
              .limit(1)
              .single();

            if (!location) {
              continue;
            }

            const {
              data:
                existingInventory,
            } = await supabase
              .from("wine_inventory")
              .select("id")
              .eq(
                "wine_id",
                wine.id
              )
              .eq(
                "location_id",
                location.id
              )
              .maybeSingle();

            if (existingInventory) {
              await supabase
                .from("wine_inventory")
                .update({
                  quantity,
                })
                .eq(
                  "id",
                  existingInventory.id
                );
            } else {
              await supabase
                .from("wine_inventory")
                .insert({
                  wine_id: wine.id,

                  location_id:
                    location.id,

                  quantity,
                });
            }
          }
        }

        await loadCommandCentre();

        setImporting(false);

        setFile(null);

        alert(
          "Inventory synchronization completed."
        );
      },
    });
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div
        className="
          min-h-screen
          flex
          items-center
          justify-center
          text-[#8f8178]
          text-[11px]
          uppercase
          tracking-[0.25em]
        "
      >
        Loading cellar intelligence
      </div>
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="wine-cellar-page max-w-[1600px] mx-auto px-7 py-7 space-y-5">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="wine-cellar-hero flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="so-title">
            Wine Cellar
          </div>

          <div className="so-sub mt-1">
            Global inventory intelligence
            and cellar operations
          </div>

          {compuCashStatus && (
            <div className="mt-2 text-[10px] text-[#8f8178]">
              Compucash automatic sync: {compuCashStatus.automaticSyncEnabled ? "enabled" : "disabled"}
              {compuCashStatus.latestRun?.completed_at
                ? ` · Last ${compuCashStatus.latestRun.status} ${formatDate(compuCashStatus.latestRun.completed_at)}`
                : " · No scheduled run recorded"}
            </div>
          )}
        </div>

        <div
          className="
            flex
            items-center
            gap-2
            flex-wrap
          "
        >
          <button
            onClick={() =>
              router.push(
                "/dashboard/wines/new"
              )
            }
            className="so-btn-primary"
          >
            <PlusIcon className="w-4 h-4" />

            Add Wine
          </button>

          <label
            className="
              so-btn-ghost
              cursor-pointer
              flex
              items-center
              gap-2
            "
          >
            <ArrowUpTrayIcon
              className="w-4 h-4"
            />

            {file
              ? file.name
              : "Upload CSV"}

            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(event) =>
                setFile(
                  event.target
                    .files?.[0] ||
                    null
                )
              }
            />
          </label>

          {file && (
            <button
              onClick={importCSV}
              disabled={importing}
              className="so-btn-primary"
            >
              {importing
                ? "Syncing"
                : "Sync Inventory"}
            </button>
          )}

          <button
            onClick={() =>
              router.push(
                "/dashboard/wine-cellar/inventory"
              )
            }
            className="so-btn-ghost"
          >
            Stock Control
          </button>

          <button
            onClick={() =>
              router.push(
                "/dashboard/wine-cellar/venues"
              )
            }
            className="so-btn-ghost"
          >
            Venue Wines
          </button>
        </div>
      </div>

      {/* =================================================
          IMPORT PROGRESS
      ================================================= */}

      {importing && (
        <div
          className="
            bg-white/75
            border
            border-[#eadfd5]
            rounded-[22px]
            px-5
            py-4
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              mb-3
            "
          >
            <div
              className="
                text-[12px]
                text-[#49352e]
              "
            >
              Synchronizing inventory
            </div>

            <div
              className="
                text-[11px]
                text-[#91a1ba]
              "
            >
              {importCurrent}
              {" / "}
              {importTotal}
            </div>
          </div>

          <div
            className="
              h-[5px]
              rounded-full
              bg-[#eee5dc]
              overflow-hidden
            "
          >
            <div
              className="
                h-full
                bg-[#963b2c]
                transition-all
                duration-300
              "
              style={{
                width:
                  `${importProgress}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="relative">
        <MagnifyingGlassIcon
          className="
            absolute
            left-4
            top-1/2
            -translate-y-1/2
            w-4
            h-4
            text-[#91a1ba]
          "
        />

        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search the cellar by wine, producer, region or vintage..."
          className="
            so-input
            w-full
            pl-11
          "
        />

        {search && (
          <div
            className="
              absolute
              top-[calc(100%+8px)]
              left-0
              right-0
              z-50
              bg-white
              border
              border-[#eadfd5]
              rounded-[22px]
              shadow-xl
              overflow-hidden
            "
          >
            {searchResults.length === 0 ? (
              <div
                className="
                  px-5
                  py-5
                  text-[12px]
                  text-[#9b8d85]
                "
              >
                No wines found.
              </div>
            ) : (
              searchResults.map(
                (wine) => (
                  <button
                    key={wine.id}
                    onClick={() =>
                      router.push(
                        "/dashboard/wine-cellar/inventory"
                      )
                    }
                    className="
                      w-full
                      px-5
                      py-3
                      flex
                      items-center
                      justify-between
                      gap-6
                      text-left
                      border-b
                      border-[#f2ebe5]
                      last:border-b-0
                      hover:bg-[#faf7f3]
                    "
                  >
                    <div>
                      <div
                        className="
                          text-[12px]
                          font-medium
                          text-[#33251f]
                        "
                      >
                        {wine.name}
                      </div>

                      <div
                        className="
                          mt-1
                          text-[10px]
                          text-[#91a1ba]
                        "
                      >
                        {wine.producer}
                        {" · "}
                        {wine.vintage ||
                          "NV"}
                      </div>
                    </div>

                    <div
                      className="
                        text-[11px]
                        text-[#963b2c]
                      "
                    >
                      {formatNumber(wine.stock)} bottles
                    </div>
                  </button>
                )
              )
            )}
          </div>
        )}
      </div>

      {/* =================================================
          KPI GRID
      ================================================= */}

      <div className="wine-cellar-kpis grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total Bottles"
          value={formatNumber(
            totalBottles
          )}
          detail="Physical stock across all cellar locations"
        />

        <MetricCard
          label="Unique Wines"
          value={formatNumber(
            uniqueWines
          )}
          detail={`${formatNumber(
            wines.length
          )} wines registered`}
        />

        <MetricCard
          label="Cellar Value"
          value={`€${formatCurrency(
            cellarValue
          )}`}
          detail="Based on current wine selling price"
        />

        <MetricCard
          label="Active Locations"
          value={formatNumber(
            locationDistribution.length
          )}
          detail={`${formatNumber(
            locations.length
          )} cellar locations configured`}
        />
      </div>

      {/* =================================================
          INTELLIGENCE
      ================================================= */}

      <div className="wine-intelligence-grid">
        <section className="wine-analytics-card wine-composition-card">
          <div className="wine-card-heading">
            <div><span>Portfolio analytics</span><h2>Cellar composition</h2><p>Select a category to inspect its share of physical stock.</p></div>
            <small>{formatNumber(totalBottles)} bottles</small>
          </div>

          <div className="wine-donut-layout">
            <div className="wine-donut" aria-label="Interactive wine category distribution">
              <svg viewBox="0 0 100 100" role="group" aria-label="Select a wine category segment">
                <circle className="wine-donut-track" cx="50" cy="50" r="40" pathLength="100" />
                {compositionSegments.map((item) => {
                  const isActive = selectedComposition?.type === item.type;
                  return <circle
                    key={item.type}
                    className={`wine-donut-segment ${isActive ? "is-active" : "is-muted"}`}
                    cx="50"
                    cy="50"
                    r="40"
                    pathLength="100"
                    stroke={item.color}
                    strokeDasharray={`${Math.max(item.percentage - .35, .15)} ${100 - Math.max(item.percentage - .35, .15)}`}
                    strokeDashoffset={-item.start}
                    tabIndex="0"
                    role="button"
                    aria-label={`${getWineTypeLabel(item.type)}, ${item.percentage.toFixed(1)} percent`}
                    onClick={() => setSelectedCompositionType(item.type)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedCompositionType(item.type); } }}
                  />;
                })}
              </svg>
              <span key={selectedComposition?.type || "empty"} className="wine-donut-center">
                <small>{selectedComposition ? getWineTypeLabel(selectedComposition.type) : "Cellar"}</small>
                <strong>{selectedComposition ? `${selectedComposition.percentage.toFixed(1)}%` : "0%"}</strong>
                <em>{selectedComposition ? `${formatNumber(selectedComposition.quantity)} bottles` : "No stock"}</em>
              </span>
            </div>

            <div className="wine-chart-legend">
              {wineComposition.slice(0, 8).map((item, index) => (
                <button
                  type="button"
                  key={item.type}
                  onClick={() => setSelectedCompositionType(item.type)}
                  className={selectedComposition?.type === item.type ? "is-active" : ""}
                >
                  <i style={{ background: WINE_CHART_COLORS[index % WINE_CHART_COLORS.length] }} />
                  <span>{getWineTypeLabel(item.type)}</span>
                  <strong>{item.percentage.toFixed(1)}%</strong>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="wine-analytics-card wine-location-card">
          <div className="wine-card-heading">
            <div><span>Physical network</span><h2>Stock distribution</h2><p>Compare inventory held by each cellar and venue.</p></div>
            <button type="button" onClick={() => router.push("/dashboard/wine-cellar/venues")}>Open venues ↗</button>
          </div>

          <div className="wine-location-focus">
            <div>
              <span>Selected location</span>
              <strong>{selectedLocation?.name || "No active stock"}</strong>
            </div>
            <div>
              <strong>{formatNumber(selectedLocation?.quantity || 0)}</strong>
              <span>bottles · {totalBottles > 0 ? (((selectedLocation?.quantity || 0) / totalBottles) * 100).toFixed(1) : 0}% of portfolio</span>
            </div>
          </div>

          <div className="wine-location-bars" aria-label="Inventory by location">
            {locationDistribution.slice(0, 8).map((location) => {
              const maxQuantity = locationDistribution[0]?.quantity || 1;
              const selected = String(selectedLocation?.id) === String(location.id);
              return (
                <button
                  type="button"
                  key={location.id}
                  className={selected ? "is-active" : ""}
                  onClick={() => setSelectedLocationId(location.id)}
                  title={`${location.name}: ${formatNumber(location.quantity)} bottles`}
                >
                  <span className="wine-location-bar-track"><i style={{ height: `${Math.max(7, (location.quantity / maxQuantity) * 100)}%` }} /></span>
                  <em>{location.name}</em>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* =================================================
          ACTIVITY
      ================================================= */}

      <div
        className="
          grid
          grid-cols-1
          xl:grid-cols-2
          gap-5
        "
      >

        {/* ===============================================
            RECENT ADDITIONS
        =============================================== */}

        <div className="so-card">
          <div
            className="
              flex
              items-start
              justify-between
              gap-5
              mb-6
            "
          >
            <div>
              <div className="so-title">
                Recent Additions
              </div>

              <div className="so-sub mt-1">
                Latest wines registered in
                the cellar
              </div>
            </div>

            <button
              onClick={() =>
                router.push(
                  "/dashboard/wine-cellar/inventory"
                )
              }
              className="
                text-[10px]
                uppercase
                tracking-[0.16em]
                text-[#963b2c]
              "
            >
              Stock Control
            </button>
          </div>

          <div>
            {recentAdditions.map(
              (wine) => (
                <div
                  key={wine.id}
                  className="
                    flex
                    items-center
                    justify-between
                    gap-5
                    py-3
                    border-b
                    border-[#f0e8e1]
                    last:border-b-0
                  "
                >
                  <div className="min-w-0">
                    <div
                      className="
                        text-[12px]
                        font-medium
                        text-[#33251f]
                        truncate
                      "
                    >
                      {wine.name}
                    </div>

                    <div
                      className="
                        mt-1
                        text-[10px]
                        text-[#91a1ba]
                        truncate
                      "
                    >
                      {wine.producer}

                      {wine.vintage
                        ? ` · ${wine.vintage}`
                        : ""}
                    </div>
                  </div>

                  <div
                    className="
                      text-right
                      flex-shrink-0
                    "
                  >
                    <div
                      className="
                        text-[12px]
                        text-[#963b2c]
                      "
                    >
                      {formatNumber(wine.stock)}
                    </div>

                    <div
                      className="
                        text-[9px]
                        text-[#91a1ba]
                      "
                    >
                      bottles
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* ===============================================
            RECENT MOVEMENTS
        =============================================== */}

        <div className="so-card">
          <div
            className="
              flex
              items-start
              justify-between
              gap-5
              mb-6
            "
          >
            <div>
              <div className="so-title">
                Recent Movements
              </div>

              <div className="so-sub mt-1">
                Latest inventory activity
                across the cellar
              </div>
            </div>

            <button
              onClick={() =>
                router.push(
                  "/dashboard/wine-cellar/transfers"
                )
              }
              className="
                text-[10px]
                uppercase
                tracking-[0.16em]
                text-[#963b2c]
              "
            >
              View Ledger
            </button>
          </div>

          <div>
            {movements
              .slice(0, 6)
              .map((movement) => {
                const wine =
                  winesMap[
                    String(
                      movement.wine_id
                    )
                  ];

                const fromLocation =
                  locationsMap[
                    String(
                      movement.from_location
                    )
                  ];

                const toLocation =
                  locationsMap[
                    String(
                      movement.to_location
                    )
                  ];

                const isTransfer =
                  movement.movement_type ===
                  "transfer";

                const quantity =
                  Number(
                    movement.quantity || 0
                  );

                return (
                  <div
                    key={movement.id}
                    className="
                      flex
                      items-center
                      gap-4
                      py-3
                      border-b
                      border-[#f0e8e1]
                      last:border-b-0
                    "
                  >
                    <div
                      className="
                        w-8
                        h-8
                        rounded-full
                        border
                        border-[#eadfd5]
                        flex
                        items-center
                        justify-center
                        flex-shrink-0
                      "
                    >
                      {isTransfer ? (
                        <ArrowsRightLeftIcon
                          className="
                            w-4
                            h-4
                            text-[#963b2c]
                          "
                        />
                      ) : (
                        <CircleStackIcon
                          className="
                            w-4
                            h-4
                            text-[#963b2c]
                          "
                        />
                      )}
                    </div>

                    <div
                      className="
                        flex-1
                        min-w-0
                      "
                    >
                      <div
                        className="
                          text-[12px]
                          font-medium
                          text-[#33251f]
                          truncate
                        "
                      >
                        {wine?.name ||
                          "Wine movement"}
                      </div>

                      <div
                        className="
                          mt-1
                          text-[10px]
                          text-[#91a1ba]
                          flex
                          items-center
                          gap-2
                          flex-wrap
                        "
                      >
                        {isTransfer ? (
                          <>
                            <span>
                              {fromLocation?.name ||
                                "Cellar"}
                            </span>

                            <ArrowRightIcon
                              className="
                                w-3
                                h-3
                              "
                            />

                            <span>
                              {toLocation?.name ||
                                "Cellar"}
                            </span>
                          </>
                        ) : (
                          <span>
                            {movement.notes ||
                              "Stock adjustment"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className="
                        text-right
                        flex-shrink-0
                      "
                    >
                      <div
                        className={
                          `
                          text-[12px]
                          font-medium
                          ${
                            quantity < 0
                              ? "text-red-500"
                              : "text-[#30231f]"
                          }
                          `
                        }
                      >
                        {quantity > 0 &&
                        !isTransfer
                          ? "+"
                          : ""}
                        {formatNumber(quantity)}
                      </div>

                      <div
                        className="
                          mt-1
                          text-[9px]
                          text-[#91a1ba]
                        "
                      >
                        {formatDate(
                          movement.created_at
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* =================================================
          OPERATIONAL ATTENTION
      ================================================= */}

      <div className="so-card">
        <div
          className="
            flex
            items-start
            justify-between
            gap-5
            mb-6
          "
        >
          <div>
            <div className="so-title">
              Operational Attention
            </div>

            <div className="so-sub mt-1">
              Inventory conditions requiring
              cellar review
            </div>
          </div>

          <ExclamationTriangleIcon
            className="
              w-5
              h-5
              text-[#963b2c]
            "
          />
        </div>

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-3
            gap-4
          "
        >
          <button
            onClick={() =>
              router.push(
                "/dashboard/wine-cellar/inventory"
              )
            }
            className="
              text-left
              bg-[#faf7f3]
              border
              border-[#eee4db]
              rounded-[20px]
              p-5
              transition-all
              hover:-translate-y-[1px]
            "
          >
            <div
              className="
                text-[9px]
                uppercase
                tracking-[0.18em]
                text-[#91a1ba]
              "
            >
              Zero Stock
            </div>

            <div
              className="
                mt-3
                text-[27px]
                font-medium
                text-[#30231f]
              "
            >
              {formatNumber(
                zeroStockWines.length
              )}
            </div>

            <div
              className="
                mt-2
                text-[10px]
                text-[#9b8d85]
              "
            >
              Registered wines with no
              physical stock
            </div>
          </button>

          <button
            onClick={() =>
              router.push(
                "/dashboard/wine-cellar/inventory"
              )
            }
            className="
              text-left
              bg-[#faf7f3]
              border
              border-[#eee4db]
              rounded-[20px]
              p-5
              transition-all
              hover:-translate-y-[1px]
            "
          >
            <div
              className="
                text-[9px]
                uppercase
                tracking-[0.18em]
                text-[#91a1ba]
              "
            >
              Low Stock
            </div>

            <div
              className="
                mt-3
                text-[27px]
                font-medium
                text-[#30231f]
              "
            >
              {formatNumber(
                lowStockWines.length
              )}
            </div>

            <div
              className="
                mt-2
                text-[10px]
                text-[#9b8d85]
              "
            >
              Wines holding between 1 and
              6 bottles
            </div>
          </button>

          <button
            onClick={() =>
              router.push(
                "/dashboard/wine-cellar/inventory"
              )
            }
            className="
              text-left
              bg-[#faf7f3]
              border
              border-[#eee4db]
              rounded-[20px]
              p-5
              transition-all
              hover:-translate-y-[1px]
            "
          >
            <div
              className="
                text-[9px]
                uppercase
                tracking-[0.18em]
                text-[#91a1ba]
              "
            >
              High Value / Low Stock
            </div>

            <div
              className="
                mt-3
                text-[27px]
                font-medium
                text-[#963b2c]
              "
            >
              {formatNumber(
                highValueLowStock.length
              )}
            </div>

            <div
              className="
                mt-2
                text-[10px]
                text-[#9b8d85]
              "
            >
              €150+ wines with 3 bottles
              or fewer
            </div>
          </button>
        </div>

        {highValueLowStock.length > 0 && (
          <div
            className="
              mt-5
              border-t
              border-[#eee5dd]
              pt-2
            "
          >
            {highValueLowStock
              .slice(0, 5)
              .map((wine) => (
                <div
                  key={wine.id}
                  className="
                    flex
                    items-center
                    justify-between
                    gap-5
                    py-3
                    border-b
                    border-[#f2ebe5]
                    last:border-b-0
                  "
                >
                  <div>
                    <div
                      className="
                        text-[11px]
                        font-medium
                        text-[#33251f]
                      "
                    >
                      {wine.name}
                    </div>

                    <div
                      className="
                        mt-1
                        text-[9px]
                        text-[#91a1ba]
                      "
                    >
                      {wine.producer}
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      items-center
                      gap-6
                    "
                  >
                    <div
                      className="
                        text-[11px]
                        text-[#7e6d64]
                      "
                    >
                      €
                      {formatCurrency(
                        wine.price
                      )}
                    </div>

                    <div
                      className="
                        min-w-[72px]
                        text-right
                        text-[11px]
                        font-medium
                        text-[#963b2c]
                      "
                    >
                      {formatNumber(wine.stock)} bottles
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

    </div>
  );
}
