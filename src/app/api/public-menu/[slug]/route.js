import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

export async function GET(_req, { params }) {
  const slug = params.slug;

  if (!slug) {
    return NextResponse.json(
      { error: "Missing restaurant slug" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("menu_for_slug", {
    slug_input: slug
  });

  if (error) {
    console.error("menu_for_slug error", error);
    return NextResponse.json(
      { error: "Failed to load menu" },
      { status: 500 }
    );
  }

  // Shape is already [{ name, category, description, allergens: [] }]
  return NextResponse.json(data ?? []);
}
