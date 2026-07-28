"use client";

export const dynamic = "force-dynamic";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@supabase/supabase-js";

import {
  buildWineBusinessLinks,
  linkExactWineBusinessIds,
  reconcileWineInventory,
  applyWineInventoryReconciliation,
} from "@/lib/wineReconciliation";

import * as XLSX from "xlsx";

import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

/* =======================================================
   HELPERS
======================================================= */

function normalize(value) {
  return String(value ?? "")
    .trim();
}

function normalizeLower(value) {
  return normalize(value)
    .toLowerCase();
}

function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  const cleaned = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  const parsed = Number(cleaned);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function formatNumber(value) {
  return Number(value || 0)
    .toLocaleString("en-GB", {
      maximumFractionDigits: 2,
    });
}

function formatCurrency(value) {
  return Number(value || 0)
    .toLocaleString("en-IE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
}

function findColumn(
  row,
  candidates
) {
  if (!row) {
    return undefined;
  }

  const keys = Object.keys(row);

  const matchedKey = keys.find(
    (key) => {
      const normalizedKey =
        normalizeLower(key);

      return candidates.some(
        (candidate) =>
          normalizedKey ===
          normalizeLower(candidate)
      );
    }
  );

  if (!matchedKey) {
    return undefined;
  }

  return row[matchedKey];
}

function isUsefulRow(row) {
  const productName = normalize(
    findColumn(row, [
      "Product",
      "Product name",
      "Wine",
      "Name",
    ])
  );

  const productNumber = normalize(
    findColumn(row, [
      "Product number",
      "Product No.",
      "Product No",
      "SKU",
      "Code",
    ])
  );

  const barcode = normalize(
    findColumn(row, [
      "Barcode",
      "EAN",
    ])
  );

  return Boolean(
    productName ||
    productNumber ||
    barcode
  );
}

function detectStore(row) {
  return normalize(
    findColumn(row, [
      "Store",
      "Warehouse",
      "Location",
      "Stock location",
    ])
  );
}

function detectProductGroup(row) {
  return normalize(
    findColumn(row, [
      "Product group",
      "Group",
      "Category",
    ])
  );
}

function parseInventoryRow(
  row,
  index
) {
  const productNumber = normalize(
    findColumn(row, [
      "Product number",
      "Product No.",
      "Product No",
      "SKU",
      "Code",
    ])
  );

  const barcode = normalize(
    findColumn(row, [
      "Barcode",
      "EAN",
    ])
  );

  const productName = normalize(
    findColumn(row, [
      "Product",
      "Product name",
      "Wine",
      "Name",
    ])
  );

  const store = detectStore(row);

  const productGroup =
    detectProductGroup(row);

  const costPrice = toNumber(
    findColumn(row, [
      "Cost price",
      "Cost Price",
      "Purchase price",
    ])
  );

  const initialStock = toNumber(
    findColumn(row, [
      "Initial stock",
      "Opening stock",
    ])
  );

  const finalStock = toNumber(
    findColumn(row, [
      "Final stock",
      "Closing stock",
      "Store balance",
      "Balance",
    ])
  );

  const quantity = toNumber(
    findColumn(row, [
      "Quantity",
      "Qty",
    ])
  );

  const transactionType = normalize(
    findColumn(row, [
      "Transaction type",
      "Transaction",
      "Type",
    ])
  );

  const document = normalize(
    findColumn(row, [
      "Document",
      "Document number",
      "Reference",
    ])
  );

  const date = normalize(
    findColumn(row, [
      "Date",
      "Transaction date",
    ])
  );

  return {
    id: `${index}-${productNumber}-${barcode}`,

    sourceRow: index + 2,

    productNumber,

    barcode,

    productName,

    store,

    productGroup,

    costPrice,

    initialStock,

    finalStock,

    quantity,

    transactionType,

    document,

    date,
  };
}

/* =======================================================
   METRIC
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
        rounded-[22px]
        px-5
        py-5
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

      <div
        className="
          mt-3
          text-[10px]
          text-[#9b8d85]
        "
      >
        {detail}
      </div>
    </div>
  );
}

/* =======================================================
   PAGE
======================================================= */

export default function WineReconciliationPage() {
  const [file, setFile] =
    useState(null);

  const [sheetName, setSheetName] =
    useState("");

  const [rows, setRows] =
    useState([]);

  const [
    btgVenueSuggestionCount,
    setBtgVenueSuggestionCount,
  ] = useState(0);

  const [rawRowCount, setRawRowCount] =
    useState(0);

  const [reading, setReading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [storeFilter, setStoreFilter] =
    useState("all");

    const [
  reconciliation,
  setReconciliation,
] = useState([]);

const [
  reconciliationMetrics,
  setReconciliationMetrics,
] = useState(null);

const [matching, setMatching] =
  useState(false);

const [
  matchingError,
  setMatchingError,
] = useState("");

const [
  businessLinks,
  setBusinessLinks,
] = useState([]);

const [
  businessLinkMetrics,
  setBusinessLinkMetrics,
] = useState(null);

const [
  linkingAnalysis,
  setLinkingAnalysis,
] = useState(false);

const [
  linkingWines,
  setLinkingWines,
] = useState(false);

const [
  businessLinkError,
  setBusinessLinkError,
] = useState("");

const [
  businessLinkMessage,
  setBusinessLinkMessage,
] = useState("");

const [applyingInventory, setApplyingInventory] = useState(false);
const [applyInventoryError, setApplyInventoryError] = useState("");
const [applyInventoryMessage, setApplyInventoryMessage] = useState("");

const [activeWorkspace, setActiveWorkspace] = useState("overview");
const [workspacePage, setWorkspacePage] = useState(1);
const WORKSPACE_PAGE_SIZE = 50;

const [manualLinkRow, setManualLinkRow] = useState(null);
const [manualWineSearch, setManualWineSearch] = useState("");
const [manualWineOptions, setManualWineOptions] = useState([]);
const [loadingManualWines, setLoadingManualWines] = useState(false);
const [savingManualLink, setSavingManualLink] = useState(false);
const [creatingManualWine, setCreatingManualWine] = useState(false);
const [manualLinkError, setManualLinkError] = useState("");

  /* =====================================================
     READ EXCEL
  ===================================================== */

  async function readExcel(selectedFile) {
    if (!selectedFile) {
      return;
    }

    setReading(true);
    setError("");
    setRows([]);
    setRawRowCount(0);
    setSheetName("");

    await new Promise((resolve) =>
      setTimeout(resolve, 100)
    );

    try {
      const buffer =
        await selectedFile.arrayBuffer();

      const workbook =
        XLSX.read(buffer, {
          type: "array",
          cellDates: true,
        });

      if (
        !workbook.SheetNames ||
        workbook.SheetNames.length === 0
      ) {
        throw new Error(
          "No worksheets were found in this Excel file."
        );
      }

      const currentSheetName =
        workbook.SheetNames[0];

      const worksheet =
        workbook.Sheets[currentSheetName];

      const matrix =
        XLSX.utils.sheet_to_json(
          worksheet,
          {
            header: 1,
            defval: "",
            raw: false,
          }
        );

      setRawRowCount(matrix.length);
      setSheetName(currentSheetName);

      const normalizedMatrix =
        matrix.map((row) =>
          row.map((cell) =>
            normalizeLower(cell)
          )
        );

      const inventoryHeaderIndex =
        normalizedMatrix.findIndex(
          (cells) =>
            cells.includes("product number") &&
            cells.includes("transaction type") &&
            cells.includes("initial stock") &&
            cells.includes("final stock") &&
            cells.includes("store balance")
        );

      const productsHeaderIndex =
        normalizedMatrix.findIndex(
          (cells) =>
            cells.includes("product name") &&
            cells.includes("product id") &&
            cells.includes("product number") &&
            cells.includes("product group") &&
            cells.includes("sales price") &&
            cells.includes(
              "total quantity in stores"
            )
        );

      let parsedRows = [];
      let reportType = "";

      /* ===================================================
         BOMBAY INVENTORY REPORT
      =================================================== */

      if (inventoryHeaderIndex !== -1) {
        reportType = "inventory";

        let currentStore = "";
        let currentProductGroup = "";

        const dataRows =
          matrix.slice(
            inventoryHeaderIndex + 1
          );

        dataRows.forEach(
          (row, rowIndex) => {
            const column1 =
              normalize(row[0]);

            const column2 =
              normalize(row[1]);

            const column3 =
              normalize(row[2]);

            const productNumber =
              normalize(row[3]);

            const barcode =
              normalize(row[4]);

            const from =
              normalize(row[5]);

            const to =
              normalize(row[6]);

            const date =
              normalize(row[7]);

            const transactionType =
              normalize(row[8]);

            const document =
              normalize(row[9]);

            const quantity =
              toNumber(row[10]);

            const costPrice =
              toNumber(row[11]);

            const totalAmount =
              toNumber(row[12]);

            const difference =
              toNumber(row[13]);

            const initialStock =
              toNumber(row[14]);

            const finalStock =
              toNumber(row[15]);

            const storeBalance =
              toNumber(row[16]);

            if (
              normalizeLower(column1) ===
              "total"
            ) {
              return;
            }

            const isStoreRow =
              Boolean(column1) &&
              !column2 &&
              !column3;

            if (isStoreRow) {
              currentStore = column1;
              currentProductGroup = "";
              return;
            }

            const isProductGroupRow =
              !column1 &&
              Boolean(column2) &&
              !column3;

            if (isProductGroupRow) {
              currentProductGroup = column2;
              return;
            }

            const isProductRow =
              !column1 &&
              !column2 &&
              Boolean(column3);

            if (!isProductRow) {
              return;
            }

            parsedRows.push({
              id: [
                inventoryHeaderIndex +
                  rowIndex +
                  2,
                currentStore,
                currentProductGroup,
                productNumber,
                column3,
              ].join("-"),

              sourceRow:
                inventoryHeaderIndex +
                rowIndex +
                2,

              productNumber,
              barcode,
              productName: column3,
              store: currentStore,
              productGroup:
                currentProductGroup,
              from,
              to,
              date,
              transactionType,
              document,
              quantity,
              costPrice,
              totalAmount,
              difference,
              initialStock,
              finalStock,
              storeBalance,
              reportType: "inventory",
            });
          }
        );
      }

      /* ===================================================
         BOMBAY PRODUCTS REPORT
      =================================================== */

      if (
        inventoryHeaderIndex === -1 &&
        productsHeaderIndex !== -1
      ) {
        reportType = "products";

        const headers =
          matrix[productsHeaderIndex].map(
            (cell) => normalize(cell)
          );

        const productObjects =
          XLSX.utils.sheet_to_json(
            worksheet,
            {
              range:
                productsHeaderIndex,
              defval: "",
              raw: false,
            }
          );

        parsedRows = productObjects
          .map((row, rowIndex) => {
            const productName =
              normalize(
                findColumn(row, [
                  "Product name",
                  "Product",
                  "Wine",
                  "Name",
                ])
              );

            const productId =
              normalize(
                findColumn(row, [
                  "Product ID",
                  "Product Id",
                ])
              );

            const productNumber =
              normalize(
                findColumn(row, [
                  "Product number",
                  "Product No.",
                  "Product No",
                  "SKU",
                  "Code",
                ])
              );

            const barcode =
              normalize(
                findColumn(row, [
                  "Barcode",
                  "EAN",
                ])
              );

            const productGroup =
              detectProductGroup(row);

            const store =
              detectStore(row);

            const salesPrice =
              toNumber(
                findColumn(row, [
                  "Sales price",
                  "Sale price",
                  "Selling price",
                  "Price",
                ])
              );

            const totalQuantityInStores =
              toNumber(
                findColumn(row, [
                  "Total quantity in stores",
                  "Total quantity",
                  "Total stock",
                ])
              );

            const lastIncomePrice =
              toNumber(
                findColumn(row, [
                  "Last income price",
                  "Last purchase price",
                ])
              );

            const weightedAveragePrice =
              toNumber(
                findColumn(row, [
                  "Weighted average price",
                  "Average price",
                ])
              );

            return {
              id: [
                "products",
                productsHeaderIndex +
                  rowIndex +
                  2,
                productId,
                productNumber,
                productName,
              ].join("-"),

              sourceRow:
                productsHeaderIndex +
                rowIndex +
                2,

              productId,
              productNumber,
              barcode,
              productName,
              store,
              productGroup,
              salesPrice,
              quantity:
                totalQuantityInStores,
              totalQuantityInStores,
              costPrice:
                weightedAveragePrice ||
                lastIncomePrice,
              lastIncomePrice,
              weightedAveragePrice,
              initialStock: 0,
              finalStock:
                totalQuantityInStores,
              storeBalance:
                totalQuantityInStores,
              transactionType: "",
              document: "",
              date: "",
              from: "",
              to: "",
              reportType: "products",
            };
          })
          .filter((row) =>
            Boolean(
              row.productName ||
              row.productNumber ||
              row.barcode
            )
          );

        console.log(
          "BOMBAY PRODUCTS DEBUG:",
          {
            sheet: currentSheetName,
            headerRow:
              productsHeaderIndex + 1,
            matrixRows: matrix.length,
            productsDetected:
              parsedRows.length,
            groupsDetected: [
              ...new Set(
                parsedRows
                  .map(
                    (row) =>
                      row.productGroup
                  )
                  .filter(Boolean)
              ),
            ],
            btgDetected:
              parsedRows.filter(
                (row) =>
                  normalizeLower(
                    row.productGroup
                  ) === "by the glass"
              ).length,
            firstProduct:
              parsedRows[0],
          }
        );
      }

      if (!reportType) {
        throw new Error(
          "Vaxeron could not identify this Bombay Excel export. Upload either the Inventory report or Products report."
        );
      }

      if (parsedRows.length === 0) {
        throw new Error(
          reportType === "inventory"
            ? "Bombay inventory report detected, but no product rows could be parsed."
            : "Bombay products report detected, but no product rows could be parsed."
        );
      }

      if (reportType === "inventory") {
        console.log(
          "BOMBAY INVENTORY DEBUG:",
          {
            sheet: currentSheetName,
            headerRow:
              inventoryHeaderIndex + 1,
            matrixRows: matrix.length,
            productsDetected:
              parsedRows.length,
            storesDetected: [
              ...new Set(
                parsedRows
                  .map(
                    (row) => row.store
                  )
                  .filter(Boolean)
              ),
            ],
            groupsDetected: [
              ...new Set(
                parsedRows
                  .map(
                    (row) =>
                      row.productGroup
                  )
                  .filter(Boolean)
              ),
            ],
            firstProduct:
              parsedRows[0],
          }
        );
      }

      console.log(
        "VAXERON REPORT TYPE:",
        {
          type: reportType,
          rows: parsedRows.length,
          sheet: currentSheetName,
        }
      );

      setRows(parsedRows);
      setFile(selectedFile);
    } catch (readError) {
      console.error(
        "EXCEL READ ERROR:",
        readError
      );

      setError(
        readError?.message ||
        "Unable to read this Bombay report."
      );

      setFile(null);
    } finally {
      setReading(false);
    }
  }


/* =====================================================
   BUSINESS LINKING ANALYSIS
===================================================== */

useEffect(() => {

  if (
    !file ||
    rows.length === 0
  ) {

    setBusinessLinks([]);

    setBusinessLinkMetrics(null);

    setBusinessLinkError("");

    setBusinessLinkMessage("");

    return;

  }

  let cancelled = false;

  async function runBusinessLinking() {

    setLinkingAnalysis(true);

    setBusinessLinkError("");

    try {

      const supabase =
        createClient(

          process.env
            .NEXT_PUBLIC_SUPABASE_URL,

          process.env
            .NEXT_PUBLIC_SUPABASE_ANON_KEY

        );

      const result =
        await buildWineBusinessLinks({

          supabase,

          reportRows: rows,

        });

      if (cancelled) {
        return;
      }

      setBusinessLinks(
        result.rows || []
      );

      setBusinessLinkMetrics(
        result.metrics || null
      );

    } catch (linkError) {

      console.error(
        "BUSINESS LINKING ERROR:",
        linkError
      );

      if (!cancelled) {

        setBusinessLinkError(

          linkError?.message ||

          "Unable to analyse business wine identifiers."

        );

        setBusinessLinks([]);

        setBusinessLinkMetrics(null);

      }

    } finally {

      if (!cancelled) {

        setLinkingAnalysis(false);

      }

    }

  }

  runBusinessLinking();

  return () => {

    cancelled = true;

  };

}, [
  file,
  rows,
]);
/* =====================================================
   LIVE VAXERON RECONCILIATION
===================================================== */

useEffect(() => {

  if (
    !file ||
    rows.length === 0
  ) {

    setReconciliation([]);

    setReconciliationMetrics(
      null
    );

    setMatchingError("");

    return;

  }

  let cancelled = false;

  async function runReconciliation() {

    setMatching(true);

    setMatchingError("");

    try {

      const supabase =
        createClient(

          process.env
            .NEXT_PUBLIC_SUPABASE_URL,

          process.env
            .NEXT_PUBLIC_SUPABASE_ANON_KEY

        );

      const result =
        await reconcileWineInventory({

          supabase,

          reportRows: rows,

        });

      if (cancelled) {
        return;
      }

      setReconciliation(
        result.rows || []
      );

      setReconciliationMetrics(
        result.metrics || null
      );

      if (!cancelled) {
        setBtgVenueSuggestionCount(
          rows[0]?.reportType ===
            "products"
            ? Number(
                result.btgSuggestions
                  ?.detected || 0
              )
            : 0
        );
      }

    } catch (
      reconciliationError
    ) {

      console.error(

        "RECONCILIATION ERROR:",

        reconciliationError

      );

      if (!cancelled) {

        setMatchingError(

          reconciliationError
            ?.message ||

          "Unable to compare this report with Vaxeron."

        );

        setReconciliation([]);

        setReconciliationMetrics(
          null
        );

      }

    } finally {

      if (!cancelled) {

        setMatching(false);

      }

    }

  }

  runReconciliation();

  return () => {

    cancelled = true;

  };

}, [
  file,
  rows,
]);

  /* =====================================================
     STORES
  ===================================================== */

  const stores = useMemo(() => {
    return [
      ...new Set(
        rows
          .map(
            (row) =>
              normalize(row.store)
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [rows]);

  /* =====================================================
     PRODUCT GROUPS
  ===================================================== */

  const productGroups =
    useMemo(() => {
      return [
        ...new Set(
          rows
            .map(
              (row) =>
                normalize(
                  row.productGroup
                )
            )
            .filter(Boolean)
        ),
      ].sort();
    }, [rows]);

  /* =====================================================
     UNIQUE PRODUCTS
  ===================================================== */

  const uniqueProducts =
    useMemo(() => {
      const productMap =
        new Map();

      rows.forEach((row) => {
        const key =
          row.productNumber ||
          row.barcode ||
          normalizeLower(
            row.productName
          );

        if (!key) {
          return;
        }

        if (
          !productMap.has(key)
        ) {
          productMap.set(
            key,
            row
          );
        }
      });

      return [
        ...productMap.values(),
      ];
    }, [rows]);

  /* =====================================================
     REPORT VALUE
  ===================================================== */

  const reportValue =
    useMemo(() => {
      return rows.reduce(
        (sum, row) =>
          sum +
          (
            Number(
              row.finalStock || 0
            ) *
            Number(
              row.costPrice || 0
            )
          ),
        0
      );
    }, [rows]);

  /* =====================================================
     FINAL STOCK
  ===================================================== */

  const finalStockTotal =
    useMemo(() => {
      return rows.reduce(
        (sum, row) =>
          sum +
          Number(
            row.finalStock || 0
          ),
        0
      );
    }, [rows]);

  /* =====================================================
     FILTER
  ===================================================== */

  const filteredRows =
    useMemo(() => {
      const query =
        normalizeLower(search);

      return rows.filter(
        (row) => {
          const matchesSearch =
            !query ||

            [
              row.productName,
              row.productNumber,
              row.barcode,
              row.store,
              row.productGroup,
            ].some((value) =>
              normalizeLower(
                value
              ).includes(query)
            );

          const matchesStore =
            storeFilter === "all" ||

            row.store ===
              storeFilter;

          return (
            matchesSearch &&
            matchesStore
          );
        }
      );
    }, [
      rows,
      search,
      storeFilter,
    ]);

    /* =====================================================
   SAFE EXACT BUSINESS LINKS
===================================================== */

const safeExactBusinessLinks =
useMemo(() => {

  const exactRows =
    businessLinks.filter(
      (row) =>
        row.status === "exact" &&
        row.wine?.id
    );

  const wineUsage = new Map();

  exactRows.forEach((row) => {

    const wineId = row.wine.id;

    wineUsage.set(
      wineId,
      (
        wineUsage.get(wineId) || 0
      ) + 1
    );

  });

  return exactRows.filter(
    (row) =>
      wineUsage.get(
        row.wine.id
      ) === 1
  );

}, [
  businessLinks,
]);

const exactLinkConflicts =
useMemo(() => {

  return (
    Number(
      businessLinkMetrics?.exact || 0
    ) -
    safeExactBusinessLinks.length
  );

}, [
  businessLinkMetrics,
  safeExactBusinessLinks,
]);
    /* =====================================================
   RECONCILIATION FILTER
===================================================== */

const filteredReconciliation =
useMemo(() => {

  const query =
    normalizeLower(search);

  return reconciliation.filter(
    (row) => {

      const matchesSearch =

        !query ||

        [

          row.productName,

          row.productNumber,

          row.barcode,

          row.store,

          row.productGroup,

          row.wine?.name,

        ].some((value) =>

          normalizeLower(
            value
          ).includes(query)

        );

      const matchesStore =

        storeFilter === "all" ||

        row.store ===
          storeFilter;

      return (

        matchesSearch &&

        matchesStore

      );

    }
  );

}, [

  reconciliation,

  search,

  storeFilter,

]);

/* =====================================================
   LINK EXACT BUSINESS WINES
===================================================== */

async function linkExactMatches() {

  if (
    safeExactBusinessLinks.length === 0 ||
    linkingWines
  ) {
    return;
  }

  const confirmed = window.confirm(

    `Link ${safeExactBusinessLinks.length} exact business wine matches to Vaxeron?\n\nOnly business product numbers and barcodes will be updated. Inventory quantities will not change.`

  );

  if (!confirmed) {
    return;
  }

  setLinkingWines(true);

  setBusinessLinkError("");

  setBusinessLinkMessage("");

  try {

    const supabase =
      createClient(

        process.env
          .NEXT_PUBLIC_SUPABASE_URL,

        process.env
          .NEXT_PUBLIC_SUPABASE_ANON_KEY

      );

    const result =
      await linkExactWineBusinessIds({

        supabase,

        linkRows:
          safeExactBusinessLinks,

      });

    if (result.failed > 0) {

      throw new Error(

        `${result.failed} wine links could not be saved.`

      );

    }

    setBusinessLinkMessage(

      `${result.linked} wine identifiers linked successfully.`

    );

    const linkingResult =
      await buildWineBusinessLinks({

        supabase,

        reportRows: rows,

      });

    setBusinessLinks(
      linkingResult.rows || []
    );

    setBusinessLinkMetrics(
      linkingResult.metrics || null
    );

    const reconciliationResult =
      await reconcileWineInventory({

        supabase,

        reportRows: rows,

      });

    setReconciliation(
      reconciliationResult.rows || []
    );

    setReconciliationMetrics(
      reconciliationResult.metrics || null
    );

  } catch (linkError) {

    console.error(
      "LINK EXACT MATCHES ERROR:",
      linkError
    );

    setBusinessLinkError(

      linkError?.message ||

      "Unable to save exact business wine links."

    );

  } finally {

    setLinkingWines(false);

  }

}

/* =====================================================
   APPLY INVENTORY RECONCILIATION
===================================================== */

async function applyInventoryChanges() {
  if (
    applyingInventory ||
    !reconciliationMetrics ||
    Number(reconciliationMetrics.changes || 0) === 0
  ) {
    return;
  }

  const confirmed = window.confirm(
    `Apply ${formatNumber(reconciliationMetrics.changes)} inventory changes to Vaxeron?\n\nThis will replace Vaxeron wine quantities with the closing stock from the imported business inventory report for all matched wine/location records.`
  );

  if (!confirmed) {
    return;
  }

  setApplyingInventory(true);
  setApplyInventoryError("");
  setApplyInventoryMessage("");

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const result = await applyWineInventoryReconciliation({
      supabase,
      reconciliationRows: reconciliation,
    });

    if (result.failed > 0) {
      console.error(
  "FIRST INVENTORY APPLY ERROR:",
  JSON.stringify(
    result.errors?.[0],
    null,
    2
  )
);
      throw new Error(
        `${result.failed} inventory records could not be updated. ${result.updated} records were updated successfully.`
      );
    }

    setApplyInventoryMessage(
      `${formatNumber(result.updated)} inventory records updated successfully. ${formatNumber(result.movements)} reconciliation movements logged.`
    );

    const reconciliationResult = await reconcileWineInventory({
      supabase,
      reportRows: rows,
    });

    setReconciliation(reconciliationResult.rows || []);
    setReconciliationMetrics(reconciliationResult.metrics || null);
  } catch (applyError) {
    console.error("APPLY INVENTORY RECONCILIATION ERROR:", applyError);
    setApplyInventoryError(
      applyError?.message ||
      "Unable to apply inventory reconciliation."
    );
  } finally {
    setApplyingInventory(false);

setActiveWorkspace("overview");
setWorkspacePage(1);
  }
}

  /* =====================================================
     RESET
  ===================================================== */

  function resetReport() {
    setFile(null);

    setSheetName("");

    setRows([]);

    setRawRowCount(0);

    setSearch("");

    setStoreFilter("all");

setError("");

setReconciliation([]);

setReconciliationMetrics(
  null
);

setMatchingError("");

setBusinessLinks([]);

setBusinessLinkMetrics(null);

setBusinessLinkError("");

setBusinessLinkMessage("");

setApplyInventoryError("");
setApplyInventoryMessage("");
setApplyingInventory(false);

setLinkingAnalysis(false);

setLinkingWines(false);
  }

  /* =====================================================
     MANUAL WINE LINKING
  ===================================================== */

  async function openManualWineLink(row) {
    setManualLinkRow(row);
    setManualWineSearch("");
    setManualWineOptions([]);
    setManualLinkError("");
    setLoadingManualWines(true);

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { data, error } = await supabase
        .from("wines")
        .select(`
          id,
          name,
          producer,
          vintage,
          region,
          country,
          business_product_number,
          business_barcode
        `)
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

      setManualWineOptions(data || []);
    } catch (manualError) {
      console.error(
        "LOAD MANUAL WINE OPTIONS ERROR:",
        manualError
      );

      setManualLinkError(
        manualError?.message ||
          "Unable to load Vaxeron wines."
      );
    } finally {
      setLoadingManualWines(false);
    }
  }

  function closeManualWineLink() {
    if (savingManualLink) {
      return;
    }

    setManualLinkRow(null);
    setManualWineSearch("");
    setManualWineOptions([]);
    setManualLinkError("");
  }

  async function saveSuggestedWineLink(row) {
    if (!row?.wine?.id || savingManualLink) {
      return;
    }

    setSavingManualLink(true);
    setManualLinkError("");
    setBusinessLinkError("");
    setBusinessLinkMessage("");

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const existingProductNumber = normalize(
        row.wine.business_product_number
      );

      const currentProductNumber = normalize(
        row.productNumber
      );

      if (
        existingProductNumber &&
        existingProductNumber !== currentProductNumber
      ) {
        throw new Error(
          `Suggested wine is already linked to business product ${existingProductNumber}.`
        );
      }

      const { error } = await supabase
        .from("wines")
        .update({
          business_product_number:
            row.productNumber || null,
          business_barcode:
            row.barcode || null,
        })
        .eq("id", row.wine.id);

      if (error) {
        throw error;
      }

      await refreshWineLinkingWorkspace(supabase);

      setBusinessLinkMessage(
        `${row.productName} linked to suggested wine ${row.wine.name}.`
      );
    } catch (suggestedError) {
      console.error(
        "LINK SUGGESTED WINE ERROR:",
        suggestedError
      );

      setBusinessLinkError(
        suggestedError?.message ||
          "Unable to link the suggested wine."
      );
    } finally {
      setSavingManualLink(false);
      setManualLinkRow(null);
    }
  }

  async function saveManualWineLink(wine) {
    if (!manualLinkRow || !wine?.id || savingManualLink) {
      return;
    }

    const existingProductNumber = normalize(
      wine.business_product_number
    );

    const currentProductNumber = normalize(
      manualLinkRow.productNumber
    );

    if (
      existingProductNumber &&
      existingProductNumber !== currentProductNumber
    ) {
      setManualLinkError(
        `This Vaxeron wine is already linked to business product ${existingProductNumber}. Choose another wine.`
      );
      return;
    }

    setSavingManualLink(true);
    setManualLinkError("");
    setBusinessLinkError("");
    setBusinessLinkMessage("");

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { error } = await supabase
        .from("wines")
        .update({
          business_product_number:
            manualLinkRow.productNumber || null,
          business_barcode:
            manualLinkRow.barcode || null,
        })
        .eq("id", wine.id);

      if (error) {
        throw error;
      }

      const linkingResult =
        await buildWineBusinessLinks({
          supabase,
          reportRows: rows,
        });

      setBusinessLinks(
        linkingResult.rows || []
      );

      setBusinessLinkMetrics(
        linkingResult.metrics || null
      );

      const reconciliationResult =
        await reconcileWineInventory({
          supabase,
          reportRows: rows,
        });

      setReconciliation(
        reconciliationResult.rows || []
      );

      setReconciliationMetrics(
        reconciliationResult.metrics || null
      );

      setBusinessLinkMessage(
        `${manualLinkRow.productName} linked to ${wine.name}.`
      );

      closeManualWineLink();
      setWorkspacePage(1);
    } catch (manualError) {
      console.error(
        "MANUAL WINE LINK ERROR:",
        manualError
      );

      setManualLinkError(
        manualError?.message ||
          "Unable to save this wine link."
      );
    } finally {
      setSavingManualLink(false);
    }
  }

  async function refreshWineLinkingWorkspace(supabase) {
    const linkingResult =
      await buildWineBusinessLinks({
        supabase,
        reportRows: rows,
      });

    setBusinessLinks(
      linkingResult.rows || []
    );

    setBusinessLinkMetrics(
      linkingResult.metrics || null
    );

    const reconciliationResult =
      await reconcileWineInventory({
        supabase,
        reportRows: rows,
      });

    setReconciliation(
      reconciliationResult.rows || []
    );

    setReconciliationMetrics(
      reconciliationResult.metrics || null
    );

    setWorkspacePage(1);
  }

  async function createWineFromBusinessProduct() {
  if (!manualLinkRow || creatingManualWine) {
    return;
  }

  const confirmed = window.confirm(
    `Create "${manualLinkRow.productName}" as a new Vaxeron wine and link this business product?\n\nYou can complete producer, region, country and other wine details later in Wine Cellar.`
  );

  if (!confirmed) {
    return;
  }

  setCreatingManualWine(true);
  setManualLinkError("");
  setBusinessLinkError("");
  setBusinessLinkMessage("");

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user?.id) {
      throw new Error(
        "You must be signed in to create a wine."
      );
    }

    const {
      data: restaurant,
      error: restaurantError,
    } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .single();

    if (restaurantError) {
      throw restaurantError;
    }

    if (!restaurant?.id) {
      throw new Error(
        "No restaurant was found for the signed-in account."
      );
    }

    const {
      data: createdWine,
      error: createWineError,
    } = await supabase
      .from("wines")
      .insert({
        restaurant_id: restaurant.id,
        name: manualLinkRow.productName,
        vintage:
          manualLinkRow.vintage || null,
        business_product_number:
          manualLinkRow.productNumber || null,
        business_barcode:
          manualLinkRow.barcode || null,
      })
      .select(`
        id,
        name,
        producer,
        vintage,
        business_product_number,
        business_barcode
      `)
      .single();

    if (createWineError) {
      throw createWineError;
    }

    await refreshWineLinkingWorkspace(
      supabase
    );

    setBusinessLinkMessage(
      `${createdWine.name} created and linked successfully.`
    );

    setManualLinkRow(null);
    setManualWineSearch("");
    setManualWineOptions([]);
    setManualLinkError("");
  } catch (createError) {
    console.error(
      "CREATE WINE FROM BUSINESS PRODUCT ERROR:",
      createError
    );

    setManualLinkError(
      createError?.message ||
        "Unable to create this wine."
    );
  } finally {
    setCreatingManualWine(false);
  }
}

  const filteredManualWineOptions = useMemo(() => {
    const query = normalizeLower(manualWineSearch);

    const rowsToShow = manualWineOptions.filter((wine) => {
      const existingProductNumber = normalize(
        wine.business_product_number
      );

      const currentProductNumber = normalize(
        manualLinkRow?.productNumber
      );

      const available =
        !existingProductNumber ||
        existingProductNumber === currentProductNumber;

      if (!available) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        wine.name,
        wine.producer,
        wine.vintage,
        wine.region,
        wine.country,
      ].some((value) =>
        normalizeLower(value).includes(query)
      );
    });

    return rowsToShow.slice(0, 80);
  }, [
    manualWineOptions,
    manualWineSearch,
    manualLinkRow,
  ]);

  /* =====================================================
     RECONCILIATION WORKSPACE
  ===================================================== */

  const negativeStockRows = reconciliation.filter(
    (row) => Number(row.businessQuantity || 0) < 0
  );

  const wineReviewRows = Array.from(
    new Map(
      reconciliation
        .filter((row) => row.status === "wine_unmatched")
        .map((row) => [
          row.productNumber ||
            row.barcode ||
            normalizeLower(row.productName),
          row,
        ])
    ).values()
  );

  const locationIssueRows = Array.from(
    new Map(
      reconciliation
        .filter(
          (row) =>
            row.status === "location_unmapped" ||
            row.status === "location_missing"
        )
        .map((row) => [
          `${row.store || row.businessStore || "unknown"}::${
            row.status
          }`,
          row,
        ])
    ).values()
  );

  const operationalIssueCount =
    wineReviewRows.length +
    locationIssueRows.length +
    negativeStockRows.length;

  const workspaceTabs = [
    {
      id: "overview",
      label: "Overview",
      count: reconciliation.length,
    },
    {
      id: "linking",
      label: "Wine Linking",
      count:
        Number(businessLinkMetrics?.probable || 0) +
        Number(businessLinkMetrics?.ambiguous || 0) +
        Number(businessLinkMetrics?.unmatched || 0),
    },
    {
      id: "changes",
      label: "Stock Changes",
      count: Number(reconciliationMetrics?.changes || 0),
    },
    {
      id: "issues",
      label: "Issues",
      count: operationalIssueCount,
    },
  ];

  const linkingRows = useMemo(() => {
    const query = normalizeLower(search);

    return businessLinks.filter((row) => {
      if (row.status === "exact") {
        return false;
      }

      const matchesSearch =
        !query ||
        [
          row.productName,
          row.productNumber,
          row.barcode,
          row.wine?.name,
          row.wine?.producer,
        ].some((value) =>
          normalizeLower(value).includes(query)
        );

      return matchesSearch;
    });
  }, [businessLinks, search]);

  const stockChangeRows = useMemo(() => {
    return filteredReconciliation.filter(
      (row) => row.status === "change"
    );
  }, [filteredReconciliation]);

  const issueRows = useMemo(() => {
    const negativeRows = filteredReconciliation.filter(
      (row) => Number(row.businessQuantity || 0) < 0
    );

    const uniqueWineReviewRows = Array.from(
      new Map(
        filteredReconciliation
          .filter((row) => row.status === "wine_unmatched")
          .map((row) => [
            row.productNumber ||
              row.barcode ||
              normalizeLower(row.productName),
            row,
          ])
      ).values()
    );

    const uniqueLocationIssueRows = Array.from(
      new Map(
        filteredReconciliation
          .filter(
            (row) =>
              row.status === "location_unmapped" ||
              row.status === "location_missing"
          )
          .map((row) => [
            `${row.store || row.businessStore || "unknown"}::${
              row.status
            }`,
            row,
          ])
      ).values()
    );

    return [
      ...uniqueWineReviewRows,
      ...uniqueLocationIssueRows,
      ...negativeRows,
    ];
  }, [filteredReconciliation]);

  const activeRows =
    activeWorkspace === "linking"
      ? linkingRows
      : activeWorkspace === "changes"
        ? stockChangeRows
        : activeWorkspace === "issues"
          ? issueRows
          : filteredReconciliation;

  const workspacePageCount = Math.max(
    1,
    Math.ceil(activeRows.length / WORKSPACE_PAGE_SIZE)
  );

  const safeWorkspacePage = Math.min(
    workspacePage,
    workspacePageCount
  );

  const paginatedWorkspaceRows = activeRows.slice(
    (safeWorkspacePage - 1) * WORKSPACE_PAGE_SIZE,
    safeWorkspacePage * WORKSPACE_PAGE_SIZE
  );

  function changeWorkspace(nextWorkspace) {
    setActiveWorkspace(nextWorkspace);
    setWorkspacePage(1);
  }

  const isProductsReport =
    rows[0]?.reportType ===
    "products";

  const btgDetectedCount =
    useMemo(
      () =>
        rows.filter(
          (row) =>
            normalizeLower(
              row.productGroup
            ) === "by the glass"
        ).length,
      [rows]
    );

  const btgMatchedWineCount =
    useMemo(
      () =>
        reconciliation.filter(
          (row) =>
            Boolean(row.wine?.id)
        ).length,
      [reconciliation]
    );

  const btgNeedsReviewCount =
    Math.max(
      0,
      btgDetectedCount -
        btgMatchedWineCount
    );

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-7 py-6 space-y-5">
      {reading && (
        <div className="fixed inset-0 z-[9999] bg-[#f7f2ec]/90 backdrop-blur-md flex items-center justify-center">
          <div className="flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-full border-2 border-[#dfd1c6] border-t-[#963b2c] animate-spin" />
            <div className="mt-5 text-[10px] uppercase tracking-[0.24em] text-[#49352e]">
              Reading Inventory Report
            </div>
            <div className="mt-2 text-[10px] text-[#9b8d85]">
              Analysing Excel structure and inventory rows
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-5 flex-wrap">
        <div>
          <div className="so-title">
            {isProductsReport
              ? "BTG Catalogue Sync"
              : "Daily Inventory Reconciliation"}
          </div>
          <div className="so-sub mt-1">
            {isProductsReport
              ? "Match the Business by-the-glass catalogue with Vaxeron wines and venue stock"
              : "Compare the official business inventory report with Vaxeron cellar stock"}
          </div>
        </div>

        {file && (
          <button
            onClick={resetReport}
            className="so-btn-ghost flex items-center gap-2"
          >
            <XMarkIcon className="w-4 h-4" />
            Clear Report
          </button>
        )}
      </div>

      {!file && (
        <div className="bg-white/70 border border-[#eadfd5] rounded-[28px] min-h-[460px] flex items-center justify-center px-8 py-14">
          <div className="max-w-[520px] w-full text-center">
            <div className="w-14 h-14 mx-auto rounded-full border border-[#e4d7cc] flex items-center justify-center bg-[#faf7f3]">
              <DocumentChartBarIcon className="w-6 h-6 text-[#963b2c]" />
            </div>

            <div className="mt-7 text-[18px] font-medium tracking-[-0.02em] text-[#30231f]">
              Import daily inventory report
            </div>

            <div className="mt-3 text-[12px] leading-relaxed text-[#8f8178]">
              Upload the Excel inventory report exported from the business system.
              Vaxeron will inspect the report before any stock changes are made.
            </div>

            <label className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#963b2c] px-5 py-3 text-[11px] font-medium text-white cursor-pointer transition hover:opacity-90">
              <ArrowUpTrayIcon className="w-4 h-4" />
              {reading ? "Reading Report..." : "Select Excel Report"}
              <input
                type="file"
                accept=".xlsx,.xls"
                disabled={reading}
                className="hidden"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0];
                  readExcel(selectedFile);
                  event.target.value = "";
                }}
              />
            </label>

            <div className="mt-4 text-[9px] uppercase tracking-[0.18em] text-[#b0a198]">
              XLSX or XLS
            </div>

            {error && (
              <div className="mt-7 flex items-start gap-3 text-left border border-red-200 bg-red-50 rounded-[18px] px-4 py-4">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <div className="text-[11px] font-medium text-red-700">
                    Report could not be read
                  </div>
                  <div className="mt-1 text-[10px] text-red-600">
                    {error}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {file && (
        <>
          <div className="sticky top-3 z-30 bg-[#f7f2ec]/95 backdrop-blur-xl border border-[#e5d8ce] rounded-[22px] shadow-[0_12px_35px_rgba(68,46,36,0.08)] overflow-hidden">
            <div className="px-4 md:px-5 py-3 border-b border-[#eadfd5] flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-[#33251f] truncate">
                  {file.name}
                </div>
                <div className="mt-1 text-[9px] text-[#91a1ba]">
                  {sheetName} · {formatNumber(rawRowCount)} raw rows ·{" "}
                  {formatNumber(rows.length)}{" "}
                  {isProductsReport
                    ? "BTG products"
                    : "inventory records"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {applyInventoryMessage && (
                  <div className="text-[9px] text-emerald-700 max-w-[440px] text-right">
                    {applyInventoryMessage}
                  </div>
                )}

                {!isProductsReport && (
                <button
                  type="button"
                  onClick={applyInventoryChanges}
                  disabled={
                    applyingInventory ||
                    !reconciliationMetrics ||
                    Number(reconciliationMetrics.changes || 0) === 0
                  }
                  className="rounded-xl bg-[#963b2c] px-4 py-2.5 text-[9px] uppercase tracking-[0.12em] font-medium text-white transition hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {applyingInventory
                    ? "Applying..."
                    : `Apply ${formatNumber(
                        reconciliationMetrics?.changes || 0
                      )} Changes`}
                </button>
                )}
              </div>
            </div>

            <div className="px-3 md:px-4 py-2.5 flex items-center gap-2 overflow-x-auto">
              {workspaceTabs.map((tab) => {
                const active = activeWorkspace === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => changeWorkspace(tab.id)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[10px] whitespace-nowrap transition ${
                      active
                        ? "bg-[#30231f] text-white"
                        : "text-[#75645b] hover:bg-white/80"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`min-w-[22px] rounded-full px-1.5 py-0.5 text-[8px] text-center ${
                        active
                          ? "bg-white/15 text-white"
                          : "bg-[#eee5de] text-[#8f8178]"
                      }`}
                    >
                      {formatNumber(tab.count)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {(matchingError ||
            businessLinkError ||
            applyInventoryError) && (
            <div className="border border-red-200 bg-red-50 rounded-[18px] px-5 py-4 text-[11px] text-red-700">
              {matchingError ||
                businessLinkError ||
                applyInventoryError}
            </div>
          )}

          {businessLinkMessage && (
            <div className="border border-emerald-200 bg-emerald-50 rounded-[18px] px-5 py-4 text-[11px] text-emerald-700">
              {businessLinkMessage}
            </div>
          )}

          {(matching || linkingAnalysis) && (
            <div className="bg-white/75 border border-[#eadfd5] rounded-[18px] px-5 py-4 flex items-center gap-4">
              <div className="w-5 h-5 rounded-full border-2 border-[#dfd1c6] border-t-[#963b2c] animate-spin" />
              <div>
                <div className="text-[10px] font-medium text-[#33251f]">
                  Building reconciliation workspace
                </div>
                <div className="mt-1 text-[9px] text-[#9b8d85]">
                  Matching wine identities, locations and current quantities
                </div>
              </div>
            </div>
          )}

          {!matching &&
            !linkingAnalysis &&
            reconciliationMetrics && (
              <>
                {activeWorkspace === "overview" && (
                  <div className="space-y-5">
                    {isProductsReport ? (
                      <>
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                          <MetricCard
                            label="BTG Products"
                            value={formatNumber(btgDetectedCount)}
                            detail="Business products classified By the Glass"
                          />
                          <MetricCard
                            label="Wines Matched"
                            value={formatNumber(btgMatchedWineCount)}
                            detail="BTG products resolved to a Vaxeron wine"
                          />
                          <MetricCard
                            label="Venue Suggestions"
                            value={formatNumber(btgVenueSuggestionCount)}
                            detail="Pending venue-specific BTG opportunities"
                          />
                          <MetricCard
                            label="Needs Review"
                            value={formatNumber(btgNeedsReviewCount)}
                            detail="BTG products without a resolved wine identity"
                          />
                        </div>

                        <div className="so-card !py-5">
                          <div className="flex items-start justify-between gap-5">
                            <div>
                              <div className="so-title">
                                BTG Catalogue Status
                              </div>
                              <div className="so-sub mt-1">
                                Product catalogue intelligence matched against current positive venue inventory
                              </div>
                            </div>
                            <div className="text-[9px] uppercase tracking-[0.16em] text-[#963b2c]">
                              Catalogue
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              ["BTG products", btgDetectedCount],
                              ["Wine matched", btgMatchedWineCount],
                              ["Venue suggestions", btgVenueSuggestionCount],
                              ["Needs review", btgNeedsReviewCount],
                            ].map(([label, value]) => (
                              <div
                                key={label}
                                className="rounded-[16px] border border-[#eee4dc] bg-[#fcfaf8] px-4 py-3"
                              >
                                <div className="text-[8px] uppercase tracking-[0.16em] text-[#9a8b83]">
                                  {label}
                                </div>
                                <div className="mt-2 text-[20px] font-medium tracking-[-0.03em] text-[#33251f]">
                                  {formatNumber(value)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                      <MetricCard
                        label="Matched Wines"
                        value={formatNumber(
                          reconciliationMetrics.matched
                        )}
                        detail="Wine and location identified"
                      />
                      <MetricCard
                        label="Exact Stock"
                        value={formatNumber(
                          reconciliationMetrics.exact
                        )}
                        detail="Already aligned with business stock"
                      />
                      <MetricCard
                        label="Stock Changes"
                        value={formatNumber(
                          reconciliationMetrics.changes
                        )}
                        detail="Business stock differs from Vaxeron"
                      />
                      <MetricCard
                        label="Operational Issues"
                        value={formatNumber(operationalIssueCount)}
                        detail="Wine review, location or negative stock"
                      />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                      <div className="so-card xl:col-span-2 !py-5">
                        <div className="flex items-start justify-between gap-5">
                          <div>
                            <div className="so-title">
                              Reconciliation Status
                            </div>
                            <div className="so-sub mt-1">
                              Current operational state of the imported report
                            </div>
                          </div>
                          <div className="text-[9px] uppercase tracking-[0.16em] text-[#963b2c]">
                            Live
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            [
                              "Report records",
                              reconciliationMetrics.reportWineRecords,
                            ],
                            [
                              "Wine linked",
                              reconciliationMetrics.matched || 0,
                            ],
                            [
                              "Needs review",
                              operationalIssueCount,
                            ],
                            [
                              "Locations",
                              stores.length,
                            ],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="rounded-[16px] border border-[#eee4dc] bg-[#fcfaf8] px-4 py-3"
                            >
                              <div className="text-[8px] uppercase tracking-[0.16em] text-[#9a8b83]">
                                {label}
                              </div>
                              <div className="mt-2 text-[20px] font-medium tracking-[-0.03em] text-[#33251f]">
                                {formatNumber(value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="so-card !py-5">
                        <div className="so-title">
                          Report Snapshot
                        </div>
                        <div className="so-sub mt-1">
                          Closing inventory from the business export
                        </div>

                        <div className="mt-5 space-y-3">
                          {[
                            ["Unique products", uniqueProducts.length],
                            [
                              "Final stock",
                              formatNumber(
                                Math.round(
                                  Number(finalStockTotal || 0) * 100
                                ) / 100
                              ),
                            ],
                            [
                              "Inventory value",
                              `€${formatCurrency(reportValue)}`,
                            ],
                            ["Stores detected", stores.length],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="flex items-center justify-between gap-5 py-2 border-b border-[#f0e8e1] last:border-0"
                            >
                              <span className="text-[10px] text-[#8f8178]">
                                {label}
                              </span>
                              <span className="text-[10px] font-medium text-[#3a2a24]">
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                      </>
                    )}
                  </div>
                )}

                {activeWorkspace === "linking" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                      <MetricCard
                        label="Exact Matches"
                        value={formatNumber(
                          businessLinkMetrics?.exact || 0
                        )}
                        detail="Unique wine identity detected"
                      />
                      <MetricCard
                        label="Probable"
                        value={formatNumber(
                          businessLinkMetrics?.probable || 0
                        )}
                        detail="Likely match requiring review"
                      />
                      <MetricCard
                        label="Ambiguous"
                        value={formatNumber(
                          businessLinkMetrics?.ambiguous || 0
                        )}
                        detail="Multiple possible Vaxeron wines"
                      />
                      <MetricCard
                        label="Unmatched"
                        value={formatNumber(
                          businessLinkMetrics?.unmatched || 0
                        )}
                        detail="No wine candidate found"
                      />
                    </div>

                    <div className="so-card p-0 overflow-hidden">
                      <div className="px-5 py-4 border-b border-[#eadfd5] flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <div className="so-title">
                            Wine Identity Review
                          </div>
                          <div className="so-sub mt-1">
                            Only records requiring identity review are shown
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={linkExactMatches}
                          disabled={
                            linkingWines ||
                            safeExactBusinessLinks.length === 0
                          }
                          className="rounded-xl bg-[#963b2c] px-4 py-2.5 text-[9px] uppercase tracking-[0.12em] font-medium text-white transition hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed"
                        >
                          {linkingWines
                            ? "Linking..."
                            : `Link ${formatNumber(
                                safeExactBusinessLinks.length
                              )} Exact Matches`}
                        </button>
                      </div>

                      {exactLinkConflicts > 0 && (
                        <div className="px-5 py-3 border-b border-amber-200 bg-amber-50 text-[10px] text-amber-700">
                          {formatNumber(exactLinkConflicts)} exact-looking
                          matches were excluded because multiple business
                          products resolve to the same Vaxeron wine.
                        </div>
                      )}

                      <WorkspaceTable
                        mode="linking"
                        rows={paginatedWorkspaceRows}
                        onManualLink={openManualWineLink}
                        onSuggestedLink={async (row) => {
                          setManualLinkRow(row);
                          await saveSuggestedWineLink(row);
                        }}
                      />
                    </div>
                  </div>
                )}

                {activeWorkspace === "changes" && (
                  <div className="so-card p-0 overflow-hidden">
                    <WorkspaceHeader
                      title="Stock Changes"
                      subtitle="Closing stock differences ready for reconciliation"
                      count={stockChangeRows.length}
                    />
                    <WorkspaceTable
                      mode="changes"
                      rows={paginatedWorkspaceRows}
                    />
                  </div>
                )}

                {activeWorkspace === "issues" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <MetricCard
                        label="Wine Review"
                        value={formatNumber(wineReviewRows.length)}
                        detail="Wine identity requires review"
                      />
                      <MetricCard
                        label="Location Issues"
                        value={formatNumber(locationIssueRows.length)}
                        detail="Store or wine location requires attention"
                      />
                      <MetricCard
                        label="Negative Stock"
                        value={formatNumber(negativeStockRows.length)}
                        detail="Business closing stock below zero"
                      />
                    </div>

                    <div className="so-card p-0 overflow-hidden">
                      <WorkspaceHeader
                        title="Issues"
                        subtitle="Only operational wine reconciliation issues are shown"
                        count={issueRows.length}
                      />
                      <WorkspaceTable
                        mode="issues"
                        rows={paginatedWorkspaceRows}
                      />
                    </div>
                  </div>
                )}

                <div className="bg-white/75 border border-[#eadfd5] rounded-[18px] px-4 py-3 flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[240px]">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#91a1ba]" />
                    <input
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setWorkspacePage(1);
                      }}
                      placeholder="Search wine, product number, barcode or store..."
                      className="w-full border border-[#e7ddd4] rounded-xl bg-white pl-10 pr-4 py-2.5 text-[10px] text-[#33251f] outline-none focus:border-[#c8aa91]"
                    />
                  </div>

                  <select
                    value={storeFilter}
                    onChange={(event) => {
                      setStoreFilter(event.target.value);
                      setWorkspacePage(1);
                    }}
                    className="border border-[#e7ddd4] rounded-xl bg-white px-4 py-2.5 text-[10px] text-[#66564e] outline-none"
                  >
                    <option value="all">All Stores</option>
                    {stores.map((store) => (
                      <option key={store} value={store}>
                        {store}
                      </option>
                    ))}
                  </select>

                  <div className="text-[9px] text-[#91a1ba] whitespace-nowrap">
                    {formatNumber(activeRows.length)} records
                  </div>
                </div>

                {activeWorkspace !== "overview" &&
                  activeRows.length > 0 && (
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-[9px] text-[#9b8d85]">
                        Page {safeWorkspacePage} of{" "}
                        {workspacePageCount} · 50 rows per page
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setWorkspacePage((page) =>
                              Math.max(1, page - 1)
                            )
                          }
                          disabled={safeWorkspacePage === 1}
                          className="so-btn-ghost disabled:opacity-35"
                        >
                          Previous
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setWorkspacePage((page) =>
                              Math.min(
                                workspacePageCount,
                                page + 1
                              )
                            )
                          }
                          disabled={
                            safeWorkspacePage === workspacePageCount
                          }
                          className="so-btn-ghost disabled:opacity-35"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
              </>
            )}
        </>
      )}

      {manualLinkRow && (
        <div className="fixed inset-0 z-[9998] bg-[#241915]/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[760px] max-h-[82vh] bg-[#fbf8f4] border border-[#e5d8ce] rounded-[26px] shadow-[0_30px_90px_rgba(42,28,21,0.25)] overflow-hidden flex flex-col">
            <div className="px-5 md:px-6 py-5 border-b border-[#eadfd5] flex items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-[0.18em] text-[#963b2c]">
                  Manual Wine Linking
                </div>
                <div className="mt-2 text-[16px] font-medium tracking-[-0.02em] text-[#30231f]">
                  {manualLinkRow.productName}
                </div>
                <div className="mt-1 text-[9px] text-[#9b8d85]">
                  Product {manualLinkRow.productNumber || "—"} ·{" "}
                  {manualLinkRow.barcode || "No barcode"}
                </div>
              </div>

              <button
                type="button"
                onClick={closeManualWineLink}
                disabled={savingManualLink}
                className="w-9 h-9 rounded-full border border-[#e5d8ce] bg-white flex items-center justify-center text-[#8f8178] hover:text-[#30231f] disabled:opacity-40"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 md:px-6 py-4 border-b border-[#eadfd5]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#91a1ba]" />
                <input
                  autoFocus
                  value={manualWineSearch}
                  onChange={(event) =>
                    setManualWineSearch(event.target.value)
                  }
                  placeholder="Search Vaxeron wine, producer, vintage, region or country..."
                  className="w-full border border-[#e7ddd4] rounded-xl bg-white pl-10 pr-4 py-3 text-[10px] text-[#33251f] outline-none focus:border-[#c8aa91]"
                />
              </div>

              {manualLinkError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] text-red-700">
                  {manualLinkError}
                </div>
              )}

              {manualLinkRow.status === "unmatched" && (
                <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-[#e7ddd4] bg-[#faf7f3] px-4 py-3">
                  <div>
                    <div className="text-[9px] font-medium text-[#33251f]">
                      Not in Vaxeron?
                    </div>
                    <div className="mt-1 text-[8px] text-[#9b8d85]">
                      Create this business product as a new wine record.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={createWineFromBusinessProduct}
                    disabled={creatingManualWine || savingManualLink}
                    className="rounded-lg bg-[#30231f] px-3 py-2 text-[8px] uppercase tracking-[0.1em] text-white hover:opacity-90 disabled:opacity-40 whitespace-nowrap"
                  >
                    {creatingManualWine
                      ? "Creating..."
                      : "Create New Wine"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingManualWines ? (
                <div className="py-16 flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full border-2 border-[#dfd1c6] border-t-[#963b2c] animate-spin" />
                  <div className="mt-4 text-[9px] uppercase tracking-[0.16em] text-[#8f8178]">
                    Loading Vaxeron Wines
                  </div>
                </div>
              ) : filteredManualWineOptions.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-[11px] font-medium text-[#33251f]">
                    No available wine found
                  </div>
                  <div className="mt-2 text-[9px] text-[#9b8d85]">
                    Try another wine name, producer or vintage.
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-[#eee5de]">
                  {filteredManualWineOptions.map((wine) => (
                    <button
                      key={wine.id}
                      type="button"
                      disabled={savingManualLink}
                      onClick={() => saveManualWineLink(wine)}
                      className="w-full px-5 md:px-6 py-4 text-left hover:bg-white/80 transition disabled:opacity-50 flex items-center justify-between gap-5"
                    >
                      <div className="min-w-0">
                        <div className="text-[10px] font-medium text-[#33251f]">
                          {wine.name}
                        </div>
                        <div className="mt-1 text-[8px] text-[#9b8d85]">
                          {[
                            wine.producer,
                            wine.vintage,
                            wine.region,
                            wine.country,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "No additional wine details"}
                        </div>
                      </div>

                      <span className="flex-shrink-0 rounded-full border border-[#dfd1c6] bg-white px-3 py-1.5 text-[8px] uppercase tracking-[0.12em] text-[#963b2c]">
                        {savingManualLink ? "Saving" : "Link"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 md:px-6 py-3 border-t border-[#eadfd5] bg-white/50 text-[8px] text-[#9b8d85]">
              Only unlinked Vaxeron wines are shown. Existing business identifiers are protected from overwrite.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkspaceHeader({
  title,
  subtitle,
  count,
}) {
  return (
    <div className="px-5 py-4 border-b border-[#eadfd5] flex items-center justify-between gap-5">
      <div>
        <div className="so-title">{title}</div>
        <div className="so-sub mt-1">{subtitle}</div>
      </div>
      <div className="text-[9px] uppercase tracking-[0.16em] text-[#963b2c]">
        {formatNumber(count)} records
      </div>
    </div>
  );
}

function StatusPill({ row }) {
  const negative =
    Number(row.businessQuantity || 0) < 0;

  const label = negative
    ? "Negative stock"
    : row.status === "wine_unmatched"
      ? "Wine unmatched"
      : row.status === "location_unmapped"
        ? "Store unmapped"
        : row.status === "location_missing"
          ? "Location missing"
          : row.status === "change"
            ? "Stock change"
            : row.status || "Review";

  const warning =
    negative ||
    row.status === "wine_unmatched" ||
    row.status === "location_unmapped" ||
    row.status === "location_missing";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[8px] uppercase tracking-[0.1em] whitespace-nowrap ${
        warning
          ? "bg-red-50 text-red-700 border border-red-200"
          : "bg-amber-50 text-amber-700 border border-amber-200"
      }`}
    >
      {label}
    </span>
  );
}

function WorkspaceTable({
  mode,
  rows,
  onManualLink,
  onSuggestedLink,
}) {
  if (!rows.length) {
    return (
      <div className="px-6 py-14 text-center">
        <CheckCircleIcon className="w-6 h-6 mx-auto text-[#963b2c]" />
        <div className="mt-3 text-[11px] font-medium text-[#33251f]">
          Nothing requiring attention
        </div>
        <div className="mt-1 text-[10px] text-[#9b8d85]">
          No records are currently visible in this workspace.
        </div>
      </div>
    );
  }

  if (mode === "linking") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left">
          <thead>
            <tr className="bg-[#faf7f3] border-b border-[#eadfd5]">
              {[
                "Business Wine",
                "Product No.",
                "Vaxeron Candidate",
                "Vintage",
                "Match Status",
                "Action",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-[8px] uppercase tracking-[0.16em] font-medium text-[#91a1ba]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[#f1eae4] last:border-0 hover:bg-[#fcfaf8]"
              >
                <td className="px-4 py-3 min-w-[280px]">
                  <div className="text-[10px] font-medium text-[#33251f]">
                    {row.productName || "Unnamed product"}
                  </div>
                  <div className="mt-1 text-[8px] text-[#a99a91]">
                    {row.barcode || "No barcode"}
                  </div>
                </td>
                <td className="px-4 py-3 text-[9px] text-[#77665d]">
                  {row.productNumber || "—"}
                </td>
                <td className="px-4 py-3 min-w-[280px]">
                  <div className="text-[10px] text-[#33251f]">
                    {row.wine?.name || "No candidate"}
                  </div>
                  <div className="mt-1 text-[8px] text-[#a99a91]">
                    {row.wine?.producer || "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-[9px] text-[#77665d]">
                  {row.wine?.vintage || "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusPill row={row} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {row.status === "probable" && row.wine?.id && (
                      <button
                        type="button"
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Link "${row.productName}" to suggested wine "${row.wine.name}"?`
                          );

                          if (confirmed) {
                            onSuggestedLink?.(row);
                          }
                        }}
                        className="rounded-lg bg-[#963b2c] px-3 py-2 text-[8px] uppercase tracking-[0.1em] text-white hover:opacity-90 whitespace-nowrap"
                      >
                        Link Suggested
                      </button>
                    )}

                    {(row.status === "unmatched" ||
                      row.status === "probable" ||
                      row.status === "ambiguous") && (
                      <button
                        type="button"
                        onClick={() => onManualLink?.(row)}
                        className="rounded-lg border border-[#dfd1c6] bg-white px-3 py-2 text-[8px] uppercase tracking-[0.1em] text-[#963b2c] hover:bg-[#faf7f3] whitespace-nowrap"
                      >
                        {row.status === "probable"
                          ? "Choose Another"
                          : "Find Wine"}
                      </button>
                    )}

                    {![
                      "unmatched",
                      "probable",
                      "ambiguous",
                    ].includes(row.status) && (
                      <span className="text-[8px] text-[#b0a198]">
                        —
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] text-left">
        <thead>
          <tr className="bg-[#faf7f3] border-b border-[#eadfd5]">
            {[
              "Wine",
              "Store",
              "Vaxeron",
              "Business",
              "Difference",
              "Status",
            ].map((heading) => (
              <th
                key={heading}
                className="px-4 py-3 text-[8px] uppercase tracking-[0.16em] font-medium text-[#91a1ba]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-[#f1eae4] last:border-0 hover:bg-[#fcfaf8]"
            >
              <td className="px-4 py-3 min-w-[320px]">
                <div className="text-[10px] font-medium text-[#33251f]">
                  {row.wine?.name ||
                    row.productName ||
                    "Unnamed wine"}
                </div>
                <div className="mt-1 text-[8px] text-[#a99a91]">
                  {row.productNumber || "No product number"}
                </div>
              </td>
              <td className="px-4 py-3 text-[9px] text-[#66564e] whitespace-nowrap">
                {row.location?.name || row.store || "—"}
              </td>
              <td className="px-4 py-3 text-[10px] text-[#66564e]">
                {row.vaxeronQuantity === null ||
                row.vaxeronQuantity === undefined
                  ? "—"
                  : formatNumber(row.vaxeronQuantity)}
              </td>
              <td
                className={`px-4 py-3 text-[10px] font-medium ${
                  Number(row.businessQuantity || 0) < 0
                    ? "text-red-700"
                    : "text-[#33251f]"
                }`}
              >
                {formatNumber(row.businessQuantity)}
              </td>
              <td className="px-4 py-3 text-[10px] font-medium text-[#963b2c]">
                {row.discrepancy === null ||
                row.discrepancy === undefined
                  ? "—"
                  : `${
                      Number(row.discrepancy) > 0 ? "+" : ""
                    }${formatNumber(row.discrepancy)}`}
              </td>
              <td className="px-4 py-3">
                <StatusPill row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
