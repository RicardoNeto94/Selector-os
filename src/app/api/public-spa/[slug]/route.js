import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server/requireAdministrator";
import { scopeTenantQuery } from "@/lib/server/tenantContext";
import { LEGACY_BURMAN_WORKSPACE } from "@/lib/tenancy/constants";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["selfcare", "treatments", "fnb"]);
const MISSING_TENANT_COLUMN_CODES = new Set(["42703", "PGRST204"]);

export async function GET(request, { params }) {
  const { slug } = await params;
  const type = new URL(request.url).searchParams.get("type");
  if (slug !== "burman" || !ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "Spa collection not found." }, { status: 404 });
  }

  try {
    const admin = createAdminClient();
    const tenant = { ...LEGACY_BURMAN_WORKSPACE, source: "membership" };
    let result = await loadSpaCollection(admin, type, tenant);
    if (result.error && MISSING_TENANT_COLUMN_CODES.has(result.error.code)) {
      result = await loadSpaCollection(admin, type, null);
    }
    if (result.error) throw result.error;

    return NextResponse.json(
      { categories: result.categories },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("PUBLIC SPA COLLECTION ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load the spa collection." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

async function loadSpaCollection(admin, type, tenant) {
  const categoriesQuery = admin
    .from("spa_categories")
    .select("*,spa_products(*)")
    .eq("type", type)
    .order("position");
  const { data: categories = [], error } = await scopeTenantQuery(
    categoriesQuery,
    tenant
  );
  if (error) return { categories: [], error };
  if (type !== "selfcare") return { categories, error: null };

  const productIds = categories
    .flatMap((category) => category.spa_products || [])
    .map((product) => product.id)
    .filter(Boolean);
  if (productIds.length === 0) return { categories, error: null };

  const variantsQuery = admin
    .from("spa_product_variants")
    .select("*")
    .in("product_id", productIds)
    .order("position");
  const { data: variants = [], error: variantsError } = await scopeTenantQuery(
    variantsQuery,
    tenant
  );
  if (variantsError) return { categories: [], error: variantsError };

  return {
    categories: categories.map((category) => ({
      ...category,
      spa_products: (category.spa_products || []).map((product) => ({
        ...product,
        variants: variants.filter((variant) => variant.product_id === product.id),
      })),
    })),
    error: null,
  };
}
