import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(req) {
  const supabase = createRouteHandlerClient({ cookies });
  const body = await req.json();
  const { menuId } = body;

  if (!menuId) {
    return NextResponse.json({ error: "Missing menuId" }, { status: 400 });
  }

  // 1) get user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2) ensure this menu belongs to one of this user's restaurants
  const { data: menu, error: menuError } = await supabase
    .from("menus")
    .select("id, public_slug, restaurant_id, restaurants!inner(owner_id)")
    .eq("id", menuId)
    .eq("restaurants.owner_id", user.id)
    .maybeSingle();

  if (menuError || !menu) {
    return NextResponse.json({ error: "Menu not found" }, { status: 404 });
  }

  // 3) publish it
  const { error: updateError } = await supabase
    .from("menus")
    .update({ is_published: true })
    .eq("id", menuId);

  if (updateError) {
    console.error(updateError);
    return NextResponse.json(
      { error: "Failed to publish menu" },
      { status: 500 },
    );
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/t/${menu.public_slug}`;

  return NextResponse.json({ url: publicUrl });
}
