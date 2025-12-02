import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// ⚠️ SERVER-SIDE ONLY: service role key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export async function POST(req, { params }) {
  try {
    const slug = params?.slug;
    if (!slug) {
      return NextResponse.json(
        { error: "Missing restaurant slug" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "Missing file field 'file' in form data" },
        { status: 400 }
      );
    }

    const fileExt = file.name.split(".").pop();
    const path = `logos/${slug}-${Date.now()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1) Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("restaurant-assets")              // 🔥 bucket name – create this if not existing
      .upload(path, buffer, {
        contentType: file.type || "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Logo upload error", uploadError);
      return NextResponse.json(
        { error: "Failed to upload to storage", details: uploadError.message },
        { status: 500 }
      );
    }

    // 2) Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("restaurant-assets").getPublicUrl(path);

    // 3) Save URL in restaurants table
    const { data: restaurant, error: updateError } = await supabase
      .from("restaurants")
      .update({ logo_url: publicUrl })        // 🔥 requires logo_url column
      .eq("slug", slug)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("Update restaurant.logo_url error", updateError);
      return NextResponse.json(
        {
          error: "Failed to update restaurant logo URL",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        logoUrl: publicUrl,
        restaurant,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected logo upload error", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err.message },
      { status: 500 }
    );
  }
}
