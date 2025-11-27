// src/app/api/menu/publish/route.js
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // 1) Get logged in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth error:", userError);
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2) Parse body for menuId
    let body = {};
    try {
      body = await request.json();
    } catch {
      // if body is empty we'll handle below
    }

    const menuId = body?.menuId || body?.id;
    if (!menuId) {
      return Response.json(
        { error: "menuId is required in request body" },
        { status: 400 }
      );
    }

    // 3) Get restaurant for this user
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, slug")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      console.error("Restaurant error:", restaurantError);
      return Response.json(
        { error: "Restaurant not found for this user" },
        { status: 404 }
      );
    }

    // 4) Get the menu that belongs to this restaurant
    const { data: menu, error: menuError } = await supabase
      .from("menus")
      .select("id, name, public_url")
      .eq("id", menuId)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();

    if (menuError) {
      console.error("Menu query error:", menuError);
      return Response.json({ error: "Error loading menu" }, { status: 500 });
    }

    if (!menu) {
      return Response.json(
        { error: "Menu not found for this restaurant" },
        { status: 404 }
      );
    }

    // 5) Build public URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const restaurantSlug = restaurant.slug || restaurant.id;
    const publicUrl = `${baseUrl}/selector/${restaurantSlug}/${menu.id}`;

    // 6) Save to menus.public_url
    const { error: updateError } = await supabase
      .from("menus")
      .update({ public_url: publicUrl })
      .eq("id", menu.id)
      .eq("restaurant_id", restaurant.id);

    if (updateError) {
      console.error("Error saving public_url:", updateError);
      return Response.json(
        { error: "Failed to save public link" },
        { status: 500 }
      );
    }

    // 7) Return URL to client
    return Response.json({ url: publicUrl });
  } catch (err) {
    console.error("Publish route fatal error:", err);
    return Response.json(
      { error: "Unexpected error in publish route" },
      { status: 500 }
    );
  }
}
