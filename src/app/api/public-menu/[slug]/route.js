// src/app/api/public-menu/[slug]/route.js

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// FORCE REALTIME (NO CACHE)
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export async function GET(_req, { params }) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Missing restaurant slug" },
        { status: 400 }
      );
    }

    // Restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, logo_url")
      .eq("slug", slug)
      .maybeSingle();

    if (restaurantError) {
      console.error("Error fetching restaurant", restaurantError);

      return NextResponse.json(
        { error: "Failed to load restaurant" },
        { status: 500 }
      );
    }

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Dishes
    const { data: dishes, error: dishesError } = await supabase.rpc(
      "menu_for_slug",
      {
        slug_input: slug,
      }
    );

    if (dishesError) {
      console.error("menu_for_slug error", dishesError);

      return NextResponse.json(
        {
          error:
            dishesError.message ||
            "Failed to load menu",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        logo_url: restaurant.logo_url ?? null,
        dishes: dishes ?? [],
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err) {
    console.error("Unexpected error", err);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}