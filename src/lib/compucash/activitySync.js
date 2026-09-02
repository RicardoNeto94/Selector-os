import "server-only";

import { fetchAllRows } from "@/lib/supabase/fetchAllRows";
import { scopeTenantQuery } from "@/lib/server/tenantContext";

const DELIVERY_TYPES = [1, 2, 3, 4, 5, 6, 11];
const DELIVERY_TYPE_NAMES = new Map([
  [1, "take_in"],
  [2, "write_out"],
  [3, "transfer"],
  [4, "write_off"],
  [5, "produce"],
  [6, "credit"],
  [11, "take_in_order"],
]);
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST200", "PGRST205"]);

export async function syncCompuCashActivity({ admin, client, tenant, storeTargets }) {
  const scope = (query) => scopeTenantQuery(query, tenant);
  const [wines, aliases] = await Promise.all([
    fetchAllRows(
      admin,
      "wines",
      "id,size,sku,business_product_number,business_barcode",
      scope
    ),
    fetchAllRows(
      admin,
      "wine_business_aliases",
      "wine_id,business_product_id,business_product_number,business_barcode,serving_cl,source_type",
      scope
    ),
  ]);

  const latestResult = await scope(
    admin
      .from("compucash_activity_rows")
      .select("event_at")
      .order("event_at", { ascending: false })
      .limit(1)
  ).maybeSingle();
  if (latestResult.error) {
    if (MISSING_TABLE_CODES.has(latestResult.error.code)) {
      return { skipped: true, reason: "activity_ledger_migration_required" };
    }
    throw latestResult.error;
  }

  const end = new Date();
  end.setUTCDate(end.getUTCDate() + 1);
  const start = latestResult.data?.event_at
    ? new Date(latestResult.data.event_at)
    : new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
  if (latestResult.data?.event_at) start.setUTCDate(start.getUTCDate() - 4);
  const periodStart = formatApiDate(start);
  const periodEnd = formatApiDate(end);

  const [invoices, deliveryNotes] = await Promise.all([
    client.getInvoicesByPeriod({ periodStart, periodEnd }),
    client.getDeliveryNotes({
      periodStart,
      periodEnd,
      deliveryNoteTypes: DELIVERY_TYPES,
    }),
  ]);

  const matcher = createWineMatcher(wines, aliases);
  const locationsByStore = new Map(
    storeTargets.map((target) => [String(target.externalStoreId), target.locationId])
  );
  const sales = normalizeSales(invoices, matcher, tenant);
  const documents = normalizeDeliveryNotes(
    deliveryNotes,
    matcher,
    locationsByStore,
    tenant
  );
  const rows = [...sales.rows, ...documents.rows];

  if (rows.length) {
    for (let offset = 0; offset < rows.length; offset += 500) {
      const response = await admin
        .from("compucash_activity_rows")
        .upsert(rows.slice(offset, offset + 500), {
          onConflict:
            "organization_id,property_id,event_type,external_document_id,external_row_id",
        });
      if (response.error) throw response.error;
    }
  }

  return {
    periodStart,
    periodEnd,
    importedRows: rows.length,
    salesRows: sales.rows.length,
    movementRows: documents.rows.length,
    unmatchedSalesRows: sales.unmatched,
    unmatchedMovementRows: documents.unmatched,
  };
}

function normalizeSales(invoices, matcher, tenant) {
  const rows = [];
  let unmatched = 0;
  for (const invoice of invoices ?? []) {
    const details = invoice?.invoiceDetails ?? {};
    const header = details.header ?? {};
    for (const row of details.rows ?? []) {
      const match = matcher(row);
      if (!match) {
        unmatched += 1;
        continue;
      }
      const quantity = finite(row.quantity);
      const grossAmount = finite(row.finalPrice);
      const eventAt = validDate(row.added ?? header.closed ?? header.docDate);
      rows.push({
        organization_id: tenant.organization.id,
        property_id: tenant.property.id,
        event_type: "sale",
        external_document_id: String(header.invoice ?? row.invoice),
        external_row_id: String(row.rowId),
        external_product_id: nullable(row.productId),
        external_product_number: nullable(row.productNumber),
        external_barcode: nullable(row.barcode),
        product_name: nullable(row.productName) ?? "Unnamed wine product",
        wine_id: match.wineId,
        event_at: eventAt,
        business_date: dateOnly(header.businessDay ?? eventAt),
        quantity,
        bottle_equivalent: bottleEquivalent(quantity, match),
        unit_price: quantity ? grossAmount / quantity : null,
        gross_amount: grossAmount,
        vat_percent: finiteOrNull(row.vat),
        sale_point_id: nullable(header.salePointId),
        sale_point_name: nullable(header.salePointName),
        document_status: header.closed ? "closed" : "open",
        is_cancelled: Boolean(header.canceledInvNo),
        source_metadata: {
          source: "compucash_invoice",
          mainUnit: nullable(row.mainUnit),
          discountAmount: finiteOrNull(row.discountAmount),
          matchedBy: match.matchedBy,
        },
        imported_at: new Date().toISOString(),
      });
    }
  }
  return { rows, unmatched };
}

