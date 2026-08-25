export const INVENTORY_ROUNDING_EPSILON = 0.001;
export const INVENTORY_PAGE_SIZE = 1000;

export function bottleQuantity(value) {
  const quantity = Number(value || 0);
  if (!Number.isFinite(quantity)) return 0;
  return Math.abs(quantity) < INVENTORY_ROUNDING_EPSILON ? 0 : quantity;
}

export function positiveBottleQuantity(value) {
  return Math.max(0, bottleQuantity(value));
}

export function sumPositiveBottles(rows, getQuantity = (row) => row?.quantity) {
  return (rows || []).reduce(
    (total, row) => total + positiveBottleQuantity(getQuantity(row)),
    0
  );
}

export function sumNetBottles(rows, getQuantity = (row) => row?.quantity) {
  return (rows || []).reduce(
    (total, row) => total + bottleQuantity(getQuantity(row)),
    0
  );
}

export const COMPUCASH_INVENTORY_FAMILIES = {
  wine: new Set(["14", "15", "16", "63", "67", "68", "76"]),
  sake: new Set(["77"]),
  nonAlcoholic: new Set(["78"]),
};

export function inventoryFamilyForWine(wine) {
  const source = wine?.wines || wine?.wine || wine || {};
  const groupId = String(source.compucash_product_group_id ?? "").trim();

  if (COMPUCASH_INVENTORY_FAMILIES.wine.has(groupId)) return "wine";
  if (COMPUCASH_INVENTORY_FAMILIES.sake.has(groupId)) return "sake";
  if (COMPUCASH_INVENTORY_FAMILIES.nonAlcoholic.has(groupId)) return "nonAlcoholic";

  const category = normalizeWineCategory(source);
  if (category === "sake" || category === "shochu") return "sake";
  if (category === "non-alcoholic") return "nonAlcoholic";
  if (["red", "white", "rose", "sparkling", "fortified", "dessert"].includes(category)) {
    return "wine";
  }
  return "other";
}

export function summarizeInventoryFamilies(rows, getQuantity = (row) => row?.stock ?? row?.quantity) {
  const summary = {
    wine: { positive: 0, net: 0 },
    sake: { positive: 0, net: 0 },
    nonAlcoholic: { positive: 0, net: 0 },
    other: { positive: 0, net: 0 },
    total: { positive: 0, net: 0 },
  };

  for (const row of rows || []) {
    const quantity = bottleQuantity(getQuantity(row));
    const family = inventoryFamilyForWine(row);
    summary[family].net += quantity;
    summary[family].positive += Math.max(0, quantity);
    summary.total.net += quantity;
    summary.total.positive += Math.max(0, quantity);
  }

  return summary;
}

export const BOTTLE_FORMATS = {
  small: { label: "Small formats", detail: "Below 70cl" },
  standard: { label: "Standard bottles", detail: "70–100cl" },
  large: { label: "Magnum & large", detail: "Above 100cl" },
  unknown: { label: "Size needs review", detail: "Missing or unclear size" },
};

export function parseBottleSizeCl(value) {
  const text = String(value || "").trim().toLowerCase().replace(",", ".");
  if (!text) return null;

  const match = text.match(/(?:^|[^\d.])(\d+(?:\.\d+)?)\s*(ml|cl|l)\b/i);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (match[2] === "ml") return amount / 10;
  if (match[2] === "l") return amount * 100;
  return amount;
}

export function bottleFormatForWine(wine) {
  const source = wine?.wines || wine?.wine || wine;
  const sizeCl = parseBottleSizeCl(source?.size) ?? parseBottleSizeCl(source?.name);
  if (sizeCl === null) return "unknown";
  if (sizeCl < 70) return "small";
  if (sizeCl <= 100) return "standard";
  return "large";
}

export function summarizeBottleFormats(rows, getQuantity = (row) => row?.stock ?? row?.quantity) {
  const summary = {
    small: 0,
    standard: 0,
    large: 0,
    unknown: 0,
    fractional: 0,
    total: 0,
  };

  for (const row of rows || []) {
    const quantity = positiveBottleQuantity(getQuantity(row));
    if (quantity <= 0) continue;

    const format = bottleFormatForWine(row);
    summary[format] += quantity;
    summary.total += quantity;

    const wholeBottles = Math.floor(quantity + INVENTORY_ROUNDING_EPSILON);
    const remainder = quantity - wholeBottles;
    if (remainder > INVENTORY_ROUNDING_EPSILON) summary.fractional += remainder;
  }

  return summary;
}

export function normalizeWineCategory(wine) {
  const type = String(wine?.wine_type || "").trim().toLowerCase();
  const identity = `${wine?.name || ""} ${wine?.producer || ""}`.toLowerCase();

  if (/non[-\s]?alcoholic|alcohol[-\s]?free|0[.,]0\s*%/.test(identity)) {
    return "non-alcoholic";
  }
  if (type === "rosé") return "rose";
  if (type.includes("sparkling") || type.includes("champagne")) return "sparkling";
  return type || "unknown";
}

export async function fetchAllQueryRows(buildQuery, pageSize = INVENTORY_PAGE_SIZE) {
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
