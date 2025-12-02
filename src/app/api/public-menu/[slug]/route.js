import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// ⚠️ service role key – SERVER SIDE ONLY
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

// This code runs only on the server, so the service key is not exposed to the browser.
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

  // --- Normalize shape for GuestMenu --------------------------
  const raw = data ?? [];

  let logoUrl = null;
  let dishes = [];

  // If in future menu_for_slug returns { logo_url, dishes }
  if (raw && !Array.isArray(raw) && Array.isArray(raw.dishes)) {
    logoUrl = raw.logo_url ?? null;
    dishes = raw.dishes;
  } else {
    // current behaviour: just an array of dishes
    dishes = Array.isArray(raw) ? raw : [];
  }

  return NextResponse.json({
    logo_url: logoUrl,
    dishes,
  });
}
