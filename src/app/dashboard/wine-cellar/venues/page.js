"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import "./venue-wines.css";

export default function VenueWinesPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [locations, setLocations] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [menus, setMenus] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingLocationId, setSavingLocationId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [
      locationsResult,
      inventoryResult,
      menusResult,
      menuItemsResult,
    ] = await Promise.all([
      supabase
        .from("wine_locations")
        .select("*")
        .eq("is_active", true)
        .order("name"),

      supabase
        .from("wine_inventory")
        .select(`
          id,
          wine_id,
          location_id,
          quantity,
          wines (
            id,
            name,
            producer,
            vintage,
            price,
            wine_type
          )
        `),

      supabase
        .from("wine_menus")
        .select("*")
        .order("name"),

      supabase
        .from("wine_menu_items")
        .select(`
          id,
          wine_menu_id,
          wine_id,
          service_type,
          glass_price,
          price_override
        `),
    ]);

    if (locationsResult.error) {
      console.error(
        "LOCATIONS ERROR:",
        locationsResult.error
      );
    }

    if (inventoryResult.error) {
      console.error(
        "INVENTORY ERROR:",
        inventoryResult.error
      );
    }

    if (menusResult.error) {
      console.error(
        "MENUS ERROR:",
        menusResult.error
      );
    }

    if (menuItemsResult.error) {
      console.error(
        "MENU ITEMS ERROR:",
        menuItemsResult.error
      );
    }

    setLocations(locationsResult.data || []);
    setInventory(inventoryResult.data || []);
    setMenus(menusResult.data || []);
    setMenuItems(menuItemsResult.data || []);

    setLoading(false);
  }

  const venueLocations = useMemo(() => {
    return locations.filter((location) => {
      const name = location.name?.toLowerCase() || "";

      return !name.includes("main cellar");
    });
  }, [locations]);

  async function linkMenu(locationId, wineMenuId) {
    setSavingLocationId(locationId);

    const menuId = wineMenuId || null;

    const { error } = await supabase
      .from("wine_locations")
      .update({
        wine_menu_id: menuId,
      })
      .eq("id", locationId);

    if (error) {
      console.error("LINK MENU ERROR:", error);
      setSavingLocationId(null);
      return;
    }

    setLocations((prev) =>
      prev.map((location) =>
        location.id === locationId
          ? {
              ...location,
              wine_menu_id: menuId,
            }
          : location
      )
    );

    setSavingLocationId(null);
  }

  function getVenueStats(location) {
    const venueInventory = inventory.filter(
      (item) => item.location_id === location.id
    );

    const availableInventory = venueInventory.filter(
      (item) => Number(item.quantity || 0) > 0
    );

    const totalBottles = availableInventory.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0),
      0
    );

    const stockValue = availableInventory.reduce(
      (sum, item) => {
        const price = Number(item.wines?.price || 0);
        const quantity = Number(item.quantity || 0);

        return sum + price * quantity;
      },
      0
    );

    const lowStock = availableInventory.filter(
      (item) => {
        const quantity = Number(item.quantity || 0);

        return quantity > 0 && quantity <= 2;
      }
    ).length;

    const venueMenu = location.wine_menu_id
      ? menus.find(
          (menu) => menu.id === location.wine_menu_id
        )
      : null;

    const venueMenuItems = venueMenu
      ? menuItems.filter(
          (item) =>
            item.wine_menu_id === venueMenu.id
        )
      : [];

    const availableWineIds = new Set(
  availableInventory.map((item) =>
    String(item.wine_id)
  )
);

    const byTheGlass = venueMenuItems.filter((item) => {
  const wineId = String(item.wine_id);

  const serviceType = String(
    item.service_type || ""
  )
    .trim()
    .toLowerCase();

  return (
    availableWineIds.has(wineId) &&
    (
      serviceType === "glass" ||
      serviceType === "both"
    )
  );
}).length;

