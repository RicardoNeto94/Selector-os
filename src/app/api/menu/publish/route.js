// src/app/api/menu/publish/route.js

import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

function generateSlug() {
  // simple: 8-char random slug
  return Math.random().toString(36).slice(2, 10);
}

export async function POST(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User error:", userError);
      return Response.json({ error: "Not logged in" }, { status: 401 });
    }

    const body = await req.json();
    const menuId = body.menuId;

    if (!menuId) {
      return Response.json({ error: "menuId is required" }, { status: 400 });
    }

    // Check menu belongs to this user's restaurant
    const { data: menu, error: menuError } = await supabase
      .from("menus")
      .select("id, restaurant_id, public_slug")
      .eq("id", menuId)
      .maybeSingle();

    if (menuError || !menu) {
      console.error("Menu not found or error:", menuError);
      return Response.json({ error: "Menu not found" }, { status: 404 });
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, owner_id")
      .eq("id", menu.restaurant_id)
      .maybeSingle();

    if (restaurantError || !restaurant || restaurant.owner_id !== user.id) {
      console.error("Restaurant ownership error:", restaurantError);
      return Response.json({ error: "Not allowed to publish this menu" }, { status: 403 });
    }

    // Generate or reuse slug
    let slug = menu.public_slug;
    if (!slug) {
      slug = generateSlug();
      const { error: updateError } = await supabase
        .from("menus")
        .update({ public_slug: slug })
        .eq("id", menu.id);

      if (updateError) {
        console.error("Failed to save public_slug:", updateError);
        return Response.json(
          { error: "Failed to save public slug" },
          { status: 500 }
        );
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://selector-os.vercel.app";
    const publicUrl = `${baseUrl}/selector/${slug}`;

    return Response.json({ url: publicUrl, slug }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/menu/publish:", err);
    return Response.json(
      { error: "Unexpected error while publishing menu" },
      { status: 500 }
    );
  }
}
