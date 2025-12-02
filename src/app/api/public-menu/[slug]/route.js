// src/app/api/public-menu/[slug]/route.js

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// SERVER-SIDE ONLY service role key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

// Runs only on the server, so the service key is not exposed to the browser.
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export async function GET(_req, { params }) {
  try {
    const slug = params?.slug;

    if (!slug) {
      return NextResponse.json(
        { error: "Missing restaurant slug" },
        { status: 400 }
      );
    }

    // 1) Get restaurant so we can read logo_url
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, logo_url")
      .eq("slug", slug)
      .maybeSingle();

    if (restaurantError) {
      console.error("Error fetching restaurant for public menu", restaurantError);
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

    // 2) Get dishes (existing RPC)
    const { data: dishes, error: dishesError } = await supabase.rpc(
      "menu_for_slug",
      { slug_input: slug }
    );

    if (dishesError) {
      console.error("menu_for_slug error", dishesError);
      return NextResponse.json(
        {
          error: dishesError.message || "Failed to load menu",
        },
        { status: 500 }
      );
    }

    // 3) Return both logo URL + dishes
    return NextResponse.json({
      logo_url: restaurant.logo_url ?? null,
      dishes: dishes ?? [],
    });
  } catch (err) {
    console.error("Unexpected error in public-menu route", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