console.log("VENUE BTG OVERVIEW DEBUG", {
  venue: location.name,

  locationId: location.id,

  menuId: location.wine_menu_id,

  availableWineIds:
    availableWineIds.size,

  linkedMenuItems:
    venueMenuItems.length,

  serviceTypes: [
    ...new Set(
      venueMenuItems.map((item) =>
        String(item.service_type || "")
          .trim()
          .toLowerCase()
      )
    ),
  ],

  glassCandidates:
    venueMenuItems.filter((item) => {
      const serviceType = String(
        item.service_type || ""
      )
        .trim()
        .toLowerCase();

      return (
        serviceType === "glass" ||
        serviceType === "both"
      );
    }).length,

  byTheGlass,
});

    const liveGuestWines = venueMenuItems.filter(
      (item) => availableWineIds.has(item.wine_id)
    ).length;

    return {
      availableWines: availableInventory.length,
      totalBottles,
      stockValue,
      lowStock,
      byTheGlass,
      liveGuestWines,
      menu: venueMenu,
    };
  }

  if (loading) {
    return (
      <div className="page-fade px-8 py-8">
        <div className="text-slate-400">
          Loading venue wines...
        </div>
      </div>
    );
  }

  const portfolioStats = venueLocations.reduce((total, location) => {
    const stats = getVenueStats(location);
    total.wines += stats.availableWines;
    total.live += stats.liveGuestWines;
    total.btg += stats.byTheGlass;
    total.value += stats.stockValue;
    return total;
  }, { wines: 0, live: 0, btg: 0, value: 0 });

  return (
    <div className="venue-wines-page page-fade">
      <div className="venue-wines-shell">
        <header className="venue-wines-header">
          <div>
            <div className="venue-wines-eyebrow">Wine Operations</div>
            <h1>Venue Wines</h1>
            <p>Live cellar portfolios, menu connections and guest availability across every wine venue.</p>
          </div>
          <div className="venue-wines-portfolio">
            <span>{venueLocations.length} cellars</span><span>{portfolioStats.wines.toLocaleString()} wines</span><span>{portfolioStats.btg.toLocaleString()} BTG</span><strong>€{Math.round(portfolioStats.value).toLocaleString()}</strong>
          </div>
        </header>

        {venueLocations.length === 0 ? (
          <div className="venue-wines-empty">No venue wine locations found.</div>
        ) : (
          <section className="venue-directory">
            <div className="venue-directory-head"><span>Venue</span><span>Wine menu</span><span>Portfolio</span><span>Inventory value</span><span /></div>
            {venueLocations.map((location) => {
              const stats = getVenueStats(location);
              return (
                <article key={location.id} className="venue-directory-row">
                  <div className="venue-identity">
                    <div className="venue-status-line"><span className={stats.menu ? "venue-status-dot is-linked" : "venue-status-dot"} /><span>{stats.menu ? "Menu linked" : "Menu not linked"}</span></div>
                    <h2>{location.name}</h2>
                    <div className="venue-mobile-value">€{Math.round(stats.stockValue).toLocaleString()}<span>{stats.totalBottles.toLocaleString()} bottles</span></div>
                  </div>
                  <div className="venue-menu-control">
                    <label htmlFor={`venue-menu-${location.id}`}>Wine menu</label>
                    <select id={`venue-menu-${location.id}`} value={location.wine_menu_id || ""} disabled={savingLocationId === location.id} onChange={(e) => linkMenu(location.id, e.target.value)}>
                      <option value="">No wine menu linked</option>
                      {menus.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}</option>)}
                    </select>
                  </div>
                  <div className="venue-metrics">
                    <div><strong>{stats.availableWines}</strong><span>Wines</span></div>
                    <div><strong>{stats.byTheGlass}</strong><span>BTG</span></div>
                    <div><strong>{stats.liveGuestWines}</strong><span>Live</span></div>
                    <div className={stats.lowStock > 0 ? "has-alert" : ""}><strong>{stats.lowStock}</strong><span>Low</span></div>
                  </div>
                  <div className="venue-value"><strong>€{Math.round(stats.stockValue).toLocaleString()}</strong><span>{stats.totalBottles.toLocaleString()} bottles</span></div>
                  <button className="venue-open-button" onClick={() => router.push(`/dashboard/wine-cellar/venues/${location.id}`)} aria-label={`Open ${location.name}`}><span>Open</span><span aria-hidden="true">↗</span></button>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}