import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server/requireAdministrator";
import { LEGACY_BURMAN_WORKSPACE } from "@/lib/tenancy/constants";

export const dynamic = "force-dynamic";

const BURMAN_SLUG = "burman-hotel";
const CACHE_HEADER = "public, max-age=30, stale-while-revalidate=120";

export async function GET(_request, { params }) {
  const { slug } = await params;

  // This endpoint intentionally exposes only the active Burman guest
  // experience. It is not a generic service-role proxy.
  if (slug !== BURMAN_SLUG) {
    return NextResponse.json({ error: "Experience not found." }, { status: 404 });
  }

  try {
    const admin = createAdminClient();
    const organizationId = LEGACY_BURMAN_WORKSPACE.organization.id;
    const propertyId = LEGACY_BURMAN_WORKSPACE.property.id;

    const { data: menu, error: menuError } = await admin
      .from("menus")
      .select("id,public_slug,design_type,is_active,organization_id,property_id")
      .eq("public_slug", BURMAN_SLUG)
      .eq("design_type", "burman")
      .eq("is_active", true)
      .eq("organization_id", organizationId)
      .eq("property_id", propertyId)
      .maybeSingle();

    if (menuError) throw menuError;
    if (!menu) {
      return NextResponse.json({ error: "Experience not found." }, { status: 404 });
    }

    const [categoriesResult, itemsResult, experiencesResult] = await Promise.all([
      admin
        .from("menu_categories")
        .select("id,name,description,position,type")
        .eq("menu_id", menu.id)
        .eq("organization_id", organizationId)
        .eq("property_id", propertyId)
        .order("position"),
      admin
        .from("menu_items")
        .select("id,category_id,name,description,duration,position,price,type")
        .eq("menu_id", menu.id)
        .eq("organization_id", organizationId)
        .eq("property_id", propertyId)
        .order("position"),
      admin
        .from("experiences")
        .select(`
          id,
          name,
          type,
          image_url,
          schedule,
          footer,
          position,
          experience_sections (
            id,
            name,
            position,
            type,
            experience_items (
              id,
              name,
              description,
              position,
              experience_prices (
                id,
                price,
                label,
                duration
              )
            )
          )
        `)
        .eq("is_active", true)
        .eq("organization_id", organizationId)
        .eq("property_id", propertyId)
        .order("position"),
    ]);

    if (categoriesResult.error) throw categoriesResult.error;
    if (itemsResult.error) throw itemsResult.error;
    if (experiencesResult.error) throw experiencesResult.error;

    const items = itemsResult.data || [];
    let prices = [];

    if (items.length > 0) {
      const { data, error } = await admin
        .from("menu_item_prices")
        .select("id,menu_item_id,label,price,position")
        .in("menu_item_id", items.map((item) => item.id))
        .eq("organization_id", organizationId)
        .eq("property_id", propertyId)
        .order("position");

      if (error) throw error;
      prices = data || [];
    }

    return NextResponse.json(
      {
        categories: categoriesResult.data || [],
        items,
        prices,
        experiences: experiencesResult.data || [],
      },
      { headers: { "Cache-Control": CACHE_HEADER } },
    );
  } catch (error) {
    console.error("PUBLIC BURMAN EXPERIENCE ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load the guest experience." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
