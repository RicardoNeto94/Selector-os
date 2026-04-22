import { createClient } from "@supabase/supabase-js";
import MenuClientView from "./MenuClientView";
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

  // 🔹 BASE MENU
  const { data: menu } = await supabase
    .from("menus")
    .select("*")
    .eq("public_slug", slug)
    .maybeSingle();

  // 🔥 SAVE SLUG FOR PWA (CLIENT SIDE)
  const SlugSaver = () => {
    "use client";
    if (typeof window !== "undefined") {
      localStorage.setItem("lastSlug", slug);
    }
    return null;
  };

  // 🔥 SELECTOR PAGE
  if (!type) {
    return (
      <>
        <SlugSaver />
        <LandingSelector slug={slug} menu={menu} />
      </>
    );
  }

  // 🔥 FILTER CATEGORIES
  const { data: categories } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("menu_id", menu.id)
    .eq("type", type)
    .order("position");

  // 🔹 ITEMS
  const { data: items } = await supabase
    .from("menu_items")
    .select("*")
    .eq("menu_id", menu.id)
    .eq("type", type)
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