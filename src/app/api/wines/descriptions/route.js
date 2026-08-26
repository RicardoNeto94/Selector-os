import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/server/requireAdministrator";
import { scopeTenantQuery } from "@/lib/server/tenantContext";

export const dynamic = "force-dynamic";

const GENERATION_LIMIT = 24;
const DESCRIPTION_MAX_LENGTH = 420;

function cleanText(value, maxLength = DESCRIPTION_MAX_LENGTH) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function extractResponseText(payload) {
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && content.text) return content.text;
    }
  }
  return "";
}

async function loadEligibleWines(admin, tenant, locationId, requestedWineIds = []) {
  const locationQuery = admin
    .from("wine_locations")
    .select("id,name,wine_menu_id")
    .eq("id", locationId);
  const { data: location, error: locationError } = await scopeTenantQuery(
    locationQuery,
    tenant
  ).maybeSingle();
  if (locationError) throw locationError;
  if (!location?.wine_menu_id) {
    return { location, wines: [], reason: "This location does not have a guest wine menu linked." };
  }

  const inventoryQuery = admin
    .from("wine_inventory")
    .select("wine_id,quantity")
    .eq("location_id", locationId)
    .gt("quantity", 0);
  const { data: inventory, error: inventoryError } = await scopeTenantQuery(
    inventoryQuery,
    tenant
  );
  if (inventoryError) throw inventoryError;

  const stockedIds = new Set((inventory || []).map((row) => String(row.wine_id)));
  const requested = new Set((requestedWineIds || []).map(String));
  const menuItemsQuery = admin
    .from("wine_menu_items")
    .select("id,wine_id,description")
    .eq("wine_menu_id", location.wine_menu_id);
  const { data: menuItems, error: menuItemsError } = await scopeTenantQuery(
    menuItemsQuery,
    tenant
  );
  if (menuItemsError) throw menuItemsError;

  const eligibleItems = (menuItems || []).filter((item) => {
    const wineId = String(item.wine_id);
    return stockedIds.has(wineId) && (!requested.size || requested.has(wineId));
  });
  const wineIds = [...new Set(eligibleItems.map((item) => item.wine_id))];
  if (!wineIds.length) return { location, wines: [] };

  const winesQuery = admin
    .from("wines")
    .select("id,name,producer,vintage,region,country,grape,wine_type,size,description")
    .in("id", wineIds);
  const { data: wines, error: winesError } = await scopeTenantQuery(
    winesQuery,
    tenant
  );
  if (winesError) throw winesError;

  const menuItemByWine = new Map(eligibleItems.map((item) => [String(item.wine_id), item]));
  return {
    location,
    wines: (wines || []).filter((wine) => {
      const override = menuItemByWine.get(String(wine.id))?.description;
      return !cleanText(override) && !cleanText(wine.description);
    }),
  };
}

async function generateDescriptions(wines, venueName) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured on the Vaxeron server.");
    error.status = 503;
    throw error;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_DESCRIPTION_MODEL || "gpt-5-mini",
      store: false,
      max_output_tokens: 3200,
      input: [
        {
          role: "developer",
          content: [{
            type: "input_text",
            text: [
              "You write concise, elegant English descriptions for a luxury hospitality wine list.",
              "Use only facts explicitly provided in the wine record.",
              "Write one or two natural sentences, normally 18 to 42 words.",
              "Do not invent tasting notes, aromas, sweetness, ageing, production methods, classifications, awards, vintages, grapes, origins, food pairings, or prestige claims.",
              "Do not mention stock, price, bottle size, the database, AI, missing information, or the venue name.",
              "Avoid repetitive openings across the batch. Return every requested wine exactly once.",
            ].join(" "),
          }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: JSON.stringify({ venue: venueName, wines }) }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "wine_guest_descriptions",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["descriptions"],
            properties: {
              descriptions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["wineId", "description"],
                  properties: { wineId: { type: "string" }, description: { type: "string" } },
                },
              },
            },
          },
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Description generation failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  const rawText = extractResponseText(payload);
  if (!rawText) throw new Error("The description model returned an empty response.");
  const parsed = JSON.parse(rawText);
  const allowedIds = new Set(wines.map((wine) => String(wine.id)));
  return (parsed.descriptions || [])
    .filter((item) => allowedIds.has(String(item.wineId)))
    .map((item) => ({ wineId: String(item.wineId), description: cleanText(item.description) }))
    .filter((item) => item.description);
}

export async function POST(request) {
  try {
    const { admin, tenant, error } = await requireAdministrator(request);
    if (error) return NextResponse.json({ error: error.message }, { status: error.status });

    const body = await request.json();
    const locationId = cleanText(body.locationId, 80);
    if (!locationId) return NextResponse.json({ error: "A location is required." }, { status: 400 });

    if (body.action === "generate") {
      const requestedWineIds = Array.isArray(body.wineIds) ? body.wineIds.slice(0, GENERATION_LIMIT) : [];
      const { location, wines, reason } = await loadEligibleWines(
        admin,
        tenant,
        locationId,
        requestedWineIds
      );
      if (reason) return NextResponse.json({ error: reason }, { status: 400 });

      const batch = wines.slice(0, GENERATION_LIMIT).map((wine) => ({
        id: String(wine.id),
        name: cleanText(wine.name, 180),
        producer: cleanText(wine.producer, 160) || null,
        vintage: cleanText(wine.vintage, 30) || null,
        region: cleanText(wine.region, 120) || null,
        country: cleanText(wine.country, 100) || null,
        grape: cleanText(wine.grape, 180) || null,
        wineType: cleanText(wine.wine_type, 80) || null,
      }));
      if (!batch.length) return NextResponse.json({ descriptions: [], remaining: 0 });

      const descriptions = await generateDescriptions(batch, location?.name || "");
      return NextResponse.json({
        descriptions: descriptions.map((item) => ({
          ...item,
          name: batch.find((wine) => wine.id === item.wineId)?.name || "Wine",
        })),
        remaining: Math.max(0, wines.length - batch.length),
      });
    }

    if (body.action === "apply") {
      const submitted = Array.isArray(body.descriptions) ? body.descriptions.slice(0, GENERATION_LIMIT) : [];
      const { wines, reason } = await loadEligibleWines(
        admin,
        tenant,
        locationId,
        submitted.map((item) => item.wineId)
      );
      if (reason) return NextResponse.json({ error: reason }, { status: 400 });
      const eligibleIds = new Set(wines.map((wine) => String(wine.id)));
      const approved = submitted
        .map((item) => ({ wineId: String(item.wineId), description: cleanText(item.description) }))
        .filter((item) => eligibleIds.has(item.wineId) && item.description);

      let updated = 0;
      for (const item of approved) {
        const updateQuery = admin
          .from("wines")
          .update({ description: item.description })
          .eq("id", item.wineId)
          .or("description.is.null,description.eq.");
        const { data, error: updateError } = await scopeTenantQuery(
          updateQuery,
          tenant
        )
          .select("id")
          .maybeSingle();
        if (updateError) throw updateError;
        if (data) updated += 1;
      }
      return NextResponse.json({ success: true, updated });
    }

    return NextResponse.json({ error: "Unsupported description action." }, { status: 400 });
  } catch (error) {
    console.error("WINE DESCRIPTION ASSISTANT ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to process wine descriptions." },
      { status: Number(error?.status) || 500 }
    );
  }
}
