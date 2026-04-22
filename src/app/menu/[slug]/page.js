import { createClient } from "@supabase/supabase-js";
import MenuClientView from "./MenuClientView";
import WineClientView from "@/app/wine/[slug]/WineClientView";
import LandingSelector from "./LandingSelector";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicMenuPage({ params, searchParams }) {

  const { slug } = await params;
  const { type } = await searchParams;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 🔹 FOOD MENU
  const { data: menu } = await supabase
    .from("menus")
    .select("*")
    .eq("public_slug", slug)
    .maybeSingle();

  // 🔹 WINE MENU
  const { data: wineMenu } = await supabase
    .from("wine_menus")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  // 🔥 SAVE SLUG FOR PWA
  const SlugSaver = () => {
    "use client";
    if (typeof window !== "undefined") {
      localStorage.setItem("lastSlug", slug);
    }
    return null;
  };

  // 🔥 SELECTOR PAGE (only for food menus)
  if (!type && menu) {
    return (
      <>
        <SlugSaver />
        <LandingSelector slug={slug} menu={menu} />
      </>
    );
  }

  // 🔥 FOOD MENU
  if (menu && type === "food") {

    const { data: categories } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("menu_id", menu.id)
      .eq("type", "food")
      .order("position");

    const { data: items } = await supabase
      .from("menu_items")
      .select("*")
      .eq("menu_id", menu.id)
      .eq("type", "food")
      .order("position");

    return (
      <main className="min-h-screen">
        <SlugSaver />
        <MenuClientView
          menu={menu}
          categories={categories || []}
          items={items || []}
        />
      </main>
    );
  }

  // 🔥 DRINKS (wine under food menu)
  if (menu && type === "drinks") {

    const { data: wineMenu } = await supabase
      .from("wine_menus")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!wineMenu) {
      return (
        <div className="min-h-screen flex items-center justify-center text-white">
          No drinks menu found
        </div>
      );
    }

    const { data: items } = await supabase
      .from("wine_menu_items")
      .select(`
        id,
        position,
        wine_id,
        wines:wine_id (
          id,
          name,
          producer,
          country,
          region,
          subregion,
          wine_type,
          grapes,
          vintage,
          price,
          description
        )
      `)
      .eq("wine_menu_id", wineMenu.id)
      .order("position");

    return (
      <main className="min-h-screen">
        <WineClientView
          menu={wineMenu}
          items={items || []}
        />
      </main>
    );
  }

  // 🔥 DIRECT WINE URL (QR CODE like /menu/shang-shi-wine)
  if (wineMenu) {

    const { data: items } = await supabase
      .from("wine_menu_items")
      .select(`
        id,
        position,
        wine_id,
        wines:wine_id (
          id,
          name,
          producer,
          country,
          region,
          subregion,
          wine_type,
          grapes,
          vintage,
          price,
          description
        )
      `)
      .eq("wine_menu_id", wineMenu.id)
      .order("position");

    return (
      <main className="min-h-screen">
        <WineClientView
          menu={wineMenu}
          items={items || []}
        />
      </main>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      Menu not found
    </div>
  );
}