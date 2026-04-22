import { createClient } from "@supabase/supabase-js";
import MenuClientView from "./MenuClientView";
import WineClientView from "@/app/wine/[slug]/WineClientView";
import LandingSelector from "./LandingSelector";

export const dynamic = "force-dynamic";

export default async function PublicMenuPage({ params, searchParams }) {

  const { slug } = await params;
  const type = searchParams?.type;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 🔹 GET BASE MENU (for logo + fallback)
  const { data: menu } = await supabase
    .from("menus")
    .select("*")
    .eq("public_slug", slug)
    .maybeSingle();

  // 🔥 IF NO TYPE → SHOW SELECTOR
  if (!type) {
    return <LandingSelector slug={slug} menu={menu} />;
  }

  // 🔹 FOOD
  if (type === "food") {

    const { data: categories } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("menu_id", menu.id)
      .order("position");

    const { data: items } = await supabase
      .from("menu_items")
      .select("*")
      .eq("menu_id", menu.id)
      .order("position");

    return (
      <main className="min-h-screen">
        <MenuClientView
          menu={menu}
          categories={categories || []}
          items={items || []}
        />
      </main>
    );
  }

  // 🔹 DRINKS (wine menu)
  if (type === "drinks") {

    const { data: wineMenu } = await supabase
      .from("wine_menus")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

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