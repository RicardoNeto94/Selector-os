"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import "./venue-wines.css";

const PAGE_SIZE = 1000;

async function fetchAllRows(buildQuery) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery().range(
      from,
      from + PAGE_SIZE - 1
    );

    if (error) {
      throw error;
    }

    const page = data || [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString("en-IE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function VenueWinesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [locations, setLocations] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [menus, setMenus] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingLocationId, setSavingLocationId] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setLoadError("");

    try {
      const [
        locationsResult,
        menusResult,
        inventoryRows,
        menuItemRows,
      ] = await Promise.all([
        supabase
          .from("wine_locations")
          .select("*")
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("wine_menus")
          .select("*")
          .order("name"),

        fetchAllRows(() =>
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
            `)
            .order("id", { ascending: true })
        ),

        fetchAllRows(() =>
          supabase
            .from("wine_menu_items")
            .select(`
              id,
              wine_menu_id,
              wine_id,
              service_type,
              glass_price,
              price_override
            `)
            .order("id", { ascending: true })
        ),
      ]);

      if (locationsResult.error) {
        throw locationsResult.error;
      }

      if (menusResult.error) {
        throw menusResult.error;
      }

      setLocations(locationsResult.data || []);
      setInventory(inventoryRows);
      setMenus(menusResult.data || []);
      setMenuItems(menuItemRows);
    } catch (error) {
      console.error("VENUE WINES LOAD ERROR:", error);
      setLoadError(
        error?.message ||
          "Venue wine data could not be loaded."
      );
    } finally {
      setLoading(false);
    }
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

    setLocations((previous) =>
      previous.map((location) =>
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
      (item) =>
        String(item.location_id) ===
        String(location.id)
    );

    const inventoryByWine = new Map();

    venueInventory.forEach((item) => {
      const wineId = String(item.wine_id);
      const current = inventoryByWine.get(wineId);

      if (current) {
        current.quantity += Number(item.quantity || 0);

        if (!current.wines && item.wines) {
          current.wines = item.wines;
        }
      } else {
        inventoryByWine.set(wineId, {
          wine_id: wineId,
          quantity: Number(item.quantity || 0),
          wines: item.wines || null,
        });
      }
    });

    const allInventory = Array.from(
      inventoryByWine.values()
    );

    const availableInventory = allInventory.filter(
      (item) => Number(item.quantity || 0) > 0
    );

    const availableWineIds = new Set(
      availableInventory.map((item) =>
        String(item.wine_id)
      )
    );

    const totalBottles = availableInventory.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0),
      0
    );

    const netBottles = allInventory.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0),
      0
    );

    const negativeQuantity = allInventory
      .filter(
        (item) => Number(item.quantity || 0) < 0
      )
      .reduce(
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
          (menu) =>
            String(menu.id) ===
            String(location.wine_menu_id)
        )
      : null;

    const venueMenuItems = venueMenu
      ? menuItems.filter(
          (item) =>
            String(item.wine_menu_id) ===
            String(venueMenu.id)
        )
      : [];

    const menuWineMap = new Map();

    venueMenuItems.forEach((item) => {
      const wineId = String(item.wine_id);

      const serviceType = String(
        item.service_type || ""
      )
        .trim()
        .toLowerCase();

      const current = menuWineMap.get(wineId) || {
        wine_id: wineId,
        isBtg: false,
      };

      if (
        serviceType === "glass" ||
        serviceType === "both"
      ) {
        current.isBtg = true;
      }

      menuWineMap.set(wineId, current);
    });

    const distinctMenuWines = Array.from(
      menuWineMap.values()
    );

    const liveGuestWines = distinctMenuWines.filter(
      (item) =>
        availableWineIds.has(
          String(item.wine_id)
        )
    ).length;

    const byTheGlass = distinctMenuWines.filter(
      (item) =>
        item.isBtg &&
        availableWineIds.has(
          String(item.wine_id)
        )
    ).length;

    return {
      availableWines: availableInventory.length,
      totalBottles,
      netBottles,
      negativeQuantity,
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

  if (loadError) {
    return (
      <div className="page-fade px-8 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {loadError}
        </div>
      </div>
    );
  }

  const portfolioStats = venueLocations.reduce(
    (total, location) => {
      const stats = getVenueStats(location);

      total.wines += stats.availableWines;
      total.live += stats.liveGuestWines;
      total.btg += stats.byTheGlass;
      total.value += stats.stockValue;

      return total;
    },
    {
      wines: 0,
      live: 0,
      btg: 0,
      value: 0,
    }
  );

  return (
    <div className="venue-wines-page page-fade">
      <div className="venue-wines-shell">
        <header className="venue-wines-header">
          <div>
            <div className="venue-wines-eyebrow">
              Wine Operations
            </div>

            <h1>Venue Wines</h1>

            <p>
              Live cellar portfolios, menu connections and guest
              availability across every wine venue.
            </p>
          </div>

          <div className="venue-wines-portfolio">
            <span>{venueLocations.length} cellars</span>
            <span>
              {portfolioStats.wines.toLocaleString()} wines
            </span>
            <span>
              {portfolioStats.btg.toLocaleString()} BTG
            </span>
            <strong>
              €
              {Math.round(
                portfolioStats.value
              ).toLocaleString()}
            </strong>
          </div>
        </header>

        {venueLocations.length === 0 ? (
          <div className="venue-wines-empty">
            No venue wine locations found.
          </div>
        ) : (
          <section className="venue-directory">
            <div className="venue-directory-head">
              <span>Venue</span>
              <span>Wine menu</span>
              <span>Portfolio</span>
              <span>Inventory value</span>
              <span />
            </div>

            {venueLocations.map((location) => {
              const stats = getVenueStats(location);

              return (
                <article
                  key={location.id}
                  className="venue-directory-row"
                >
                  <div className="venue-identity">
                    <div className="venue-status-line">
                      <span
                        className={
                          stats.menu
                            ? "venue-status-dot is-linked"
                            : "venue-status-dot"
                        }
                      />

                      <span>
                        {stats.menu
                          ? "Menu linked"
                          : "Menu not linked"}
                      </span>
                    </div>

                    <h2>{location.name}</h2>

                    <div className="venue-mobile-value">
                      €
                      {Math.round(
                        stats.stockValue
                      ).toLocaleString()}

                      <span>
                        {formatQuantity(
                          stats.totalBottles
                        )}{" "}
                        positive bottles
                      </span>
                    </div>
                  </div>

                  <div className="venue-menu-control">
                    <label
                      htmlFor={`venue-menu-${location.id}`}
                    >
                      Wine menu
                    </label>

                    <select
                      id={`venue-menu-${location.id}`}
                      value={location.wine_menu_id || ""}
                      disabled={
                        savingLocationId === location.id
                      }
                      onChange={(event) =>
                        linkMenu(
                          location.id,
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        No wine menu linked
                      </option>

                      {menus.map((menu) => (
                        <option
                          key={menu.id}
                          value={menu.id}
                        >
                          {menu.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="venue-metrics">
                    <div>
                      <strong>{stats.availableWines}</strong>
                      <span>Wines</span>
                    </div>

                    <div>
                      <strong>{stats.byTheGlass}</strong>
                      <span>BTG</span>
                    </div>

                    <div>
                      <strong>{stats.liveGuestWines}</strong>
                      <span>Live</span>
                    </div>

                    <div
                      className={
                        stats.lowStock > 0
                          ? "has-alert"
                          : ""
                      }
                    >
                      <strong>{stats.lowStock}</strong>
                      <span>Low</span>
                    </div>
                  </div>

                  <div className="venue-value">
                    <strong>
                      €
                      {Math.round(
                        stats.stockValue
                      ).toLocaleString()}
                    </strong>

                    <span>
                      {formatQuantity(
                        stats.totalBottles
                      )}{" "}
                      positive bottles
                    </span>

                    {stats.negativeQuantity < 0 && (
                      <span
                        title={`Net stock: ${formatQuantity(
                          stats.netBottles
                        )}`}
                      >
                        {formatQuantity(
                          stats.negativeQuantity
                        )}{" "}
                        negative
                      </span>
                    )}
                  </div>

                  <button
                    className="venue-open-button"
                    onClick={() =>
                      router.push(
                        `/dashboard/wine-cellar/venues/${location.id}`
                      )
                    }
                    aria-label={`Open ${location.name}`}
                  >
                    <span>Open</span>
                    <span aria-hidden="true">↗</span>
                  </button>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}