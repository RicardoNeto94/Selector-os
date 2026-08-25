import { fetchAllQueryRows } from "@/lib/wineInventory";

const WINE_GROUPS = new Set([
  "by the glass",
  "champagne",
  "dessert wine",
  "fortified wine",
  "non-alcoholic wine",
  "red wine",
  "rose wine",
  "sparkling wine",
  "white wine",
]);

/* =======================================================
   NORMALIZE
======================================================= */

function normalize(value) {
  return String(value ?? "").trim();
}

function normalizeLower(value) {
  return normalize(value).toLowerCase();
}

function normalizeIdentifier(value) {
  return normalize(value)
    .replace(/\.0+$/, "")
    .toLowerCase();
}

const BTG_SERVING_CL = new Set([
  5,
  6,
  7.5,
  10,
  12,
  15,
  18,
  20,
]);

function extractWineFormat(value) {
  const source = normalizeLower(value);

  const clMatch = source.match(
    /(?:^|\s)(\d+(?:[.,]\d+)?)\s*cl\b/
  );

  if (clMatch) {
    const cl = Number(
      clMatch[1].replace(",", ".")
    );

    if (BTG_SERVING_CL.has(cl)) {
      return {
        format: "btg",
        servingCl: cl,
        bottleCl: null,
      };
    }

    return {
      format: "bottle",
      servingCl: null,
      bottleCl: cl,
    };
  }

  const mlMatch = source.match(
    /(?:^|\s)(\d+(?:[.,]\d+)?)\s*ml\b/
  );

  if (mlMatch) {
    const ml = Number(
      mlMatch[1].replace(",", ".")
    );

    const cl = ml / 10;

    if (BTG_SERVING_CL.has(cl)) {
      return {
        format: "btg",
        servingCl: cl,
        bottleCl: null,
      };
    }

    return {
      format: "bottle",
      servingCl: null,
      bottleCl: cl,
    };
  }

  return {
    format: "unknown",
    servingCl: null,
    bottleCl: null,
  };
}

