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
