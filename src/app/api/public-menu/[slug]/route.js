import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Hard fail at build time if misconfigured
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
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
      { error: "Failed to load menu" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}
