import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

// MENU VIEWS
import FoxDenMenuView from "@/components/menus/FoxDenMenuView";
import ShangShiMenuView from "@/components/menus/ShangShiMenuView";
import ServiceMenuView from "@/components/menus/ServiceMenuView";

// LANDINGS
import FoxDenLanding from "@/components/menu-landings/FoxDenLanding";
import ShangShiLanding from "@/components/menu-landings/ShangShiLanding";
import BurmanLanding from "@/components/menu-landings/BurmanLanding";

export const dynamic = "force-dynamic";

export default async function PublicMenuPage({ params, searchParams }) {

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const slug = resolvedParams?.slug;
  const typeFromUrl = resolvedSearchParams?.type;

  if (slug === "shang-shi-wine") {
  redirect("/wine/shang-shi-wine");
}

if (slug === "koyo-wine") {
  redirect("/wine/koyo-wine");
}

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // LOAD MENU
  const { data: menu } = await supabase
    .from("menus")
    .select("*")
    .eq("public_slug", slug)
    .maybeSingle();

  if (!menu) {
    return <div style={{ padding: 40 }}>Menu not found</div>;
  }

  const design = menu.design_type || "foxden";

  // =========================
  // 🔥 FORCE BURMAN LANDING
  // =========================
  if (design === "burman" && !typeFromUrl) {
    return <BurmanLanding menu={menu} />;
  }

  // =========================
  // OTHER LANDINGS
  // =========================
  if (!typeFromUrl) {

    let LandingComponent;

    switch (design) {
      case "foxden":
        LandingComponent = FoxDenLanding;
        break;
      case "shangshi":
        LandingComponent = ShangShiLanding;
        break;
      default:
        LandingComponent = FoxDenLanding;
    }

    return <LandingComponent slug={slug} menu={menu} />;
  }

  // =========================
  // RESOLVE TYPE
  // =========================
  const type = typeFromUrl || menu.default_view || "food";

  // LOAD DATA
  const { data: categories = [] } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("menu_id", menu.id)
    .eq("type", type)
    .order("position");

  const { data: items = [] } = await supabase
    .from("menu_items")
    .select("*")
    .eq("menu_id", menu.id)
    .eq("type", type)
    .order("position");

  // =========================
  // SERVICES
  // =========================
  if (type === "services") {
    return (
      <ServiceMenuView
        menu={menu}
        categories={categories}
        items={items}
      />
    );
  }

  // =========================
  // NORMAL MENU
  // =========================
  let MenuComponent;

  switch (design) {
    case "foxden":
      MenuComponent = FoxDenMenuView;
      break;
    case "shangshi":
      MenuComponent = ShangShiMenuView;
      break;
      default:
      MenuComponent = FoxDenMenuView;
  }

  return (
    <MenuComponent
      menu={menu}
      categories={categories}
      items={items}
    />
  );
}