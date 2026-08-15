"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";

import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const supabase = createClient();

const WINE_GROUPS = new Set([
  "by the glass",
  "champagne",
  "dessert wine",
  "fortified wine",
  "non-alcoholic wine",
  "red wine",
  "rose wine",
  "rosé wine",
  "sparkling wine",
  "white wine",
]);

const STORE_FIELDS = [
  "quantity",
  "quantity in measure unit",
  "storage price",
  "total",
  "sales price",
  "sale prices sum",
];

const PAGE_SIZE = 60;

/* =======================================================
   NORMALIZATION
======================================================= */

function normalize(value) {
  return String(value ?? "").trim();
}

function normalizeLower(value) {
  return normalize(value).toLowerCase();
}

function normalizeAccentless(value) {
  return normalizeLower(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeIdentifier(value) {
  return normalize(value)
    .replace(/\.0+$/, "")
    .toLowerCase();
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(
    String(value)
      .trim()
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-GB", {
    maximumFractionDigits: 2,
  });
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-IE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function findColumn(row, candidates) {
  if (!row) {
    return undefined;
  }

  const keys = Object.keys(row);

  const matchedKey = keys.find((key) =>
    candidates.some(
      (candidate) =>
        normalizeAccentless(key) === normalizeAccentless(candidate)
    )
  );

  return matchedKey ? row[matchedKey] : undefined;
}

function isWineGroup(value) {
  return WINE_GROUPS.has(normalizeAccentless(value));
}

function normalizeWineGroup(value) {
  const group = normalizeAccentless(value);

  const map = {
    champagne: "sparkling",
    "sparkling wine": "sparkling",
    "white wine": "white",
    "red wine": "red",
    "rose wine": "rose",
    "dessert wine": "dessert",
    "fortified wine": "fortified",
    "non-alcoholic wine": "non-alcoholic",
    "by the glass": "by-the-glass",
  };

  return map[group] || group || "other";
}

function extractVintage(value) {
  const match = normalize(value).match(/\b(19\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function extractFormat(value, measureUnit) {
  const source = normalizeAccentless(value);

  const namedFormats = [
    { pattern: /\bdouble magnum\b/, bottleCl: 300, label: "300cl" },
    { pattern: /\bjeroboam\b/, bottleCl: 300, label: "300cl" },
    { pattern: /\bmagnum\b/, bottleCl: 150, label: "150cl" },
    { pattern: /\bhalf bottle\b/, bottleCl: 37.5, label: "37.5cl" },
  ];

  for (const item of namedFormats) {
    if (item.pattern.test(source)) {
      return {
        serviceType: "bottle",
        bottleCl: item.bottleCl,
        servingCl: null,
        label: item.label,
      };
    }
  }

  const clMatch = source.match(/\b(\d+(?:[.,]\d+)?)\s*cl\b/);

  if (clMatch) {
    const cl = Number(clMatch[1].replace(",", "."));
    const isGlass = cl > 0 && cl <= 25;

    return {
      serviceType: isGlass ? "glass" : "bottle",
      bottleCl: isGlass ? null : cl,
      servingCl: isGlass ? cl : null,
      label: `${cl}cl`,
    };
  }

  const mlMatch = source.match(/\b(\d+(?:[.,]\d+)?)\s*ml\b/);

  if (mlMatch) {
    const cl = Number(mlMatch[1].replace(",", ".")) / 10;
    const isGlass = cl > 0 && cl <= 25;

    return {
      serviceType: isGlass ? "glass" : "bottle",
      bottleCl: isGlass ? null : cl,
      servingCl: isGlass ? cl : null,
      label: `${cl}cl`,
    };
  }

  const litreMatch = source.match(/\b(\d+(?:[.,]\d+)?)\s*l\b/);

  if (litreMatch) {
    const cl = Number(litreMatch[1].replace(",", ".")) * 100;

    return {
      serviceType: "bottle",
      bottleCl: cl,
      servingCl: null,
      label: `${cl}cl`,
    };
  }

  const unit = toNumber(measureUnit);

  if (unit > 0 && unit <= 25) {
    return {
      serviceType: "glass",
      bottleCl: null,
      servingCl: unit,
      label: `${unit}cl`,
    };
  }

  if (unit > 25) {
    return {
      serviceType: "bottle",
      bottleCl: unit,
      servingCl: null,
      label: `${unit}cl`,
    };
  }

  return {
    serviceType: "bottle",
    bottleCl: null,
    servingCl: null,
    label: "",
  };
}

function normalizedWineIdentity(value) {
  return normalizeAccentless(value)
    .replace(/[’‘`]/g, "'")
    .replace(/&/g, " and ")
    .replace(/\bdouble magnum\b/g, " ")
    .replace(/\bhalf bottle\b/g, " ")
    .replace(/\bmagnum\b/g, " ")
    .replace(/\bjeroboam\b/g, " ")
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:cl|ml|l)\b/g, " ")
    .replace(/\b(nv|n\/v)\b/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeProductKey(row) {
  return (
    normalizeIdentifier(row.productId) ||
    normalizeIdentifier(row.barcode) ||
    [
      normalizedWineIdentity(row.productName),
      row.vintage || "nv",
      row.format?.serviceType || "bottle",
      row.format?.bottleCl || row.format?.servingCl || "unknown",
    ].join("::")
  );
}

/* =======================================================
   EXCEL PARSERS
======================================================= */

async function readWorkbook(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  if (!workbook.SheetNames?.length) {
    throw new Error("No worksheet was found in this Excel file.");
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  return {
    sheetName,
    worksheet,
    matrix,
  };
}

function parseProductsWorkbook({ worksheet, matrix }) {
  const normalizedMatrix = matrix.map((row) =>
    row.map((cell) => normalizeAccentless(cell))
  );

  const headerIndex = normalizedMatrix.findIndex(
    (cells) =>
      cells.includes("product name") &&
      cells.includes("product id") &&
      cells.includes("product group") &&
      cells.includes("sales price")
  );

  if (headerIndex === -1) {
    throw new Error(
      "This does not look like the CompuCash Products report."
    );
  }

  const objects = XLSX.utils.sheet_to_json(worksheet, {
    range: headerIndex,
    defval: "",
    raw: false,
  });

  const rows = objects
    .map((row, index) => {
      const productName = normalize(
        findColumn(row, ["Product name", "Product"])
      );

      const productId = normalize(
        findColumn(row, ["Product ID", "Product Id"])
      );

      const productNumber = normalize(
        findColumn(row, ["Product number", "Product No.", "SKU"])
      );

      const barcode = normalize(findColumn(row, ["Barcode", "EAN"]));

      const productGroup = normalize(
        findColumn(row, ["Product group", "Group name", "Group"])
      );

      const measureUnit = toNumber(
        findColumn(row, ["Measure unit", "Unit", "Volume"])
      );

      const salesPrice = toNumber(
        findColumn(row, ["Sales price", "Sale price", "Selling price"])
      );

      const totalQuantityInStores = toNumber(
        findColumn(row, [
          "Total quantity in stores",
          "Total quantity",
          "Total stock",
        ])
      );

      const lastIncomePrice = toNumber(
        findColumn(row, ["Last income price", "Last purchase price"])
      );

      const weightedAveragePrice = toNumber(
        findColumn(row, ["Weighted average price", "Average price"])
      );

      const detectedFormat = extractFormat(productName, measureUnit);
      const isByTheGlass =
        normalizeAccentless(productGroup) === "by the glass";

      const format = isByTheGlass
        ? {
            ...detectedFormat,
            serviceType: "glass",
            bottleCl: null,
            servingCl:
              detectedFormat.servingCl ||
              (measureUnit > 0 && measureUnit <= 25 ? measureUnit : null),
            label:
              detectedFormat.label ||
              (measureUnit > 0 && measureUnit <= 25
                ? `${measureUnit}cl`
                : "BTG"),
          }
        : detectedFormat;

      return {
        sourceRow: headerIndex + index + 2,
        productId,
        productNumber,
        barcode,
        productName,
        productGroup,
        measureUnit,
        salesPrice,
        totalQuantityInStores,
        costPrice: weightedAveragePrice || lastIncomePrice,
        vintage: extractVintage(productName),
        format,
        wineType: normalizeWineGroup(productGroup),
      };
    })
    .filter((row) => row.productName && isWineGroup(row.productGroup));

  if (!rows.length) {
    throw new Error("No wine products were found in the Products report.");
  }

  return rows;
}

function deriveProductsFromStoreBalance(storeRows) {
  const productsByKey = new Map();

  for (const row of storeRows) {
    const fallbackFormat = extractFormat(row.productName, null);
    const product = {
      sourceRow: row.sourceRow,
      productId: "",
      productNumber: row.productNumber || "",
      barcode: row.barcode || "",
      productName: row.productName,
      productGroup: row.productGroup || "",
      measureUnit: 0,
      salesPrice: Number(row.salesPrice || 0),
      totalQuantityInStores: 0,
      costPrice: Number(row.storagePrice || 0),
      vintage: extractVintage(row.productName),
      format:
        normalizeAccentless(row.productGroup) === "by the glass"
          ? {
              ...fallbackFormat,
              serviceType: "glass",
              bottleCl: null,
              servingCl: fallbackFormat.servingCl || null,
              label: fallbackFormat.label || "BTG",
            }
          : fallbackFormat,
      wineType: normalizeWineGroup(row.productGroup),
      derivedFromStoreBalance: true,
    };

    const key =
      normalizeIdentifier(product.barcode) ||
      normalizeIdentifier(product.productNumber) ||
      [
        normalizedWineIdentity(product.productName),
        product.vintage || "nv",
        product.format?.serviceType || "bottle",
        product.format?.bottleCl || product.format?.servingCl || "unknown",
      ].join("::");

    const existing = productsByKey.get(key);

    if (!existing) {
      productsByKey.set(key, product);
      continue;
    }

    // Keep the richest price/cost values seen across stores.
    productsByKey.set(key, {
      ...existing,
      salesPrice: existing.salesPrice || product.salesPrice,
      costPrice: existing.costPrice || product.costPrice,
    });
  }

  return [...productsByKey.values()];
}

function parseStoreBalanceWorkbook({ matrix }) {
  const normalizedMatrix = matrix.map((row) =>
    row.map((cell) => normalizeAccentless(cell))
  );

  const fieldHeaderIndex = normalizedMatrix.findIndex(
    (cells) =>
      cells.includes("product name") &&
      cells.includes("product number") &&
      cells.includes("group name") &&
      cells.filter((cell) => cell === "quantity").length >= 1
  );

  if (fieldHeaderIndex === -1 || fieldHeaderIndex < 1) {
    throw new Error(
      "This does not look like the CompuCash Store Balance report."
    );
  }

  const storeHeaderRow = matrix[fieldHeaderIndex - 1] || [];
  const fieldHeaderRow = matrix[fieldHeaderIndex] || [];

  const stores = [];
  const storeBlocks = [];

  for (let column = 4; column < fieldHeaderRow.length; column += STORE_FIELDS.length) {
    const storeName = normalize(storeHeaderRow[column]);

    if (!storeName) {
      continue;
    }

    stores.push(storeName);
    storeBlocks.push({
      storeName,
      startColumn: column,
    });
  }

  if (!storeBlocks.length) {
    throw new Error("No CompuCash store columns were detected.");
  }

  const rows = [];
  let currentGroup = "";

  matrix.slice(fieldHeaderIndex + 1).forEach((sourceRow, offset) => {
    const productName = normalize(sourceRow[0]);
    const productNumber = normalize(sourceRow[1]);
    const barcode = normalize(sourceRow[2]);
    const rowGroup = normalize(sourceRow[3]);

    const looksLikeGroupHeading =
      productName &&
      !productNumber &&
      !barcode &&
      !rowGroup;

    if (looksLikeGroupHeading) {
      currentGroup = productName;
      return;
    }

    const productGroup = rowGroup || currentGroup;

    if (!productName || !isWineGroup(productGroup)) {
      return;
    }

    storeBlocks.forEach(({ storeName, startColumn }) => {
      const quantity = toNumber(sourceRow[startColumn]);
      const quantityInMeasureUnit = toNumber(sourceRow[startColumn + 1]);
      const storagePrice = toNumber(sourceRow[startColumn + 2]);
      const total = toNumber(sourceRow[startColumn + 3]);
      const salesPrice = toNumber(sourceRow[startColumn + 4]);
      const salePricesSum = toNumber(sourceRow[startColumn + 5]);

      const hasStoreData =
        normalize(sourceRow[startColumn]) !== "" ||
        normalize(sourceRow[startColumn + 1]) !== "" ||
        normalize(sourceRow[startColumn + 2]) !== "" ||
        normalize(sourceRow[startColumn + 3]) !== "" ||
        normalize(sourceRow[startColumn + 4]) !== "" ||
        normalize(sourceRow[startColumn + 5]) !== "";

      if (!hasStoreData) {
        return;
      }

      rows.push({
        sourceRow: fieldHeaderIndex + offset + 2,
        store: storeName,
        productName,
        productNumber,
        barcode,
        productGroup,
        quantity,
        quantityInMeasureUnit,
        storagePrice,
        total,
        salesPrice,
        salePricesSum,
      });
    });
  });

  return {
    stores: [...new Set(stores)].sort(),
    rows,
  };
}

/* =======================================================
   DATABASE PREVIEW
======================================================= */

async function loadVaxeronContext() {
  const [
    winesResult,
    aliasesResult,
    mappingsResult,
    locationsResult,
    menusResult,
    menuItemsResult,
  ] = await Promise.all([
    supabase
      .from("wines")
      .select(`
        id,
        name,
        vintage,
        size,
        wine_type,
        price,
        venue_id,
        business_product_number,
        business_barcode
      `),

    supabase
      .from("wine_business_aliases")
      .select(`
        id,
        wine_id,
        business_product_id,
        business_product_number,
        business_barcode,
        business_product_name,
        product_group,
        serving_cl,
        sales_price
      `),

    supabase
      .from("wine_location_store_mappings")
      .select(`
        id,
        business_store_name,
        location_id
      `),

    supabase
      .from("wine_locations")
      .select(`
        id,
        name,
        slug,
        restaurant_id,
        wine_menu_id,
        is_active
      `),

    supabase
      .from("wine_menus")
      .select(`
        id,
        name,
        slug,
        restaurant_id,
        venue_id,
        location_id,
        is_active
      `),

    supabase
      .from("wine_menu_items")
      .select(`
        id,
        wine_menu_id,
        wine_id,
        service_type,
        glass_price,
        price_override
      `),
  ]);

  const results = [
    winesResult,
    aliasesResult,
    mappingsResult,
    locationsResult,
    menusResult,
    menuItemsResult,
  ];

  const failed = results.find((result) => result.error);

  if (failed?.error) {
    throw failed.error;
  }

  return {
    wines: winesResult.data || [],
    aliases: aliasesResult.data || [],
    mappings: mappingsResult.data || [],
    locations: locationsResult.data || [],
    wineMenus: menusResult.data || [],
    menuItems: menuItemsResult.data || [],
  };
}

function buildPreviewRows({
  products,
  storeRows,
  selectedStore,
  context,
}) {
  const productById = new Map();
  const productByBarcode = new Map();
  const productByNumber = new Map();
  const productByName = new Map();

  products.forEach((product) => {
    if (product.productId) {
      productById.set(normalizeIdentifier(product.productId), product);
    }

    if (product.barcode) {
      productByBarcode.set(normalizeIdentifier(product.barcode), product);
    }

    if (product.productNumber) {
      const key = normalizeIdentifier(product.productNumber);

      if (!productByNumber.has(key)) {
        productByNumber.set(key, []);
      }

      productByNumber.get(key).push(product);
    }

    const nameKey = normalizeAccentless(product.productName);

    if (!productByName.has(nameKey)) {
      productByName.set(nameKey, []);
    }

    productByName.get(nameKey).push(product);
  });

  const aliasesByProductId = new Map();
  const aliasesByBarcode = new Map();
  const aliasesByNumber = new Map();

  context.aliases.forEach((alias) => {
    if (alias.business_product_id) {
      aliasesByProductId.set(
        normalizeIdentifier(alias.business_product_id),
        alias
      );
    }

    if (alias.business_barcode) {
      aliasesByBarcode.set(
        normalizeIdentifier(alias.business_barcode),
        alias
      );
    }

    if (alias.business_product_number) {
      const key = normalizeIdentifier(alias.business_product_number);

      if (!aliasesByNumber.has(key)) {
        aliasesByNumber.set(key, []);
      }

      aliasesByNumber.get(key).push(alias);
    }
  });

  const winesById = new Map(context.wines.map((wine) => [wine.id, wine]));

  const mapping =
    context.mappings.find(
      (item) =>
        normalizeAccentless(item.business_store_name) ===
        normalizeAccentless(selectedStore)
    ) || null;

  const location =
    context.locations.find((item) => item.id === mapping?.location_id) || null;

  const wineMenu =
    context.wineMenus.find(
      (menu) =>
        menu.id === location?.wine_menu_id ||
        menu.location_id === location?.id
    ) || null;

  const menuItemIndex = new Map(
    context.menuItems.map((item) => [
      `${item.wine_menu_id}::${item.wine_id}`,
      item,
    ])
  );

  const targetRows = storeRows.filter(
    (row) =>
      normalizeAccentless(row.store) === normalizeAccentless(selectedStore)
  );

  const rows = targetRows.map((balanceRow, index) => {
    let product = null;
    let productMatchMethod = "";

    const barcodeKey = normalizeIdentifier(balanceRow.barcode);
    const numberKey = normalizeIdentifier(balanceRow.productNumber);
    const nameKey = normalizeAccentless(balanceRow.productName);

    if (barcodeKey && productByBarcode.has(barcodeKey)) {
      product = productByBarcode.get(barcodeKey);
      productMatchMethod = "Barcode";
    } else if (
      numberKey &&
      (productByNumber.get(numberKey) || []).length === 1
    ) {
      product = productByNumber.get(numberKey)[0];
      productMatchMethod = "Unique product number";
    } else {
      const nameMatches = productByName.get(nameKey) || [];

      if (nameMatches.length === 1) {
        product = nameMatches[0];
        productMatchMethod = "Exact product name";
      }
    }

    const fallbackFormat = extractFormat(
      balanceRow.productName,
      balanceRow.quantityInMeasureUnit
    );

    const groupIsByTheGlass =
      normalizeAccentless(
        product?.productGroup || balanceRow.productGroup
      ) === "by the glass";

    const resolvedFormat = groupIsByTheGlass
      ? {
          ...(product?.format || fallbackFormat),
          serviceType: "glass",
          bottleCl: null,
          servingCl:
            product?.format?.servingCl ||
            fallbackFormat.servingCl ||
            null,
          label:
            product?.format?.label ||
            fallbackFormat.label ||
            "BTG",
        }
      : product?.format || fallbackFormat;

    const merged = {
      ...(product || {}),
      ...balanceRow,
      productId: product?.productId || "",
      salesPrice: balanceRow.salesPrice || product?.salesPrice || 0,
      costPrice: balanceRow.storagePrice || product?.costPrice || 0,
      vintage: product?.vintage || extractVintage(balanceRow.productName),
      format: resolvedFormat,
      wineType:
        product?.wineType || normalizeWineGroup(balanceRow.productGroup),
    };

    let alias = null;
    let wine = null;
    let wineMatchMethod = "";

    const productIdKey = normalizeIdentifier(merged.productId);

    if (productIdKey && aliasesByProductId.has(productIdKey)) {
      alias = aliasesByProductId.get(productIdKey);
      wineMatchMethod = "CompuCash Product ID";
    } else if (barcodeKey && aliasesByBarcode.has(barcodeKey)) {
      alias = aliasesByBarcode.get(barcodeKey);
      wineMatchMethod = "Alias barcode";
    } else if (
      numberKey &&
      (aliasesByNumber.get(numberKey) || []).length === 1
    ) {
      alias = aliasesByNumber.get(numberKey)[0];
      wineMatchMethod = "Unique alias product number";
    }

    if (alias?.wine_id) {
      wine = winesById.get(alias.wine_id) || null;
    }

    if (!wine && product) {
      const identity = normalizedWineIdentity(product.productName);
      const candidates = context.wines.filter(
        (candidate) =>
          normalizedWineIdentity(candidate.name) === identity &&
          (!product.vintage ||
            !candidate.vintage ||
            Number(candidate.vintage) === Number(product.vintage))
      );

      if (candidates.length === 1) {
        wine = candidates[0];
        wineMatchMethod = "Unique normalized name";
      }
    }

    const existingMenuItem =
      wine && wineMenu
        ? menuItemIndex.get(`${wineMenu.id}::${wine.id}`) || null
        : null;

    let status = "ready_new_wine";

    if (!product) {
      status = "product_unresolved";
    } else if (!mapping || !location) {
      status = "store_unmapped";
    } else if (!wineMenu) {
      status = "menu_missing";
    } else if (wine && existingMenuItem) {
      status = "ready_update";
    } else if (wine) {
      status = "ready_existing_wine";
    }

    return {
      id: `${selectedStore}::${makeProductKey(merged)}::${index}`,
      ...merged,
      productMatchMethod,
      wine,
      wineMatchMethod,
      mapping,
      location,
      wineMenu,
      existingMenuItem,
      status,
    };
  });

  return {
    rows,
    mapping,
    location,
    wineMenu,
  };
}

/* =======================================================
   UI
======================================================= */

function MetricCard({ label, value, detail }) {
  return (
    <div className="rounded-[22px] border border-[#eadfd5] bg-white/75 px-5 py-5">
      <div className="text-[9px] uppercase tracking-[0.2em] text-[#91a1ba]">
        {label}
      </div>
      <div className="mt-3 text-[28px] font-medium leading-none tracking-[-0.035em] text-[#30231f]">
        {value}
      </div>
      <div className="mt-3 text-[10px] text-[#9b8d85]">{detail}</div>
    </div>
  );
}

function UploadCard({
  title,
  description,
  file,
  loading,
  onFile,
  onClear,
}) {
  return (
    <div className="rounded-[24px] border border-[#eadfd5] bg-white/75 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-medium text-[#30231f]">{title}</div>
          <div className="mt-2 max-w-[520px] text-[10px] leading-relaxed text-[#8f8178]">
            {description}
          </div>
        </div>

        {file && (
          <button
            type="button"
            onClick={onClear}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5d8ce] bg-white text-[#8f8178]"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#963b2c] px-4 py-2.5 text-[10px] font-medium text-white transition hover:opacity-90">
        <ArrowUpTrayIcon className="h-4 w-4" />
        {loading ? "Reading..." : file ? "Replace File" : "Select Excel File"}
        <input
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          disabled={loading}
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) {
              onFile(selected);
            }
            event.target.value = "";
          }}
        />
      </label>

      {file && (
        <div className="mt-4 rounded-xl border border-[#eee4dc] bg-[#fcfaf8] px-4 py-3">
          <div className="truncate text-[10px] font-medium text-[#33251f]">
            {file.name}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const config = {
    ready_new_wine: ["New wine", "border-blue-200 bg-blue-50 text-blue-700"],
    ready_existing_wine: [
      "Existing wine",
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    ],
    ready_update: [
      "Menu update",
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    ],
    product_unresolved: [
      "Product unresolved",
      "border-red-200 bg-red-50 text-red-700",
    ],
    store_unmapped: [
      "Store unmapped",
      "border-amber-200 bg-amber-50 text-amber-700",
    ],
    menu_missing: [
      "Menu missing",
      "border-amber-200 bg-amber-50 text-amber-700",
    ],
  };

  const [label, classes] =
    config[status] || ["Review", "border-[#e5d8ce] bg-white text-[#8f8178]"];

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[8px] uppercase tracking-[0.1em] ${classes}`}
    >
      {label}
    </span>
  );
}

export default function WineCatalogueImportPage() {
  const [productsFile, setProductsFile] = useState(null);
  const [balanceFile, setBalanceFile] = useState(null);

  const [products, setProducts] = useState([]);
  const [storeBalanceRows, setStoreBalanceRows] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");

  const [readingProducts, setReadingProducts] = useState(false);
  const [readingBalance, setReadingBalance] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);

  const [context, setContext] = useState(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [includeZeroStock, setIncludeZeroStock] = useState(false);
  const [addToMenu, setAddToMenu] = useState(true);
  const [updateInventory, setUpdateInventory] = useState(true);
  const [updatePrices, setUpdatePrices] = useState(true);
  const [createMissingWines, setCreateMissingWines] = useState(true);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [applyingImport, setApplyingImport] = useState(false);
  const [importResult, setImportResult] = useState(null);

  async function handleProductsFile(file) {
    setReadingProducts(true);
    setError("");

    try {
      const workbook = await readWorkbook(file);
      const parsed = parseProductsWorkbook(workbook);

      setProductsFile(file);
      setProducts(parsed);
      setPage(1);
    } catch (readError) {
      console.error("PRODUCTS REPORT ERROR:", readError);
      setProductsFile(null);
      setProducts([]);
      setError(
        readError?.message || "Unable to read the CompuCash Products report."
      );
    } finally {
      setReadingProducts(false);
    }
  }

  async function handleBalanceFile(file) {
    setReadingBalance(true);
    setError("");

    try {
      const workbook = await readWorkbook(file);
      const parsed = parseStoreBalanceWorkbook(workbook);

      setBalanceFile(file);
      setStoreBalanceRows(parsed.rows);
      setStores(parsed.stores);

      if (!productsFile) {
        setProducts(deriveProductsFromStoreBalance(parsed.rows));
      }

      setSelectedStore((current) =>
        parsed.stores.includes(current) ? current : parsed.stores[0] || ""
      );
      setPage(1);
    } catch (readError) {
      console.error("STORE BALANCE REPORT ERROR:", readError);
      setBalanceFile(null);
      setStoreBalanceRows([]);
      setStores([]);
      setSelectedStore("");
      setError(
        readError?.message ||
          "Unable to read the CompuCash Store Balance report."
      );
    } finally {
      setReadingBalance(false);
    }
  }

  useEffect(() => {
    if (!products.length || !storeBalanceRows.length) {
      setContext(null);
      return;
    }

    let cancelled = false;

    async function loadContext() {
      setLoadingContext(true);
      setError("");

      try {
        const result = await loadVaxeronContext();

        if (!cancelled) {
          setContext(result);
        }
      } catch (contextError) {
        console.error("VAXERON CONTEXT ERROR:", contextError);

        if (!cancelled) {
          setContext(null);
          setError(
            contextError?.message ||
              "Unable to load current Vaxeron wine catalogue data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingContext(false);
        }
      }
    }

    loadContext();

    return () => {
      cancelled = true;
    };
  }, [products.length, storeBalanceRows.length]);

  const preview = useMemo(() => {
    if (!selectedStore || !context) {
      return {
        rows: [],
        mapping: null,
        location: null,
        wineMenu: null,
      };
    }

    return buildPreviewRows({
      products,
      storeRows: storeBalanceRows,
      selectedStore,
      context,
    });
  }, [products, storeBalanceRows, selectedStore, context]);

  const metrics = useMemo(() => {
    const rows = preview.rows;

    return {
      total: rows.length,
      bottles: rows.filter((row) => row.format?.serviceType === "bottle")
        .length,
      glass: rows.filter((row) => row.format?.serviceType === "glass").length,
      positiveStock: rows.filter((row) => Number(row.quantity || 0) > 0)
        .length,
      positiveBottles: rows.filter(
        (row) =>
          row.format?.serviceType === "bottle" &&
          Number(row.quantity || 0) > 0
      ).length,
      positiveGlass: rows.filter(
        (row) =>
          row.format?.serviceType === "glass" &&
          Number(row.quantity || 0) > 0
      ).length,
      zeroStock: rows.filter((row) => Number(row.quantity || 0) === 0).length,
      negativeStock: rows.filter((row) => Number(row.quantity || 0) < 0).length,
      newWines: rows.filter((row) => row.status === "ready_new_wine").length,
      existingWines: rows.filter((row) =>
        ["ready_existing_wine", "ready_update"].includes(row.status)
      ).length,
      unresolved: rows.filter((row) =>
        ["product_unresolved", "store_unmapped", "menu_missing"].includes(
          row.status
        )
      ).length,
    };
  }, [preview.rows]);

  const typeOptions = useMemo(
    () =>
      [...new Set(preview.rows.map((row) => row.wineType).filter(Boolean))]
        .sort(),
    [preview.rows]
  );

  const filteredRows = useMemo(() => {
    const query = normalizeAccentless(search);

    return preview.rows.filter((row) => {
      const matchesSearch =
        !query ||
        [
          row.productName,
          row.productId,
          row.productNumber,
          row.barcode,
          row.productGroup,
          row.wine?.name,
        ].some((value) => normalizeAccentless(value).includes(query));

      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;

      const matchesType = typeFilter === "all" || row.wineType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [preview.rows, search, statusFilter, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const importableRows = useMemo(
    () =>
      preview.rows.filter(
        (row) =>
          !["product_unresolved", "store_unmapped", "menu_missing"].includes(
            row.status
          ) &&
          Number(row.quantity || 0) >= 0
      ),
    [preview.rows]
  );

  async function refreshContext() {
    const result = await loadVaxeronContext();
    setContext(result);
  }

  async function applyImport() {
    if (!preview.location?.id || !preview.wineMenu?.id) {
      setError("The selected store must have a mapped location and wine menu.");
      return;
    }

    setApplyingImport(true);
    setError("");
    setImportResult(null);

    try {
      const payload = importableRows.map((row) => ({
        productId: row.productId || null,
        productNumber: row.productNumber || null,
        barcode: row.barcode || null,
        productName: row.productName,
        productGroup: row.productGroup || null,
        wineType: row.wineType || null,
        vintage: row.vintage || null,
        size: row.format?.label || null,
        serviceType: row.format?.serviceType || "bottle",
        servingCl: row.format?.servingCl || null,
        quantity: Number(row.quantity || 0),
        costPrice: Number(row.costPrice || 0),
        salesPrice: Number(row.salesPrice || 0),
        existingWineId: row.wine?.id || null,
      }));

      const { data, error: rpcError } = await supabase.rpc(
        "apply_compucash_wine_catalogue_import",
        {
          p_location_id: preview.location.id,
          p_wine_menu_id: preview.wineMenu.id,
          p_rows: payload,
          p_options: {
            include_zero_stock: includeZeroStock,
            add_to_menu: addToMenu,
            update_inventory: updateInventory,
            update_prices: updatePrices,
            create_missing_wines: createMissingWines,
            skip_negative_stock: true,
          },
        }
      );

      if (rpcError) {
  const rpcMessage = [
    rpcError.message,
    rpcError.details,
    rpcError.hint,
    rpcError.code ? `Code: ${rpcError.code}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  throw new Error(
    rpcMessage || "The Supabase catalogue import RPC failed."
  );
}

      setImportResult(data || {});
      setShowConfirmation(false);
      await refreshContext();
    } catch (applyError) {
  const message =
    applyError instanceof Error
      ? applyError.message
      : [
          applyError?.message,
          applyError?.details,
          applyError?.hint,
          applyError?.code
            ? `Code: ${applyError.code}`
            : "",
        ]
          .filter(Boolean)
          .join(" | ");

  console.error("CATALOGUE IMPORT ERROR:", {
    message,
    name: applyError?.name,
    code: applyError?.code,
    details: applyError?.details,
    hint: applyError?.hint,
    raw: applyError,
  });

  setError(
    message ||
      "The catalogue import failed. No partial changes should have been saved."
  );
} finally {
      setApplyingImport(false);
    }
  }

  const ready =
    storeBalanceRows.length > 0 &&
    selectedStore &&
    context &&
    !loadingContext;

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 md:px-7">
      {(readingProducts || readingBalance || loadingContext || applyingImport) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#f7f2ec]/90 backdrop-blur-md">
          <div className="flex flex-col items-center text-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#dfd1c6] border-t-[#963b2c]" />
            <div className="mt-5 text-[10px] uppercase tracking-[0.24em] text-[#49352e]">
              {applyingImport ? "Applying Catalogue Import" : "Building Catalogue Preview"}
            </div>
            <div className="mt-2 text-[10px] text-[#9b8d85]">
              {applyingImport
                ? "Updating wines, aliases, inventory and wine menu items"
                : "Reading CompuCash data and current Vaxeron records"}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="so-title">CompuCash Catalogue Import</div>
          <div className="so-sub mt-1">
            Upload a Store Balance on its own, or add a Products report for
            richer catalogue matching before any database changes
          </div>
        </div>

        <div className="rounded-full border border-[#e5d8ce] bg-white/75 px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[#963b2c]">
          {importResult ? "Import applied" : "Preview and apply"}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-[18px] border border-red-200 bg-red-50 px-5 py-4">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <div className="text-[11px] font-medium text-red-700">
              Catalogue preview could not be completed
            </div>
            <div className="mt-1 text-[10px] text-red-600">{error}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <UploadCard
          title="Products report · Optional"
          description="Optional enrichment file. Adds CompuCash Product ID, standard catalogue data and company-wide product details when available."
          file={productsFile}
          loading={readingProducts}
          onFile={handleProductsFile}
          onClear={() => {
            setProductsFile(null);
            setProducts(
              storeBalanceRows.length
                ? deriveProductsFromStoreBalance(storeBalanceRows)
                : []
            );
            setContext(null);
          }}
        />

        <UploadCard
          title="Store Balance report"
          description="Can be imported on its own. Provides product identity, store-by-store quantity, storage price and sales price for Vaxeron inventory."
          file={balanceFile}
          loading={readingBalance}
          onFile={handleBalanceFile}
          onClear={() => {
            setBalanceFile(null);
            setStoreBalanceRows([]);
            setStores([]);
            setSelectedStore("");

            if (!productsFile) {
              setProducts([]);
            }

            setContext(null);
          }}
        />
      </div>

      {storeBalanceRows.length > 0 && (
        <div className="rounded-[24px] border border-[#eadfd5] bg-white/75 p-5">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-[#963b2c]">
                Target store
              </div>
              <div className="mt-2 text-[13px] font-medium text-[#30231f]">
                Choose the CompuCash store to preview
              </div>
            </div>

            <select
              value={selectedStore}
              onChange={(event) => {
                setSelectedStore(event.target.value);
                setPage(1);
              }}
              className="min-w-[280px] rounded-xl border border-[#e7ddd4] bg-white px-4 py-3 text-[10px] text-[#33251f] outline-none focus:border-[#c8aa91]"
            >
              {stores.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
          </div>

          {ready && (
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-[16px] border border-[#eee4dc] bg-[#fcfaf8] px-4 py-3">
                <div className="text-[8px] uppercase tracking-[0.16em] text-[#9a8b83]">
                  Vaxeron location
                </div>
                <div className="mt-2 text-[11px] font-medium text-[#33251f]">
                  {preview.location?.name || "Not mapped"}
                </div>
              </div>

              <div className="rounded-[16px] border border-[#eee4dc] bg-[#fcfaf8] px-4 py-3">
                <div className="text-[8px] uppercase tracking-[0.16em] text-[#9a8b83]">
                  Wine menu
                </div>
                <div className="mt-2 text-[11px] font-medium text-[#33251f]">
                  {preview.wineMenu?.name || "No wine menu linked"}
                </div>
              </div>

              <div className="rounded-[16px] border border-[#eee4dc] bg-[#fcfaf8] px-4 py-3">
                <div className="text-[8px] uppercase tracking-[0.16em] text-[#9a8b83]">
                  Write status
                </div>
                <div className="mt-2 text-[11px] font-medium text-[#33251f]">
                  Disabled — dry-run preview
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {ready && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricCard
              label="Positive Bottles"
              value={formatNumber(metrics.positiveBottles)}
              detail="Bottle products with positive venue stock"
            />
            <MetricCard
              label="Positive BTG"
              value={formatNumber(metrics.positiveGlass)}
              detail="By-the-glass products with positive venue stock"
            />
            <MetricCard
              label="Zero Stock"
              value={formatNumber(metrics.zeroStock)}
              detail="Catalogue candidates not published by default"
            />
            <MetricCard
              label="Negative Stock"
              value={formatNumber(metrics.negativeStock)}
              detail="Excluded from import and flagged for reconciliation"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <MetricCard
              label="New Wines"
              value={formatNumber(metrics.newWines)}
              detail="No existing Vaxeron wine identity was resolved"
            />
            <MetricCard
              label="Existing Wines"
              value={formatNumber(metrics.existingWines)}
              detail="Resolved through alias or unique wine identity"
            />
            <MetricCard
              label="Needs Review"
              value={formatNumber(metrics.unresolved)}
              detail="Product, store mapping or wine menu is unresolved"
            />
          </div>

          {importResult && (
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/80 p-5">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <div className="text-[12px] font-medium text-emerald-800">
                    Catalogue import completed
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                    {[
                      ["Wines created", importResult.wines_created],
                      ["Wines reused", importResult.wines_reused],
                      ["Aliases created", importResult.aliases_created],
                      ["Inventory updated", Number(importResult.inventory_created || 0) + Number(importResult.inventory_updated || 0)],
                      ["Menu items created", importResult.menu_items_created],
                      ["Menu items updated", importResult.menu_items_updated],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-emerald-200 bg-white/70 px-3 py-3">
                        <div className="text-[8px] uppercase tracking-[0.12em] text-emerald-700">
                          {label}
                        </div>
                        <div className="mt-2 text-[18px] font-medium text-emerald-900">
                          {formatNumber(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[24px] border border-[#eadfd5] bg-white/80 p-5">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <div className="so-title">Apply Import</div>
                <div className="so-sub mt-1">
                  Write approved rows to the selected location and wine menu
                </div>
              </div>

              <button
                type="button"
                disabled={
                  applyingImport ||
                  metrics.unresolved > 0 ||
                  !preview.location ||
                  !preview.wineMenu ||
                  importableRows.length === 0
                }
                onClick={() => setShowConfirmation(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#963b2c] px-5 py-3 text-[10px] font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Apply {formatNumber(importableRows.length)} Rows
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  label: "Create missing wines",
                  value: createMissingWines,
                  setter: setCreateMissingWines,
                },
                {
                  label: "Update inventory",
                  value: updateInventory,
                  setter: setUpdateInventory,
                },
                {
                  label: "Update prices",
                  value: updatePrices,
                  setter: setUpdatePrices,
                },
                {
                  label: "Add to venue menu",
                  value: addToMenu,
                  setter: setAddToMenu,
                },
                {
                  label: "Publish zero stock",
                  value: includeZeroStock,
                  setter: setIncludeZeroStock,
                },
              ].map((option) => (
                <label
                  key={option.label}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-[16px] border border-[#eee4dc] bg-[#fcfaf8] px-4 py-3"
                >
                  <span className="text-[9px] font-medium text-[#49352e]">
                    {option.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={option.value}
                    onChange={(event) => option.setter(event.target.checked)}
                    className="h-4 w-4 accent-[#963b2c]"
                  />
                </label>
              ))}
            </div>

            <div className="mt-4 text-[9px] leading-relaxed text-[#9b8d85]">
              Negative-stock rows are always excluded. Zero-stock wines can be
              created in the catalogue without appearing on the public menu.
            </div>
          </div>

          <div className="rounded-[18px] border border-[#eadfd5] bg-white/75 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91a1ba]" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search wine, Product ID, number or barcode..."
                  className="w-full rounded-xl border border-[#e7ddd4] bg-white py-2.5 pl-10 pr-4 text-[10px] text-[#33251f] outline-none focus:border-[#c8aa91]"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[#e7ddd4] bg-white px-4 py-2.5 text-[10px] text-[#66564e] outline-none"
              >
                <option value="all">All Wine Types</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-[#e7ddd4] bg-white px-4 py-2.5 text-[10px] text-[#66564e] outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="ready_new_wine">New wine</option>
                <option value="ready_existing_wine">Existing wine</option>
                <option value="ready_update">Menu update</option>
                <option value="product_unresolved">Product unresolved</option>
                <option value="store_unmapped">Store unmapped</option>
                <option value="menu_missing">Menu missing</option>
              </select>

              <div className="whitespace-nowrap text-[9px] text-[#91a1ba]">
                {formatNumber(filteredRows.length)} records
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#eadfd5] bg-white/80">
            <div className="border-b border-[#eadfd5] px-5 py-4">
              <div className="so-title">Import Preview</div>
              <div className="so-sub mt-1">
                Review every row before using Apply Import
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px]">
                <thead className="bg-[#faf7f3]">
                  <tr className="text-left text-[8px] uppercase tracking-[0.14em] text-[#9a8b83]">
                    <th className="px-5 py-3 font-medium">Wine</th>
                    <th className="px-4 py-3 font-medium">Group</th>
                    <th className="px-4 py-3 font-medium">Format</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium">Sales price</th>
                    <th className="px-4 py-3 font-medium">Vaxeron match</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eee5de]">
                  {pageRows.map((row) => (
                    <tr key={row.id} className="align-top hover:bg-[#fcfaf8]">
                      <td className="px-5 py-4">
                        <div className="max-w-[390px] text-[10px] font-medium text-[#33251f]">
                          {row.productName}
                        </div>
                        <div className="mt-1 text-[8px] text-[#9b8d85]">
                          ID {row.productId || "—"} · Product{" "}
                          {row.productNumber || "—"} · {row.barcode || "No barcode"}
                        </div>
                        <div className="mt-1 text-[8px] text-[#b0a198]">
                          Product match: {row.productMatchMethod || "Unresolved"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-[9px] text-[#66564e]">
                          {row.productGroup}
                        </div>
                        <div className="mt-1 text-[8px] capitalize text-[#9b8d85]">
                          {row.wineType}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-[9px] capitalize text-[#66564e]">
                          {row.format?.serviceType || "bottle"}
                        </div>
                        <div className="mt-1 text-[8px] text-[#9b8d85]">
                          {row.format?.label || "Size unknown"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-[10px] font-medium text-[#33251f]">
                          {formatNumber(row.quantity)}
                        </div>
                        <div className="mt-1 text-[8px] text-[#9b8d85]">
                          Cost €{formatCurrency(row.costPrice)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-[10px] font-medium text-[#33251f]">
                          €{formatCurrency(row.salesPrice)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="max-w-[240px] text-[9px] font-medium text-[#33251f]">
                          {row.wine?.name || "New Vaxeron wine"}
                        </div>
                        <div className="mt-1 text-[8px] text-[#9b8d85]">
                          {row.wineMatchMethod || "No existing match"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <StatusPill status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!pageRows.length && (
                <div className="px-6 py-16 text-center">
                  <CheckCircleIcon className="mx-auto h-7 w-7 text-[#b9aaa1]" />
                  <div className="mt-4 text-[11px] font-medium text-[#33251f]">
                    No records match these filters
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="text-[9px] text-[#9b8d85]">
              Page {safePage} of {pageCount} · {PAGE_SIZE} rows per page
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="so-btn-ghost disabled:opacity-35"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={safePage === pageCount}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
                className="so-btn-ghost disabled:opacity-35"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {showConfirmation && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#2f231f]/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[560px] rounded-[28px] border border-[#eadfd5] bg-[#fffdfb] p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-[#963b2c]" />
              <div>
                <div className="text-[16px] font-medium text-[#30231f]">
                  Apply catalogue import?
                </div>
                <div className="mt-3 text-[10px] leading-relaxed text-[#7f7068]">
                  This will update the Vaxeron catalogue, aliases, inventory and
                  wine menu for <strong>{selectedStore}</strong>. The database
                  function runs as one transaction.
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#eee4dc] bg-[#fcfaf8] px-4 py-3">
                <div className="text-[8px] uppercase tracking-[0.14em] text-[#9a8b83]">
                  Import rows
                </div>
                <div className="mt-2 text-[18px] font-medium text-[#33251f]">
                  {formatNumber(importableRows.length)}
                </div>
              </div>
              <div className="rounded-xl border border-[#eee4dc] bg-[#fcfaf8] px-4 py-3">
                <div className="text-[8px] uppercase tracking-[0.14em] text-[#9a8b83]">
                  Negative excluded
                </div>
                <div className="mt-2 text-[18px] font-medium text-[#33251f]">
                  {formatNumber(metrics.negativeStock)}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={applyingImport}
                onClick={() => setShowConfirmation(false)}
                className="so-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={applyingImport}
                onClick={applyImport}
                className="inline-flex items-center gap-2 rounded-xl bg-[#963b2c] px-5 py-3 text-[10px] font-medium text-white disabled:opacity-40"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 ${applyingImport ? "animate-spin" : ""}`}
                />
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      )}

      {!productsFile && !balanceFile && (
        <div className="flex min-h-[220px] items-center justify-center rounded-[28px] border border-[#eadfd5] bg-white/60 px-8 py-12 text-center">
          <div className="max-w-[560px]">
            <DocumentChartBarIcon className="mx-auto h-7 w-7 text-[#963b2c]" />
            <div className="mt-5 text-[14px] font-medium text-[#30231f]">
              Upload a CompuCash Store Balance report
            </div>
            <div className="mt-3 text-[10px] leading-relaxed text-[#8f8178]">
              A Store Balance report is enough to build the inventory preview.
              The Products report is optional enrichment. Apply Import remains
              disabled until the selected store resolves to a valid location
              and wine menu.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}