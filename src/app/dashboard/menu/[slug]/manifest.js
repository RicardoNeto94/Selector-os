import { createClient } from "@supabase/supabase-js";

export default async function manifest({ params }) {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { slug } = params;

  const { data: menu } = await supabase
    .from("menus")
    .select("restaurant_id")
    .eq("public_slug", slug)
    .maybeSingle();

  let logo = "/selectoros-logo.png";

  if (menu?.restaurant_id) {

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("logo_url")
      .eq("id", menu.restaurant_id)
      .maybeSingle();

    if (restaurant?.logo_url) {
      logo = restaurant.logo_url;
    }
  }

  return {
    name: "Restaurant Menu",
    short_name: "Menu",
    start_url: ".",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0F2744",
    icons: [
      {
        src: logo,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: logo,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}