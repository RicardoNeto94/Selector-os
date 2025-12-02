// src/app/api/restaurant-logo/route.js

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// ⚠️ service role key – server only
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const restaurantId = formData.get("restaurantId");

    if (!file || !restaurantId) {
      return NextResponse.json(
        { error: "Missing file or restaurantId" },
        { status: 400 }
      );
    }

    // basic type check
    if (
      !file.type.startsWith("image/") ||
      !["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)
    ) {
      return NextResponse.json(
        { error: "Only PNG, JPG, or SVG images are allowed." },
        { status: 400 }
      );
    }

    // build file path
    const ext = file.name.split(".").pop();
    const path = `restaurant-${restaurantId}-${Date.now()}.${ext || "png"}`;

    // upload to bucket "restaurant-logos"
    const { error: uploadError } = await supabase.storage
      .from("restaurant-logos")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Logo upload error", uploadError);
      return NextResponse.json(
        { error: "Failed to upload to storage" },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("restaurant-logos").getPublicUrl(path);

    // save URL in restaurants.logo_url
    const { data, error: updateError } = await supabase
      .from("restaurants")
      .update({ logo_url: publicUrl })
      .eq("id", restaurantId)
      .select("id, name, logo_url")
      .maybeSingle();

    if (updateError) {
      console.error("Update restaurant.logo_url error", updateError);
      return NextResponse.json(
        { error: "Failed to update restaurant logo" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, logo_url: data.logo_url },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected logo upload error", err);
    return NextResponse.json(
      { error: "Unexpected error uploading logo" },
      { status: 500 }
    );
  }
}
