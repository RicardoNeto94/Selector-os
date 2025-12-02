// src/app/api/restaurant-meta/[slug]/route.js

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const slug = params?.slug;

  if (!slug) {
    return NextResponse.json(
      { error: "Missing restaurant slug" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    console.error("restaurant-meta error", error);
    return NextResponse.json(
      { error: "Restaurant not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
