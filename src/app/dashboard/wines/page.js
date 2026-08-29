"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Papa from "papaparse";
import * as XLSX from "xlsx";

import {
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";


import { createClient } from "@/lib/supabase/client";
import { summarizeInventoryValuation } from "@/lib/inventoryValuation";
import { BOTTLE_FORMATS, normalizeWineCategory, positiveBottleQuantity, summarizeBottleFormats, summarizeInventoryFamilies, sumNetBottles, sumPositiveBottles } from "@/lib/wineInventory";
import { PortfolioRing } from "@/components/dashboard/OperationalVisuals";
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

async function loadAllInventoryValuations(supabase) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const result = await supabase
      .from("wine_inventory_valuations")
      .select(`
        wine_id,
        location_id,
        external_product_id,
        external_store_ids,
        quantity_snapshot,
        cost_covered_quantity,
        unit_inventory_cost,
        inventory_cost_value,
        unit_sale_price_gross,
        unit_sale_price_net,
        vat_percent,
        sale_price_group_id,
        currency_code,
        cost_basis,
        source_updated_at
      `)
      .eq("source", "compucash")
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
        wine-cellar-metric
        bg-white/75
        border
        border-[#eadfd5]
        rounded-[24px]
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
          wine-cellar-metric-value
          text-[25px]
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
            wine-cellar-metric-detail
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

  const [storeMappings, setStoreMappings] =
    useState([]);

  const [movements, setMovements] =
    useState([]);

  const [inventoryValuations, setInventoryValuations] =
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

  const [exporting, setExporting] =
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
      storeMappingsResult,
      movementsResult,
      valuationsResult,
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
        .from("wine_location_store_mappings")
        .select("location_id,business_store_id,business_store_name")
        .order("business_store_name", { ascending: true }),

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

      loadAllInventoryValuations(supabase),
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

    if (storeMappingsResult.error) {
      console.error(
        "STORE MAPPINGS ERROR:",
        storeMappingsResult.error
      );
    }

    if (valuationsResult.error) {
      console.error(
        "INVENTORY VALUATIONS ERROR:",
        valuationsResult.error
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

    setWines(mappedWines.filter((wine) => Number(wine.stock || 0) > 0));

    setLocations(
      locationsResult.data || []
    );

    setStoreMappings(
      storeMappingsResult.data || []
    );

    setMovements(
      movementsResult.data || []
    );

    setInventoryValuations(
      valuationsResult.data || []
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

  const inventoryFamilies = useMemo(
    () => summarizeInventoryFamilies(
      wines.flatMap((wine) => (wine.inventory || []).map((row) => ({
        ...row,
        wines: wine,
      }))),
      (row) => row.quantity
    ),
    [wines]
  );

  const uniqueWines = useMemo(() => {
    return wines.filter(
      (wine) =>
        Number(wine.stock || 0) > 0
    ).length;
  }, [wines]);

  const valuationSummary = useMemo(() => {
    return summarizeInventoryValuation({
      inventoryRows: wines.flatMap((wine) =>
        (wine.inventory || []).map((inventory) => ({
          ...inventory,
          wine_id: wine.id,
        }))
      ),
      valuationRows: inventoryValuations,
    });
  }, [inventoryValuations, wines]);

  const bottleFormats = useMemo(
    () => summarizeBottleFormats(
      wines.flatMap((wine) => (wine.inventory || []).map((row) => ({
        ...row,
        name: wine.name,
        size: wine.size,
      })))
    ),
    [wines]
  );

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
    return wineComposition.slice(0, 8).map((item, index) => {
      return {
        key: item.type,
        label: getWineTypeLabel(item.type),
        value: item.quantity,
        color: WINE_CHART_COLORS[index % WINE_CHART_COLORS.length],
      };
    });
  }, [wineComposition]);

  /* =====================================================
     ATTENTION
  ===================================================== */

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
        if (Number(wine.stock || 0) <= 0) {
          return false;
        }

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
     COMPUCASH RECONCILIATION EXPORT
  ===================================================== */

  function exportInventoryReconciliation() {
    if (exporting || wines.length === 0) return;

    setExporting(true);

    try {
      const valuationByKey = new Map(
        inventoryValuations.map((row) => [
          `${row.wine_id}|${row.location_id}`,
          row,
        ])
      );
      const mappingsByLocation = new Map();

      for (const mapping of storeMappings) {
        const locationId = String(mapping.location_id);
        const existing = mappingsByLocation.get(locationId) || [];
        existing.push(mapping);
        mappingsByLocation.set(locationId, existing);
      }

      const detailRows = [];

      for (const wine of wines) {
        const inventoryByLocation = new Map();

        for (const inventory of wine.inventory || []) {
          const locationId = String(inventory.location_id || "");
          inventoryByLocation.set(
            locationId,
            (inventoryByLocation.get(locationId) || 0) +
              positiveBottleQuantity(inventory.quantity)
          );
        }

        for (const [locationId, vaxeronQuantity] of inventoryByLocation) {
          if (vaxeronQuantity <= 0) continue;

          const key = `${wine.id}|${locationId}`;
          const valuation = valuationByKey.get(key);
          const location = locationsMap[locationId];
          const mappings = mappingsByLocation.get(locationId) || [];
          const compucashQuantity = valuation
            ? positiveBottleQuantity(valuation.quantity_snapshot)
            : null;
          const difference = compucashQuantity == null
            ? null
            : vaxeronQuantity - compucashQuantity;
          const quantityMatches = difference != null && Math.abs(difference) < 0.001;
          const unitCost = valuation?.unit_inventory_cost == null
            ? null
            : Number(valuation.unit_inventory_cost);
          const costCoveredQuantity = valuation
            ? Math.min(
                vaxeronQuantity,
                positiveBottleQuantity(valuation.cost_covered_quantity)
              )
            : 0;
          const salePriceNet = valuation?.unit_sale_price_net == null
            ? null
            : Number(valuation.unit_sale_price_net);
          const salePriceGross = valuation?.unit_sale_price_gross == null
            ? null
            : Number(valuation.unit_sale_price_gross);

          detailRows.push({
            "Comparison status": !valuation
              ? "Missing Compucash snapshot"
              : quantityMatches
                ? "Matched"
                : "Quantity mismatch",
            "Wine label": wine.name || "Unnamed wine",
            Producer: wine.producer || "",
            Vintage: wine.vintage || "NV",
            Category: getWineTypeLabel(normalizeWineCategory(wine)),
            "Bottle size": wine.size || "Needs review",
            "Vaxeron SKU": wine.sku || "",
            "Business product number": wine.business_product_number || "",
            "Compucash product ID": valuation?.external_product_id || "",
            "Vaxeron location": location?.name || "Unknown location",
            "Location type": location?.location_type || "",
            "Mapped Compucash stores": mappings
              .map((mapping) => mapping.business_store_name)
              .filter(Boolean)
              .join(" | "),
            "Mapped store IDs": (valuation?.external_store_ids?.length
              ? valuation.external_store_ids
              : mappings.map((mapping) => mapping.business_store_id)
            ).filter(Boolean).join(" | "),
            "Vaxeron quantity": vaxeronQuantity,
            "Compucash quantity snapshot": compucashQuantity,
            "Quantity difference": difference,
            "Average purchase price": unitCost,
            "Cost-covered quantity": costCoveredQuantity,
            "Vaxeron inventory value": unitCost == null
              ? null
              : costCoveredQuantity * unitCost,
            "Compucash snapshot value": valuation?.inventory_cost_value == null
              ? null
              : Number(valuation.inventory_cost_value),
            "Selling price net": salePriceNet,
            "Selling price gross": salePriceGross,
            "Potential net revenue": salePriceNet == null
              ? null
              : vaxeronQuantity * salePriceNet,
            "Potential gross revenue": salePriceGross == null
              ? null
              : vaxeronQuantity * salePriceGross,
            Currency: valuation?.currency_code || "EUR",
            "Purchase-cost basis": valuation?.cost_basis || "",
            "Compucash source updated": valuation?.source_updated_at || "",
          });
        }
      }

      detailRows.sort((a, b) =>
        a["Vaxeron location"].localeCompare(b["Vaxeron location"]) ||
        a["Wine label"].localeCompare(b["Wine label"])
      );

      const locationRows = Array.from(
        detailRows.reduce((map, row) => {
          const locationName = row["Vaxeron location"];
          const current = map.get(locationName) || {
            Location: locationName,
            "Active labels": 0,
            "Vaxeron quantity": 0,
            "Compucash quantity snapshot": 0,
            "Quantity difference": 0,
            "Inventory at average cost": 0,
            "Rows requiring review": 0,
          };
          current["Active labels"] += 1;
          current["Vaxeron quantity"] += Number(row["Vaxeron quantity"] || 0);
          current["Compucash quantity snapshot"] += Number(row["Compucash quantity snapshot"] || 0);
          current["Quantity difference"] += Number(row["Quantity difference"] || 0);
          current["Inventory at average cost"] += Number(row["Vaxeron inventory value"] || 0);
          if (row["Comparison status"] !== "Matched") current["Rows requiring review"] += 1;
          map.set(locationName, current);
          return map;
        }, new Map()).values()
      ).sort((a, b) => a.Location.localeCompare(b.Location));

      const matchedRows = detailRows.filter((row) => row["Comparison status"] === "Matched").length;
      const mismatchRows = detailRows.length - matchedRows;
      const vaxeronTotal = detailRows.reduce((sum, row) => sum + Number(row["Vaxeron quantity"] || 0), 0);
      const compucashTotal = detailRows.reduce((sum, row) => sum + Number(row["Compucash quantity snapshot"] || 0), 0);
      const reportGeneratedAt = new Date();
      const summaryRows = [
        ["Vaxeron / Compucash inventory reconciliation"],
        ["Generated", reportGeneratedAt.toISOString()],
        ["Scope", "Active wine labels with Vaxeron physical stock above zero"],
        ["Latest Compucash sync status", compuCashStatus?.latestRun?.status || "Unknown"],
        ["Latest Compucash sync completed", compuCashStatus?.latestRun?.completed_at || ""],
        ["Compucash products received", compuCashStatus?.latestRun?.products_received ?? ""],
        ["Compucash products matched", compuCashStatus?.latestRun?.products_matched ?? ""],
        ["Compucash products unmatched", compuCashStatus?.latestRun?.unmatched_products ?? ""],
        [],
        ["Active wine labels", new Set(detailRows.map((row) => `${row["Wine label"]}|${row.Producer}|${row.Vintage}`)).size],
        ["Active wine/location rows", detailRows.length],
        ["Active locations", locationRows.length],
        ["Vaxeron physical quantity", vaxeronTotal],
        ["Compucash quantity snapshot", compucashTotal],
        ["Quantity difference", vaxeronTotal - compucashTotal],
        ["Matched rows", matchedRows],
        ["Rows requiring review", mismatchRows],
        ["Inventory at average purchase cost", valuationSummary.inventoryCost],
        ["Purchase-cost coverage (%)", valuationSummary.costCoverage],
        ["Potential net revenue", valuationSummary.potentialRevenueNet],
        ["Currency", "EUR"],
        [],
        ["Interpretation"],
        ["Vaxeron quantity", "Current positive quantity stored in Vaxeron for the wine and location."],
        ["Compucash quantity snapshot", "Quantity received from Compucash during the valuation/sync snapshot."],
        ["Average purchase price", "Compucash StoreQuantity.storagePrice; treated as average purchase cost."],
        ["Quantity difference", "Vaxeron quantity minus Compucash quantity. Zero means the row reconciles."],
      ];

      const workbook = XLSX.utils.book_new();
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      const locationSheet = XLSX.utils.json_to_sheet(locationRows);
      const detailSheet = XLSX.utils.json_to_sheet(detailRows);

      summarySheet["!cols"] = [{ wch: 36 }, { wch: 78 }];
      locationSheet["!cols"] = [
        { wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 28 },
        { wch: 18 }, { wch: 27 }, { wch: 20 },
      ];
      detailSheet["!cols"] = [
        { wch: 25 }, { wch: 42 }, { wch: 28 }, { wch: 10 }, { wch: 16 },
        { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 22 }, { wch: 24 },
        { wch: 18 }, { wch: 38 }, { wch: 24 }, { wch: 18 }, { wch: 28 },
        { wch: 19 }, { wch: 23 }, { wch: 22 }, { wch: 24 }, { wch: 25 },
        { wch: 20 }, { wch: 22 }, { wch: 23 }, { wch: 25 }, { wch: 10 },
        { wch: 26 }, { wch: 24 },
      ];
      if (detailSheet["!ref"]) {
        detailSheet["!autofilter"] = { ref: detailSheet["!ref"] };
      }
      if (locationSheet["!ref"]) {
        locationSheet["!autofilter"] = { ref: locationSheet["!ref"] };
      }

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      XLSX.utils.book_append_sheet(workbook, locationSheet, "Locations");
      XLSX.utils.book_append_sheet(workbook, detailSheet, "Wine detail");

      const dateStamp = reportGeneratedAt.toISOString().slice(0, 10);
      XLSX.writeFile(
        workbook,
        `vaxeron-compucash-reconciliation-${dateStamp}.xlsx`,
        { compression: true }
      );
    } catch (error) {
      console.error("INVENTORY EXPORT ERROR:", error);
      window.alert("Vaxeron could not create the inventory export. Please try again.");
    } finally {
      setExporting(false);
    }
  }

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
    <div className="wine-cellar-page max-w-[1600px] mx-auto px-5 py-3 space-y-3">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="wine-cellar-hero">
        <div className="wine-cellar-hero-copy">
          <div className="so-title">
            Wine Cellar
          </div>

          <div className="so-sub mt-1">
            Global inventory intelligence
            and cellar operations
          </div>

        </div>

        {compuCashStatus && (
          <div
            className={`wine-sync-badge ${compuCashStatus.latestRun?.status === "succeeded" ? "is-success" : "needs-attention"}`}
            title={compuCashStatus.automaticSyncEnabled ? "Automatic inventory sync is enabled" : "Most recent Compucash inventory sync"}
          >
            {compuCashStatus.latestRun?.status === "succeeded" ? (
              <CheckCircleIcon aria-hidden="true" />
            ) : (
              <ExclamationTriangleIcon aria-hidden="true" />
            )}
            <span>
              <strong>
                {compuCashStatus.latestRun?.status === "succeeded"
                  ? "Compucash sync succeeded"
                  : "Compucash sync needs attention"}
              </strong>
              <small>
                {compuCashStatus.latestRun?.completed_at
                  ? formatDate(compuCashStatus.latestRun.completed_at)
                  : "No completed sync recorded"}
              </small>
            </span>
          </div>
        )}

        <div className="wine-cellar-actions">
          <button
            type="button"
            onClick={exportInventoryReconciliation}
            disabled={exporting}
            className="so-btn-secondary"
            title="Export the current Vaxeron inventory beside its Compucash quantity and purchase-cost snapshot"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {exporting ? "Preparing export" : "Export inventory"}
          </button>

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

      <div className="wine-cellar-search so-search-control relative">
        <MagnifyingGlassIcon
          className="so-search-icon
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
            so-search-input
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

      <section className="wine-portfolio-summary" aria-label="Wine portfolio summary">
        <div className="wine-portfolio-primary">
          <span>Total physical units</span>
          <strong>{formatNumber(inventoryFamilies.total.positive)}</strong>
          <small>{formatNumber(uniqueWines)} active labels with positive physical stock</small>
        </div>

        <div className="wine-portfolio-facts" aria-label="Compucash inventory valuation">
          <div title="Current stock multiplied by Compucash StoreQuantity.storagePrice">
            <strong>€{formatCurrency(valuationSummary.inventoryCost)}</strong>
            <span>average purchase cost · {formatNumber(valuationSummary.costCoverage)}% covered</span>
          </div>
          <div title="Current stock multiplied by the default Compucash sale price excluding VAT">
            <strong>€{formatCurrency(valuationSummary.potentialRevenueNet)}</strong>
            <span>potential net revenue · {formatNumber(valuationSummary.saleCoverage)}% covered</span>
          </div>
          <div title={`Potential gross guest revenue €${formatCurrency(valuationSummary.potentialRevenueGross)}`}>
            <strong>€{formatCurrency(valuationSummary.potentialGrossProfit)}</strong>
            <span>potential gross profit</span>
          </div>
          <div title="Potential gross profit divided by comparable net revenue">
            <strong>{formatNumber(valuationSummary.potentialMargin)}%</strong>
            <span>potential margin</span>
          </div>
        </div>

        <div className="wine-portfolio-formats" aria-label="Stock by bottle format">
          {Object.entries(BOTTLE_FORMATS).filter(([key]) => key !== "unknown").map(([key, format]) => (
            <button
              type="button"
              key={key}
              className={key === "unknown" && bottleFormats[key] > 0 ? "needs-review" : ""}
              onClick={() => router.push(`/dashboard/wine-cellar/inventory${key === "unknown" ? "?format=unknown" : ""}`)}
              title={format.detail}
            >
              <span>{format.label}</span>
              <strong>{formatNumber(bottleFormats[key])}</strong>
            </button>
          ))}
          <small>
            <button type="button" className="wine-format-review-link" onClick={() => router.push("/dashboard/wine-cellar/inventory?format=unknown")}>{formatNumber(bottleFormats.unknown)} size to review</button>
            <span> · {formatNumber(bottleFormats.fractional)} fractional/open included above</span>
          </small>
        </div>
      </section>

      {/* =================================================
          INTELLIGENCE
      ================================================= */}

      <div className="wine-intelligence-grid">
        <section className="wine-analytics-card wine-composition-card">
          <div className="wine-card-heading">
            <div><span>Portfolio analytics</span><h2>Cellar composition</h2><p>Select a category to inspect its share of physical stock.</p></div>
            <small>{formatNumber(totalBottles)} bottles</small>
          </div>

          <PortfolioRing
            items={compositionSegments}
            selectedKey={selectedComposition?.type}
            onSelect={setSelectedCompositionType}
          />
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

      <details className="wine-secondary-details">
        <summary>
          <div>
            <span>Operations & activity</span>
            <strong>Review what needs attention</strong>
          </div>
          <div className="wine-secondary-counts">
            <span><strong>{formatNumber(lowStockWines.length)}</strong> low stock</span>
            <span><strong>{formatNumber(highValueLowStock.length)}</strong> high value</span>
            <em>Open details</em>
          </div>
        </summary>

        <div className="wine-secondary-details-body">

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
            md:grid-cols-2
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
      </details>

    </div>
  );
}