function normalizeWineName(value) {
  return normalizeLower(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/&/g, " and ")
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:cl|ml)\b/g, " ")
    .replace(/\b(?:0[.,]75|1[.,]5)\s*l\b/g, " ")
    .replace(/\b(nv|n\/v)\b/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractVintage(value) {
  const match = normalize(value).match(
    /\b(19\d{2}|20\d{2})\b/
  );

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

/* =======================================================
   BUSINESS STOCK
======================================================= */

function getBusinessQuantity(row) {
  if (
    row.storeBalance !== null &&
    row.storeBalance !== undefined &&
    row.storeBalance !== ""
  ) {
    return Number(row.storeBalance || 0);
  }

  return Number(row.finalStock || 0);
}

/* =======================================================
   BUILD BUSINESS REPORT
======================================================= */

function buildBusinessReport(
  rows,
  storeMappingIndex
) {
  const reportMap = new Map();

  rows
    .filter((row) =>
      WINE_GROUPS.has(
        normalizeLower(
          row.productGroup
        )
      )
    )
    .forEach((row) => {
      const storeKey =
        normalizeLower(
          row.store
        );

      const mapping =
        storeMappingIndex.get(
          storeKey
        ) || null;

      const locationName =
        mapping?.location?.name || "";

      const locationId =
        mapping?.location?.id || null;

      const productKey =
        normalizeIdentifier(
          row.productNumber
        ) ||
        normalizeIdentifier(
          row.barcode
        ) ||
        normalizeLower(
          row.productName
        );

      if (!productKey) {
        return;
      }

      const key = [
        storeKey,
        productKey,
      ].join("::");

      reportMap.set(key, {
        ...row,

        locationName,

        locationId,

        businessStoreMapping:
          mapping,

        businessQuantity:
          getBusinessQuantity(row),

        wineFormat:
          extractWineFormat(row.productName),

        isByTheGlass:
          normalizeLower(row.productGroup) === "by the glass" ||
          extractWineFormat(row.productName).format === "btg",

        servingCl:
          extractWineFormat(row.productName).servingCl,
      });
    });

  return [
    ...reportMap.values(),
  ];
}

/* =======================================================
   BUSINESS STORE MAPPINGS
======================================================= */

async function loadStoreMappings(
  supabase
) {
  const {
    data,
    error,
  } = await supabase
    .from(
      "wine_location_store_mappings"
    )
    .select(`
      id,
      business_store_name,
      location_id,
      location:wine_locations (
  id,
  name
)
    `);

  if (error) {
    throw error;
  }

  const mappings = data || [];

  const index = new Map();

  mappings.forEach((mapping) => {
    const storeKey =
      normalizeLower(
        mapping.business_store_name
      );

    if (!storeKey) {
      return;
    }

    index.set(
      storeKey,
      mapping
    );
  });

  return {
    mappings,
    index,
  };
}
/* =======================================================
   UNIQUE BUSINESS PRODUCTS
======================================================= */

function buildBusinessProducts(rows) {
  const products = new Map();

  rows
    .filter((row) =>
      WINE_GROUPS.has(
        normalizeLower(row.productGroup)
      )
    )
    .forEach((row) => {
      const productNumber =
        normalizeIdentifier(
          row.productNumber
        );

      const barcode =
        normalizeIdentifier(row.barcode);

      const productName = normalize(
        row.productName
      );

      const key =
        productNumber ||
        barcode ||
        normalizeWineName(productName);

      if (!key) {
        return;
      }

      if (!products.has(key)) {
        products.set(key, {
          productNumber:
            normalize(row.productNumber),

          barcode: normalize(row.barcode),

          productName,

          normalizedName:
            normalizeWineName(productName),

          vintage:
            extractVintage(productName),

          wineFormat:
            extractWineFormat(productName),

          isByTheGlass:
            extractWineFormat(productName).format === "btg",

          servingCl:
            extractWineFormat(productName).servingCl,

          productGroup:
            normalize(row.productGroup),

          stores: new Set(),
        });
      }

      products
        .get(key)
        .stores.add(normalize(row.store));
    });

  return [...products.values()].map(
    (product) => ({
      ...product,

      stores: [...product.stores],
    })
  );
}

/* =======================================================
   WINE INDEXES
======================================================= */

function buildWineIndexes(
  wines,
  aliases = []
) {
  const byProductNumber = new Map();

  const byBarcode = new Map();

  const byName = new Map();

  const byNormalizedName = new Map();

  wines.forEach((wine) => {
    const productNumber =
      normalizeIdentifier(
        wine.business_product_number
      );

    const barcode =
      normalizeIdentifier(
        wine.business_barcode
      );

    const name = normalizeLower(wine.name);

    const normalizedName =
      normalizeWineName(wine.name);

    if (productNumber) {
      byProductNumber.set(
        productNumber,
        wine
      );
    }

    if (barcode) {
      byBarcode.set(barcode, wine);
    }

    if (name) {
      if (!byName.has(name)) {
        byName.set(name, []);
      }

      byName.get(name).push(wine);
    }

    if (normalizedName) {
      if (
        !byNormalizedName.has(
          normalizedName
        )
      ) {
        byNormalizedName.set(
          normalizedName,
          []
        );
      }

      byNormalizedName
        .get(normalizedName)
        .push(wine);
    }
  });

  aliases.forEach((alias) => {
    const wine =
      alias.wine || null;

    if (!wine?.id) {
      return;
    }

    const productNumber =
      normalizeIdentifier(
        alias.business_product_number
      );

    const barcode =
      normalizeIdentifier(
        alias.business_barcode
      );

    if (productNumber) {
      byProductNumber.set(
        productNumber,
        wine
      );
    }

    if (barcode) {
      byBarcode.set(
        barcode,
        wine
      );
    }
  });

  return {
    byProductNumber,
    byBarcode,
    byName,
    byNormalizedName,
  };
}

/* =======================================================
   LOAD BUSINESS ALIASES
======================================================= */

async function loadWineBusinessAliases(
  supabase
) {
  const {
    data,
    error,
  } = await supabase
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
      wine:wines (
        id,
        name,
        producer,
        vintage,
        business_product_number,
        business_barcode
      )
    `);

  if (error) {
    throw error;
  }

  return data || [];
}

/* =======================================================
   LOCATION INDEX
======================================================= */

function buildLocationIndex(locations) {
  return new Map(
    locations.map((location) => [
      normalizeLower(location.name),
      location,
    ])
  );
}

/* =======================================================
   EXACT RECONCILIATION MATCH
======================================================= */

function matchWine(row, indexes) {
  const productNumber =
    normalizeIdentifier(
      row.productNumber
    );

  const barcode =
    normalizeIdentifier(row.barcode);

  const name = normalizeLower(
    row.productName
  );

  if (
    productNumber &&
    indexes.byProductNumber.has(
      productNumber
    )
  ) {
    return {
      wine:
        indexes.byProductNumber.get(
          productNumber
        ),

      matchMethod: "Product number",
    };
  }

  if (
    barcode &&
    indexes.byBarcode.has(barcode)
  ) {
    return {
      wine:
        indexes.byBarcode.get(barcode),

      matchMethod: "Barcode",
    };
  }

  const nameMatches =
    indexes.byName.get(name) || [];

  if (nameMatches.length === 1) {
    return {
      wine: nameMatches[0],

      matchMethod: "Exact name",
    };
  }

  /*
   * BTG SKUs include a serving size in the Business name,
   * for example "Wine Name 2024 15cl".
   *
   * They must resolve against the base Vaxeron wine identity
   * after serving size and vintage normalization.
   */
  if (row.isByTheGlass) {
    const normalizedName =
      normalizeWineName(
        row.productName
      );

    const normalizedMatches =
      indexes.byNormalizedName.get(
        normalizedName
      ) || [];

    if (normalizedMatches.length === 1) {
      return {
        wine: normalizedMatches[0],

        matchMethod:
          "BTG normalized name",
      };
    }

    const businessVintage =
      extractVintage(
        row.productName
      );

    if (
      businessVintage &&
      normalizedMatches.length > 1
    ) {
      const vintageMatches =
        normalizedMatches.filter(
          (wine) =>
            Number(wine.vintage) ===
            Number(businessVintage)
        );

      if (vintageMatches.length === 1) {
        return {
          wine: vintageMatches[0],

          matchMethod:
            "BTG normalized name + vintage",
        };
      }
    }
  }

  return {
    wine: null,

    matchMethod: "",
  };
}

/* =======================================================
   FIRST-TIME BUSINESS LINK MATCH
======================================================= */

function classifyBusinessProduct(
  product,
  indexes
) {
  const productNumber =
    normalizeIdentifier(
      product.productNumber
    );

  const barcode =
    normalizeIdentifier(product.barcode);

  if (
    productNumber &&
    indexes.byProductNumber.has(
      productNumber
    )
  ) {
    return {
      status: "already_linked",

      wine:
        indexes.byProductNumber.get(
          productNumber
        ),

      matchMethod: "Product number",

      confidence: 100,
    };
  }

  if (
    barcode &&
    indexes.byBarcode.has(barcode)
  ) {
    return {
      status: "already_linked",

      wine:
        indexes.byBarcode.get(barcode),

      matchMethod: "Barcode",

      confidence: 100,
    };
  }

  const normalizedName =
    product.normalizedName;

  const candidates =
    indexes.byNormalizedName.get(
      normalizedName
    ) || [];

  if (candidates.length === 0) {
    return {
      status: "unmatched",

      wine: null,

      candidates: [],

      matchMethod: "",

      confidence: 0,
    };
  }

  if (candidates.length === 1) {
    const wine = candidates[0];

    const businessVintage =
      product.vintage;

    const vaxeronVintage =
      wine.vintage
        ? Number(wine.vintage)
        : null;

    if (
      businessVintage &&
      vaxeronVintage &&
      businessVintage !==
        vaxeronVintage
    ) {
      return {
        status: "probable",

        wine,

        candidates,

        matchMethod:
          "Normalized name",

        confidence: 75,

        reason: "Vintage differs",
      };
    }

    return {
      status: "exact",

      wine,

      candidates,

      matchMethod:
        businessVintage &&
        vaxeronVintage
          ? "Name + vintage"
          : "Unique normalized name",

      confidence:
        businessVintage &&
        vaxeronVintage
          ? 100
          : 95,
    };
  }

  if (product.vintage) {
    const vintageMatches =
      candidates.filter(
        (wine) =>
          Number(wine.vintage) ===
          Number(product.vintage)
      );

    if (vintageMatches.length === 1) {
      return {
        status: "exact",

        wine: vintageMatches[0],

        candidates,

        matchMethod:
          "Name + vintage",

        confidence: 100,
      };
    }

    if (vintageMatches.length > 1) {
      return {
        status: "ambiguous",

        wine: null,

        candidates: vintageMatches,

        matchMethod:
          "Name + vintage",

        confidence: 0,

        reason:
          "Multiple Vaxeron wines share the same name and vintage",
      };
    }
  }

  return {
    status: "ambiguous",

    wine: null,

    candidates,

    matchMethod:
      "Normalized name",

    confidence: 0,

    reason:
      "Multiple Vaxeron wines share this name",
  };
}

/* =======================================================
   BUSINESS LINKING ENGINE
======================================================= */

export async function buildWineBusinessLinks({
  supabase,
  reportRows,
}) {
  const businessProducts =
    buildBusinessProducts(reportRows);

  const [
    winesResult,
    aliases,
  ] = await Promise.all([
    supabase
      .from("wines")
      .select(`
        id,
        name,
        producer,
        vintage,
        business_product_number,
        business_barcode
      `),

    loadWineBusinessAliases(
      supabase
    ),
  ]);

  if (winesResult.error) {
    throw winesResult.error;
  }

  const wineRows =
    winesResult.data || [];

  const indexes =
    buildWineIndexes(
      wineRows,
      aliases
    );

  const rows = businessProducts.map(
    (product) => {
      const result =
        classifyBusinessProduct(
          product,
          indexes
        );

      return {
        id: [
          product.productNumber,
          product.barcode,
          product.productName,
        ].join("::"),

        ...product,

        ...result,
      };
    }
  );

  const metrics = {
    total: rows.length,

    exact: rows.filter(
      (row) => row.status === "exact"
    ).length,

    probable: rows.filter(
      (row) =>
        row.status === "probable"
    ).length,

    ambiguous: rows.filter(
      (row) =>
        row.status === "ambiguous"
    ).length,

    unmatched: rows.filter(
      (row) =>
        row.status === "unmatched"
    ).length,

    alreadyLinked: rows.filter(
      (row) =>
        row.status === "already_linked"
    ).length,
  };

  console.log(
    "VAXERON BUSINESS LINKING:",
    {
      products:
        businessProducts.length,

      wines: wineRows.length,

      aliases: aliases.length,

      metrics,

      exactSample: rows
        .filter(
          (row) =>
            row.status === "exact"
        )
        .slice(0, 10),

      ambiguousSample: rows
        .filter(
          (row) =>
            row.status === "ambiguous"
        )
        .slice(0, 10),
    }
  );

  return {
    rows,
    metrics,
  };
}

/* =======================================================
   LINK EXACT BUSINESS IDENTIFIERS
======================================================= */

export async function linkExactWineBusinessIds({
  supabase,
  linkRows,
}) {
  const exactRows = (
    linkRows || []
  ).filter(
    (row) =>
      row.status === "exact" &&
      row.wine?.id
  );

  if (exactRows.length === 0) {
    return {
      linked: 0,
      failed: 0,
      errors: [],
    };
  }

  const aliases = Array.from(
    new Map(
      exactRows.map((row) => {
        const alias = {
          wine_id: row.wine.id,
          business_product_id:
            normalize(row.productId) || null,
          business_product_number:
            normalize(row.productNumber) || null,
          business_barcode:
            normalize(row.barcode) || null,
          business_product_name:
            normalize(row.productName),
          product_group:
            normalize(row.productGroup) || null,
          serving_cl:
            row.servingCl ?? null,
          sales_price:
            row.salesPrice ?? null,
          source_type:
            "inventory_linking",
          updated_at:
            new Date().toISOString(),
        };

        const key =
          alias.business_product_id ||
          alias.business_product_number ||
          alias.business_barcode ||
          `${alias.wine_id}:${normalizeLower(
            alias.business_product_name
          )}`;

        return [key, alias];
      })
    ).values()
  );

  let linked = 0;
  const errors = [];

  for (const alias of aliases) {
    let lookup = supabase
      .from("wine_business_aliases")
      .select("id, wine_id");

    if (alias.business_product_id) {
      lookup = lookup.eq(
        "business_product_id",
        alias.business_product_id
      );
    } else if (
      alias.business_product_number
    ) {
      lookup = lookup.eq(
        "business_product_number",
        alias.business_product_number
      );
    } else if (
      alias.business_barcode
    ) {
      lookup = lookup.eq(
        "business_barcode",
        alias.business_barcode
      );
    } else {
      lookup = lookup
        .eq("wine_id", alias.wine_id)
        .eq(
          "business_product_name",
          alias.business_product_name
        );
    }

    const {
      data: existingRows,
      error: lookupError,
    } = await lookup.limit(20);

    if (lookupError) {
      errors.push({
        wineId: alias.wine_id,
        productName:
          alias.business_product_name,
        error: lookupError.message,
      });
      continue;
    }

    const conflicting =
      (existingRows || []).find(
        (row) =>
          row.wine_id &&
          row.wine_id !== alias.wine_id
      );

    if (conflicting) {
      errors.push({
        wineId: alias.wine_id,
        productName:
          alias.business_product_name,
        error:
          "This business product is already linked to another Vaxeron wine.",
      });
      continue;
    }

    const existing =
      (existingRows || [])[0] || null;

    const { error: saveError } =
      existing?.id
        ? await supabase
            .from("wine_business_aliases")
            .update(alias)
            .eq("id", existing.id)
        : await supabase
            .from("wine_business_aliases")
            .insert(alias);

    if (saveError) {
      errors.push({
        wineId: alias.wine_id,
        productName:
          alias.business_product_name,
        error: saveError.message,
      });
      continue;
    }

    const {
      data: currentWine,
      error: wineLookupError,
    } = await supabase
      .from("wines")
      .select(`
        business_product_number,
        business_barcode
      `)
      .eq("id", alias.wine_id)
      .single();

    if (wineLookupError) {
      errors.push({
        wineId: alias.wine_id,
        productName:
          alias.business_product_name,
        error: wineLookupError.message,
      });
      continue;
    }

    const winePatch = {};

    if (
      !currentWine?.business_product_number &&
      alias.business_product_number
    ) {
      winePatch.business_product_number =
        alias.business_product_number;
    }

    if (
      !currentWine?.business_barcode &&
      alias.business_barcode
    ) {
      winePatch.business_barcode =
        alias.business_barcode;
    }

    if (
      Object.keys(winePatch).length > 0
    ) {
      const { error: wineUpdateError } =
        await supabase
          .from("wines")
          .update(winePatch)
          .eq("id", alias.wine_id);

      if (wineUpdateError) {
        errors.push({
          wineId: alias.wine_id,
          productName:
            alias.business_product_name,
          error: wineUpdateError.message,
        });
        continue;
      }
    }

    linked += 1;
  }

  console.log(
    "VAXERON BUSINESS ALIASES LINKED:",
    {
      requested: aliases.length,
      linked,
      failed: errors.length,
      errors,
    }
  );

  return {
    linked,
    failed: errors.length,
    errors,
  };
}

/* =======================================================
   AGGREGATE MATCHED INVENTORY TARGETS
======================================================= */

function aggregateMatchedInventoryRows(
  matchedRows
) {
  const aggregated = new Map();

  matchedRows.forEach((row) => {

    if (
      !row.wine?.id ||
      !row.location?.id
    ) {
      return;
    }

    /*
     * BTG business SKUs are service signals.
     * They must never contribute to physical bottle inventory.
     */
    if (row.isByTheGlass) {
      return;
    }

    const key = [
      row.wine.id,
      row.location.id,
    ].join("::");

    if (!aggregated.has(key)) {

      aggregated.set(key, {
        ...row,

        id: key,

        businessQuantity: 0,

        businessStores: [],

        sourceRows: [],
      });

    }

    const target =
      aggregated.get(key);

    target.businessQuantity +=
      Number(
        row.businessQuantity || 0
      );

    if (
      row.store &&
      !target.businessStores.includes(
        row.store
      )
    ) {

      target.businessStores.push(
        row.store
      );

    }

    target.sourceRows.push(row);

  });

  return [
    ...aggregated.values(),
  ];
}
/* =======================================================
   SAVE BTG SUGGESTIONS
======================================================= */

async function saveWineBusinessAliases({
  supabase,
  matchedRows,
}) {
  const aliasRows = matchedRows
    .filter(
      (row) =>
        row.wine?.id &&
        (
          normalize(row.productId) ||
          normalize(row.productNumber) ||
          normalize(row.barcode) ||
          normalize(row.productName)
        )
    )
    .map((row) => ({
      wine_id: row.wine.id,
      business_product_id:
        normalize(row.productId) || null,
      business_product_number:
        normalize(row.productNumber) || null,
      business_barcode:
        normalize(row.barcode) || null,
      business_product_name:
        normalize(row.productName),
      product_group:
        normalize(row.productGroup) || null,
      serving_cl:
        row.servingCl ?? null,
      sales_price:
        row.salesPrice ?? null,
      source_type:
        row.isByTheGlass
          ? "products_report_btg"
          : "inventory_reconciliation",
      updated_at:
        new Date().toISOString(),
    }));

  if (aliasRows.length === 0) {
    return {
      detected: 0,
      saved: 0,
    };
  }

  const deduped = Array.from(
    new Map(
      aliasRows.map((row) => [
        row.business_product_id ||
          row.business_product_number ||
          row.business_barcode ||
          `${row.wine_id}:${row.business_product_name}`,
        row,
      ])
    ).values()
  );

  let saved = 0;
  const errors = [];

  for (const alias of deduped) {
    let query = supabase
      .from("wine_business_aliases")
      .select("id")
      .limit(1);

    if (alias.business_product_id) {
      query = query.eq(
        "business_product_id",
        alias.business_product_id
      );
    } else if (
      alias.business_product_number
    ) {
      query = query.eq(
        "business_product_number",
        alias.business_product_number
      );
    } else if (alias.business_barcode) {
      query = query.eq(
        "business_barcode",
        alias.business_barcode
      );
    } else {
      query = query
        .eq("wine_id", alias.wine_id)
        .eq(
          "business_product_name",
          alias.business_product_name
        );
    }

    const {
      data: existing,
      error: lookupError,
    } = await query.maybeSingle();

    if (lookupError) {
      errors.push({
        alias,
        error: lookupError.message,
      });
      continue;
    }

    const { error } = existing?.id
      ? await supabase
          .from("wine_business_aliases")
          .update(alias)
          .eq("id", existing.id)
      : await supabase
          .from("wine_business_aliases")
          .insert(alias);

    if (error) {
      errors.push({
        alias,
        error: error.message,
      });
    } else {
      saved += 1;
    }
  }

  console.log(
    "VAXERON BUSINESS ALIASES:",
    {
      detected: deduped.length,
      saved,
      failed: errors.length,
      sample: deduped.slice(0, 5),
      errors: errors.slice(0, 5),
    }
  );

  return {
    detected: deduped.length,
    saved,
    failed: errors.length,
    errors,
  };
}

async function saveBtgSuggestions({
  supabase,
  matchedRows,
}) {
  const suggestionRows = matchedRows
    .filter(
      (row) =>
        row.isByTheGlass &&
        row.wine?.id &&
        row.location?.id &&
        Number(row.servingCl || 0) > 0
    )
    .map((row) => ({
      wine_id: row.wine.id,
      location_id: row.location.id,
      business_product_number:
        row.productNumber || null,
      business_barcode:
        row.barcode || null,
      business_product_name:
        row.productName,
      serving_cl:
        Number(row.servingCl),
      suggestion_type:
        row.suggestionType ||
        "opportunity",
      status: "pending",
      updated_at:
        new Date().toISOString(),
    }));

  if (suggestionRows.length === 0) {
    return {
      detected: 0,
      saved: 0,
    };
  }

  const deduplicatedRows = Array.from(
    new Map(
      suggestionRows.map((row) => [
        [
          row.wine_id,
          row.location_id,
          row.business_product_number ||
            row.business_barcode ||
            row.business_product_name,
        ].join("::"),
        row,
      ])
    ).values()
  );

  const { error } = await supabase
    .from("wine_btg_suggestions")
    .upsert(
      deduplicatedRows,
      {
        onConflict:
          "wine_id,location_id,business_product_number",
        ignoreDuplicates: false,
      }
    );

  if (error) {
    throw error;
  }

  console.log(
    "VAXERON BTG SUGGESTIONS:",
    {
      detected:
        suggestionRows.length,
      saved:
        deduplicatedRows.length,
      sample:
        deduplicatedRows.slice(0, 5),
    }
  );

  return {
    detected:
      suggestionRows.length,
    saved:
      deduplicatedRows.length,
  };
}

/* =======================================================
   LOAD INVENTORY
======================================================= */

async function loadInventory({
  supabase,
  wineIds,
  locationIds,
}) {
  if (
    wineIds.length === 0 ||
    locationIds.length === 0
  ) {
    return [];
  }

  const inventoryRows = [];

  const chunkSize = 200;

  for (
    let index = 0;
    index < wineIds.length;
    index += chunkSize
  ) {
    const wineChunk = wineIds.slice(
      index,
      index + chunkSize
    );

    const data = await fetchAllQueryRows(() => supabase
        .from("wine_inventory")
        .select(`
          wine_id,
          location_id,
          quantity
        `)
        .in("wine_id", wineChunk)
        .in(
          "location_id",
          locationIds
        )
        .order("wine_id")
        .order("location_id"));

    inventoryRows.push(
      ...data
    );
  }

  return inventoryRows;
}

/* =======================================================
   RECONCILIATION ENGINE
======================================================= */

export async function reconcileWineInventory({
  supabase,
  reportRows,
}) {
  const {
    mappings:
      storeMappings,

    index:
      storeMappingIndex,
  } = await loadStoreMappings(
    supabase
  );

  const businessRows =
    buildBusinessReport(
      reportRows,
      storeMappingIndex
    );

  const [
    locationsResult,
    winesResult,
    aliases,
  ] = await Promise.all([
    supabase
      .from("wine_locations")
      .select(`
        id,
        name
      `),

    supabase
      .from("wines")
      .select(`
        id,
        name,
        producer,
        vintage,
        business_product_number,
        business_barcode
      `),

    loadWineBusinessAliases(
      supabase
    ),
  ]);

  if (locationsResult.error) {
    throw locationsResult.error;
  }

  if (winesResult.error) {
    throw winesResult.error;
  }

  const locations =
    locationsResult.data || [];

  const wines =
    winesResult.data || [];

  const locationIndex =
    buildLocationIndex(locations);

  const wineIndexes =
    buildWineIndexes(
      wines,
      aliases
    );

  const matchedRows =
    businessRows.map((row) => {
      const location =
  row.locationId
    ? locations.find(
        (locationRow) =>
          locationRow.id ===
          row.locationId
      ) || null
    : row.locationName
    ? locationIndex.get(
        normalizeLower(
          row.locationName
        )
      ) || null
    : null;

      const {
        wine,
        matchMethod,
      } = matchWine(
        row,
        wineIndexes
      );

      return {
        ...row,

        location,

        wine,

        matchMethod,
      };
    });

  const rawBtgRows = matchedRows.filter(
    (row) => row.isByTheGlass
  );

  const btgMatchedWineRows = rawBtgRows.filter(
    (row) => row.wine?.id
  );

  const btgMatchedLocationRows = rawBtgRows.filter(
    (row) => row.location?.id
  );

  const btgFullyMatchedRows = rawBtgRows.filter(
    (row) =>
      row.wine?.id &&
      row.location?.id
  );

  /*
   * Products report BTG rows normally have no Business store.
   * For those rows, Vaxeron resolves the base wine first and then
   * checks wine_inventory to discover every venue where that wine
   * currently has positive physical bottle stock.
   */
  const globalBtgRows = rawBtgRows.filter(
    (row) =>
      row.wine?.id &&
      !row.location?.id
  );

  let expandedGlobalBtgRows = [];

  if (globalBtgRows.length > 0) {
    const globalBtgWineIds = [
      ...new Set(
        globalBtgRows.map(
          (row) => row.wine.id
        )
      ),
    ];

    const data = await fetchAllQueryRows(() => supabase
      .from("wine_inventory")
      .select(`
        wine_id,
        location_id,
        quantity
      `)
      .in("wine_id", globalBtgWineIds)
      .gt("quantity", 0)
      .order("wine_id")
      .order("location_id"));

    const positiveInventoryByWine =
      new Map();

    (data || []).forEach((inventoryRow) => {
      const key = String(
        inventoryRow.wine_id
      );

      if (
        !positiveInventoryByWine.has(key)
      ) {
        positiveInventoryByWine.set(
          key,
          []
        );
      }

      positiveInventoryByWine
        .get(key)
        .push(inventoryRow);
    });

    expandedGlobalBtgRows =
      globalBtgRows.flatMap((row) => {
        const inventoryLocations =
          positiveInventoryByWine.get(
            String(row.wine.id)
          ) || [];

        return inventoryLocations
          .map((inventoryRow) => {
            const location =
              locations.find(
                (locationRow) =>
                  locationRow.id ===
                  inventoryRow.location_id
              ) || null;

            if (!location) {
              return null;
            }

            return {
              ...row,
              location,
              locationId:
                location.id,
              locationName:
                location.name,
              matchedFrom:
                "Products BTG catalogue + positive venue inventory",
            };
          })
          .filter(Boolean);
      });
  }

  const confirmedBtgRows =
    btgFullyMatchedRows.map((row) => ({
      ...row,
      suggestionType: "confirmed",
    }));

  const opportunityBtgRows =
    expandedGlobalBtgRows.map((row) => ({
      ...row,
      suggestionType: "opportunity",
    }));

  const btgSuggestionRows = [
    ...confirmedBtgRows,
    ...opportunityBtgRows,
  ];

  console.log(
    "VAXERON BTG DETECTION DEBUG:",
    {
      detected: rawBtgRows.length,
      matchedWine:
        btgMatchedWineRows.length,
      matchedLocation:
        btgMatchedLocationRows.length,
      fullyMatched:
        btgFullyMatchedRows.length,
      globalCatalogueRows:
        globalBtgRows.length,
      expandedVenueSuggestions:
        expandedGlobalBtgRows.length,
      confirmedSuggestions:
        confirmedBtgRows.length,
      opportunitySuggestions:
        opportunityBtgRows.length,
      samples:
        rawBtgRows.slice(0, 10).map(
          (row) => ({
            productName:
              row.productName,
            productNumber:
              row.productNumber,
            productGroup:
              row.productGroup,
            servingCl:
              row.servingCl,
            isByTheGlass:
              row.isByTheGlass,
            status:
              row.status,
            wine:
              row.wine?.name || null,
            location:
              row.location?.name || null,
            businessStore:
              row.businessStore || null,
          })
        ),
    }
  );

  /*
   * Reconciliation is a read-only preview.
   * Business aliases are saved only after an explicit linking action.
   */
  const businessAliasResult = {
    detected: 0,
    saved: 0,
    failed: 0,
    errors: [],
  };

  const btgSuggestionResult =
    await saveBtgSuggestions({
      supabase,
      matchedRows:
        btgSuggestionRows,
    });

  const aggregatedMatchedRows =
    aggregateMatchedInventoryRows(
      matchedRows
    );

  const wineIds = [
    ...new Set(
      aggregatedMatchedRows
        .map((row) => row.wine?.id)
        .filter(Boolean)
    ),
  ];

  const locationIds = [
    ...new Set(
      aggregatedMatchedRows
        .map(
          (row) => row.location?.id
        )
        .filter(Boolean)
    ),
  ];

  const inventoryRows =
    await loadInventory({
      supabase,
      wineIds,
      locationIds,
    });

  const inventoryMap = new Map();

  inventoryRows.forEach((row) => {
    const key = [
      row.wine_id,
      row.location_id,
    ].join("::");

    inventoryMap.set(
      key,
      Number(row.quantity || 0)
    );
  });

  const matchedReconciliation =
  aggregatedMatchedRows.map((row) => {

    const inventoryKey = [
      row.wine.id,
      row.location.id,
    ].join("::");

    const vaxeronQuantity =
      Number(
        inventoryMap.get(
          inventoryKey
        ) || 0
      );

    const businessQuantity =
      Number(
        row.businessQuantity || 0
      );

    const discrepancy =
      businessQuantity -
      vaxeronQuantity;

    return {
      ...row,

      businessQuantity,

      vaxeronQuantity,

      discrepancy,

      status:
        discrepancy !== 0
          ? "change"
          : "matched",
    };

  });


const unresolvedReconciliation =
  matchedRows
    .filter(
      (row) =>
        !row.wine ||
        !row.location
    )
    .map((row) => {

      let status =
        "wine_unmatched";

      if (!row.locationName) {

        status =
          "location_unmapped";

      } else if (!row.location) {

        status =
          "location_missing";

      }

      return {
        ...row,

        vaxeronQuantity: null,

        discrepancy: null,

        status,
      };

    });


const reconciliation = [
  ...matchedReconciliation,
  ...unresolvedReconciliation,
];

  const metrics = {
    reportWineRecords:
      reconciliation.length,

    matched: reconciliation.filter(
      (row) =>
        row.wine &&
        row.location
    ).length,

    exact: reconciliation.filter(
      (row) =>
        row.status === "matched"
    ).length,

    changes: reconciliation.filter(
      (row) =>
        row.status === "change"
    ).length,

    unmatched:
      reconciliation.filter(
        (row) =>
          row.status ===
          "wine_unmatched"
      ).length,

    locationIssues:
      reconciliation.filter(
        (row) =>
          row.status ===
            "location_unmapped" ||
          row.status ===
            "location_missing"
      ).length,
  };

  console.log(
    "VAXERON RECONCILIATION:",
    {
      businessWineRows:
        businessRows.length,

      locations: locations.map(
        (location) => location.name
      ),
      storeMappings:
  storeMappings.map(
    (mapping) => ({
      businessStore:
        mapping.business_store_name,

      location:
        mapping.location?.name,
    })
  ),

      winesLoaded: wines.length,

      aliasesLoaded:
        aliases.length,

      inventoryRows:
        inventoryRows.length,

      btgSuggestions:
        btgSuggestionResult,

      metrics,

      sample:
        reconciliation.slice(0, 5),
    }
  );

  console.log(
  "UNMAPPED BUSINESS STORES:",
  [
    ...new Set(
      reconciliation
        .filter(
          (row) =>
            row.status === "location_unmapped" ||
            row.status === "location_missing"
        )
        .map((row) => row.store)
    ),
  ]
);

  return {
    rows: reconciliation,

    metrics,

    locations,

    wines,
  };
}

/* =======================================================
   APPLY INVENTORY RECONCILIATION
======================================================= */

export async function applyWineInventoryReconciliation({
  supabase,
  reconciliationRows,
}) {
  const applicableRows = reconciliationRows.filter(
    (row) =>
      row.wine?.id &&
      row.location?.id &&
      (
        row.status === "change" ||
        row.status === "matched"
      )
  );

  if (applicableRows.length === 0) {
    return {
      processed: 0,
      updated: 0,
      movements: 0,
      unchanged: 0,
      failed: 0,
      errors: [],
    };
  }

  const payload = applicableRows.map((row) => ({
    wine_id: row.wine.id,
    location_id: row.location.id,
    location_name: row.location.name,
    quantity: Number(row.businessQuantity || 0),
    business_stores: (row.businessStores || []).join(", "),
  }));

  const {
    data,
    error,
  } = await supabase.rpc(
    "apply_wine_inventory_reconciliation",
    {
      p_rows: payload,
    }
  );

  if (error) {
    console.error(
      "VAXERON INVENTORY RECONCILIATION TRANSACTION FAILED:",
      error
    );

    return {
      processed: applicableRows.length,
      updated: 0,
      movements: 0,
      unchanged: 0,
      failed: applicableRows.length,
      errors: [
        {
          stage: "database_transaction",
          error: error.message,
        },
      ],
    };
  }

  const result = data || {};

  const response = {
    processed: Number(
      result.processed ||
      applicableRows.length
    ),
    updated: Number(result.updated || 0),
    movements: Number(result.movements || 0),
    unchanged: Number(result.unchanged || 0),
    failed: 0,
    errors: [],
  };

  console.log(
    "VAXERON INVENTORY RECONCILIATION APPLIED:",
    response
  );

  return response;
}
/* =======================================================
   APPLY INVENTORY COST VALUATION
======================================================= */

export async function applyWineInventoryCostValuation({
  supabase,
  reconciliationRows,
}) {
  const valuationRows = (
    reconciliationRows || []
  ).filter(
    (row) =>
      row.wine?.id &&
      row.location?.id &&
      !row.isByTheGlass
  );

  if (valuationRows.length === 0) {
    return {
      updated: 0,
      failed: 0,
      totalCostValue: 0,
      errors: [],
    };
  }

  const aggregated = new Map();

  valuationRows.forEach((row) => {
    const key = [
      row.wine.id,
      row.location.id,
    ].join("::");

    if (!aggregated.has(key)) {
      aggregated.set(key, {
        wineId: row.wine.id,
        wineName:
          row.wine.name ||
          row.productName,
        locationId: row.location.id,
        costValue: 0,
        costPrice: 0,
      });
    }

    const target = aggregated.get(key);

    target.costValue += Number(
      row.businessQuantity || 0
    );

    if (
      Number(row.costPrice || 0) > 0
    ) {
      target.costPrice = Number(
        row.costPrice
      );
    }
  });

  const targets = [
    ...aggregated.values(),
  ];

  let updated = 0;
  const errors = [];
  const updatedAt =
    new Date().toISOString();

  for (const target of targets) {
    const {
      data: existing,
      error: lookupError,
    } = await supabase
      .from("wine_inventory")
      .select(`
        id,
        quantity
      `)
      .eq("wine_id", target.wineId)
      .eq(
        "location_id",
        target.locationId
      )
      .maybeSingle();

    if (lookupError) {
      errors.push({
        wineId: target.wineId,
        wineName: target.wineName,
        locationId:
          target.locationId,
        error: lookupError.message,
      });

      continue;
    }

    const payload = {
      cost_value:
        Math.round(
          Number(
            target.costValue || 0
          ) * 100
        ) / 100,

      cost_price:
        Number(
          target.costPrice || 0
        ) > 0
          ? Number(
              target.costPrice
            )
          : null,

      cost_updated_at:
        updatedAt,
    };

    const { error } = existing?.id
      ? await supabase
          .from("wine_inventory")
          .update(payload)
          .eq("id", existing.id)
      : await supabase
          .from("wine_inventory")
          .insert({
            wine_id:
              target.wineId,
            location_id:
              target.locationId,
            quantity: 0,
            ...payload,
          });

    if (error) {
      errors.push({
        wineId: target.wineId,
        wineName: target.wineName,
        locationId:
          target.locationId,
        error: error.message,
      });

      continue;
    }

    updated += 1;
  }

  const totalCostValue =
    targets.reduce(
      (sum, target) =>
        sum +
        Number(
          target.costValue || 0
        ),
      0
    );

  console.log(
    "VAXERON COST VALUATION IMPORT:",
    {
      requested: targets.length,
      updated,
      failed: errors.length,
      totalCostValue,
      errors: errors.slice(0, 10),
    }
  );

  return {
    updated,
    failed: errors.length,
    totalCostValue,
    errors,
  };
}
