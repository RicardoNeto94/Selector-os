// src/app/api/menu/publish/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import crypto from "crypto";

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // 1) Read body
    const { menuId } = await req.json();

    if (!menuId) {
      return NextResponse.json(
        { error: "Missing menuId in request body" },
        { status: 400 }
      );
    }

    // 2) Get logged in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User error:", userError);
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    // 3) Get restaurant owned by this user
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, slug, name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (restaurantError) {
      console.error("Restaurant error:", restaurantError);
    }

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found for this user" },
        { status: 404 }
      );
    }

    // 4) Find the menu for this restaurant
    const { data: menu, error: menuError } = await supabase
      .from("menus")
      .select("id, name, public_slug")
      .eq("id", menuId)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();

    if (menuError) {
      console.error("Menu select error:", menuError);
    }

    if (!menu) {
      console.error("Menu not found with", {
        menuId,
        restaurantId: restaurant.id,
      });
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    // 5) Generate a slug if we don't have one yet
    let slug = menu.public_slug;

    if (!slug) {
      const safeName = menu.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const random = crypto.randomBytes(4).toString("hex");
      slug = `${safeName}-${random}`;

      const { error: updateError } = await supabase
        .from("menus")
        .update({ public_slug: slug })
        .eq("id", menu.id);

      if (updateError) {
        console.error("Failed to save public_slug:", updateError);
        return NextResponse.json(
          { error: "Could not save public link" },
          { status: 500 }
        );
      }
    }

    // 6) Build public URL (this is where guests will see the allergen tool)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const publicUrl = `${baseUrl}/selector/${slug}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("Stripe menu publish error (server):", err);
    return NextResponse.json(
      { error: "Failed to create billing portal session on server" },
      { status: 500 }
    );
  }
}
