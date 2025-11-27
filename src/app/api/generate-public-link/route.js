import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // 1. Get logged in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 2. Get the restaurant linked to the user
    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (restError || !restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // 3. Generate slug (reuse if exists)
    const slug = restaurant.public_slug || `r-${nanoid(10)}`;

    // 4. Save slug
    const { error: updateError } = await supabase
      .from("restaurants")
      .update({ public_slug: slug })
      .eq("id", restaurant.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update slug" },
        { status: 500 }
      );
    }

    // 5. Return full public URL
    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/r/${slug}/menu`;

    return NextResponse.json({ slug, url });
  } catch (err) {
    console.error("Public link error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