function normalizeDeliveryNotes(notes, matcher, locationsByStore, tenant) {
  const rows = [];
  let unmatched = 0;
  for (const note of notes ?? []) {
    const header = note?.header ?? {};
    const eventType = DELIVERY_TYPE_NAMES.get(Number(header.type));
    if (!eventType) continue;
    for (const row of note?.rows ?? []) {
      const match = matcher(row);
      if (!match) {
        unmatched += 1;
        continue;
      }
      const quantity = finite(row.quantity);
      const eventAt = validDate(
        header.acceptedDate ?? header.deliveryDate ?? header.documentDate ?? header.createdDate
      );
      const fromStoreId = nullable(row.storeFromId ?? header.storeFromId);
      const toStoreId = nullable(row.storeToId ?? header.storeToId);
      rows.push({
        organization_id: tenant.organization.id,
        property_id: tenant.property.id,
        event_type: eventType,
        external_document_id: String(header.id ?? row.deliveryNoteId),
        external_row_id: String(row.rowId),
        external_product_id: nullable(row.productId),
        external_product_number: nullable(row.productNumber),
        external_barcode: nullable(row.productBarcode),
        product_name: nullable(row.productName) ?? "Unnamed wine product",
        wine_id: match.wineId,
        event_at: eventAt,
        business_date: dateOnly(header.documentDate ?? eventAt),
        quantity,
        bottle_equivalent: bottleEquivalent(quantity, match),
        unit_price: finiteOrNull(row.unitPrice),
        gross_amount: finiteOrNull(row.totalAmount),
        vat_percent: finiteOrNull(row.vatPercent),
        from_external_store_id: fromStoreId,
        from_store_name: nullable(row.storeFromName ?? header.storeFromName),
        to_external_store_id: toStoreId,
        to_store_name: nullable(row.storeToName ?? header.storeToName),
        from_location_id: fromStoreId ? locationsByStore.get(fromStoreId) ?? null : null,
        to_location_id: toStoreId ? locationsByStore.get(toStoreId) ?? null : null,
        document_status: nullable(header.status),
        is_cancelled: Boolean(header.isDeleted),
        source_metadata: {
          source: "compucash_delivery_note",
          documentName: nullable(header.documentName),
          referenceNumber: nullable(header.referenceNumber),
          mainUnit: nullable(row.mainUnit),
          matchedBy: match.matchedBy,
        },
        imported_at: new Date().toISOString(),
      });
    }
  }
  return { rows, unmatched };
}

function createWineMatcher(wines, aliases) {
  const records = [];
  for (const wine of wines) {
    records.push({
      wineId: wine.id,
      size: wine.size,
      servingCl: null,
      externalId: null,
      productNumber: wine.business_product_number ?? wine.sku,
      barcode: wine.business_barcode,
      source: "wine",
    });
  }
  for (const alias of aliases) {
    const wine = wines.find((candidate) => candidate.id === alias.wine_id);
    records.push({
      wineId: alias.wine_id,
      size: wine?.size,
      servingCl: finiteOrNull(alias.serving_cl),
      externalId: alias.business_product_id,
      productNumber: alias.business_product_number,
      barcode: alias.business_barcode,
      source: alias.source_type ?? "alias",
    });
  }
  const indexes = {
    externalId: makeIndex(records, "externalId"),
    productNumber: makeIndex(records, "productNumber"),
    barcode: makeIndex(records, "barcode"),
  };
  return (product) => {
    for (const [matchedBy, value] of [
      ["external_product_id", product.productId],
      ["business_product_number", product.productNumber],
      ["barcode", product.productBarcode ?? product.barcode],
    ]) {
      const candidates = indexes[
        matchedBy === "external_product_id"
          ? "externalId"
          : matchedBy === "barcode"
            ? "barcode"
            : "productNumber"
      ].get(normalize(value));
      if (!candidates?.length) continue;
      const wineIds = new Set(candidates.map((candidate) => candidate.wineId));
      if (wineIds.size === 1) return { ...candidates[0], matchedBy };
      return null;
    }
    return null;
  };
}

function makeIndex(records, field) {
  const index = new Map();
  for (const record of records) {
    const value = normalize(record[field]);
    if (!value) continue;
    index.set(value, [...(index.get(value) ?? []), record]);
  }
  return index;
}

function bottleEquivalent(quantity, match) {
  if (!match.servingCl) return quantity;
  const bottleCl = parseBottleCl(match.size);
  return bottleCl ? quantity * match.servingCl / bottleCl : null;
}

function parseBottleCl(value) {
  const text = String(value ?? "").trim().toLowerCase();
  const amount = Number.parseFloat(text.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return 75;
  if (text.includes("ml")) return amount / 10;
  if (text.includes("cl")) return amount;
  if (text.includes("l")) return amount * 100;
  return amount > 10 ? amount / 10 : amount * 100;
}

function validDate(value) {
  const date = new Date(value ?? Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function dateOnly(value) {
  return String(value ?? "").slice(0, 10) || formatApiDate(new Date());
}

function formatApiDate(date) {
  return date.toISOString().slice(0, 10);
}

function nullable(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function finite(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
