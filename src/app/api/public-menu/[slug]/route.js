// src/app/api/public-menu/[slug]/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// SERVER-ONLY key – safe here because this code never runs in the browser
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
  const slug = params?.slug;

  if (!slug) {
    return NextResponse.json(
      { error: "Missing restaurant slug" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("menu_for_slug", {
    slug_input: slug,
  });

  if (error) {
    console.error("menu_for_slug error", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to load menu",
        details: error,
      },
      { status: 500 }
    );
  }

  // For now: keep returning just the dishes array
  return NextResponse.json(data ?? []);
}
