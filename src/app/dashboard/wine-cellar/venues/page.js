"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { bottleQuantity, positiveBottleQuantity } from "@/lib/wineInventory";
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

function PortfolioRing({ label, value, total, detail, tone = "sage" }) {
  const percentage = total > 0
    ? Math.min(100, Math.max(0, (Number(value || 0) / Number(total)) * 100))
    : 0;

  return (
    <div className={`venue-portfolio-ring is-${tone}`}>
      <div
        className="venue-ring-visual"
        style={{ "--venue-progress": `${percentage * 3.6}deg` }}
      >
        <div>
          <strong>{Math.round(percentage)}%</strong>
          <span>{detail}</span>
        </div>
      </div>
      <span>{label}</span>
    </div>
  );
}

export default function VenueWinesPage() {
  const supabase = createClient();
  const router = useRouter();

  const RESTAURANT_ID = "0a8fb8bb-b4c8-4f05-9874-929637521f58";

  const LOCATION_TYPES = [
    ["master_cellar", "Master cellar"],
    ["venue_cellar", "Venue cellar"],
    ["bar_storage", "Bar storage"],
    ["service_station", "Service station"],
    ["private_collection", "Private collection"],
    ["transit", "Transit"],
  ];

  const emptyForm = {
    name: "",
    location_type: "bar_storage",
    parent_location_id: "",
    wine_menu_id: "",
    slug: "",
    store_name: "",
  };

  const [locations, setLocations] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [menus, setMenus] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [storeMappings, setStoreMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingLocationId, setSavingLocationId] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [showArchived, setShowArchived] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationView, setLocationView] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [savingForm, setSavingForm] = useState(false);
  const [mappingDraft, setMappingDraft] = useState("");

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
        mappingsResult,
        inventoryRows,
        menuItemRows,
      ] = await Promise.all([
        supabase
          .from("wine_locations")
          .select("*")
          .order("is_active", { ascending: false })
          .order("name"),

        supabase
          .from("wine_menus")
          .select("*")
          .order("name"),

        supabase
          .from("wine_location_store_mappings")
          .select("*")
          .order("business_store_name"),

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

      if (locationsResult.error) throw locationsResult.error;
      if (menusResult.error) throw menusResult.error;
      if (mappingsResult.error) throw mappingsResult.error;

      setLocations(locationsResult.data || []);
      setInventory(inventoryRows);
      setMenus(menusResult.data || []);
      setStoreMappings(mappingsResult.data || []);
      setMenuItems(menuItemRows);
    } catch (error) {
      console.error("LOCATIONS LOAD ERROR:", error);
      setLoadError(
        error?.message ||
          "Wine location data could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  const activeLocations = useMemo(
    () => locations.filter((location) => location.is_active !== false),
    [locations]
  );

  const archiveFilteredLocations = useMemo(
    () =>
      showArchived
        ? locations
        : locations.filter((location) => location.is_active !== false),
    [locations, showArchived]
  );

  function getLocationTypeLabel(type) {
    return (
      LOCATION_TYPES.find(([value]) => value === type)?.[1] ||
      type ||
      "Storage"
    );
  }

  function getParentName(location) {
    if (!location.parent_location_id) return "No parent";

    return (
      locations.find(
        (item) =>
          String(item.id) ===
          String(location.parent_location_id)
      )?.name || "Unknown parent"
    );
  }

  function mappingsForLocation(locationId) {
    return storeMappings.filter(
      (mapping) =>
        String(mapping.location_id) === String(locationId)
    );
  }

  function resetEditor() {
    setEditingLocation(null);
    setForm(emptyForm);
    setMappingDraft("");
    setActionError("");
  }

  function openCreate() {
    setEditingLocation(null);
    setForm(emptyForm);
    setMappingDraft("");
    setActionError("");
    setActionMessage("");
    setShowCreate(true);
  }

  function openEdit(location) {
    setShowCreate(false);
    setEditingLocation(location);
    setForm({
      name: location.name || "",
      location_type: location.location_type || "bar_storage",
      parent_location_id: location.parent_location_id || "",
      wine_menu_id: location.wine_menu_id || "",
      slug: location.slug || "",
      store_name: "",
    });
    setMappingDraft("");
    setActionError("");
    setActionMessage("");
  }

  async function createLocation(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setActionError("Location name is required.");
      return;
    }

    setSavingForm(true);
    setActionError("");
    setActionMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "create_wine_location",
        {
          p_restaurant_id: RESTAURANT_ID,
          p_name: form.name.trim(),
          p_location_type: form.location_type,
          p_parent_location_id:
            form.parent_location_id || null,
          p_wine_menu_id: form.wine_menu_id || null,
          p_slug: form.slug.trim() || null,
        }
      );

      if (error) throw error;

      const created = Array.isArray(data) ? data[0] : data;

      if (form.store_name.trim() && created?.id) {
        const { error: mappingError } = await supabase.rpc(
          "add_wine_location_store_mapping",
          {
            p_location_id: created.id,
            p_business_store_name: form.store_name.trim(),
          }
        );

        if (mappingError) throw mappingError;
      }

      setShowCreate(false);
      setForm(emptyForm);
      setActionMessage("Storage location created.");
      await loadData();
    } catch (error) {
      console.error("CREATE LOCATION ERROR:", error);
      setActionError(
        error?.message || "Unable to create storage location."
      );
    } finally {
      setSavingForm(false);
    }
  }

  async function updateLocation(event) {
    event.preventDefault();

    if (!editingLocation?.id) return;

    if (!form.name.trim()) {
      setActionError("Location name is required.");
      return;
    }

    setSavingForm(true);
    setActionError("");
    setActionMessage("");

    try {
      const { error } = await supabase.rpc(
        "update_wine_location",
        {
          p_location_id: editingLocation.id,
          p_name: form.name.trim(),
          p_location_type: form.location_type,
          p_parent_location_id:
            form.parent_location_id || null,
          p_wine_menu_id: form.wine_menu_id || null,
          p_slug: form.slug.trim() || null,
        }
      );

      if (error) throw error;

      setActionMessage("Storage location updated.");
      setEditingLocation(null);
      setForm(emptyForm);
      await loadData();
    } catch (error) {
      console.error("UPDATE LOCATION ERROR:", error);
      setActionError(
        error?.message || "Unable to update storage location."
      );
    } finally {
      setSavingForm(false);
    }
  }

  async function archiveLocation(location) {
  const confirmed = window.confirm(
    `Archive ${location.name}? It can be restored later.`
  );

  if (!confirmed) return;

  setSavingLocationId(location.id);
  setActionError("");
  setActionMessage("");

  try {
    const { data, error } = await supabase.rpc(
      "archive_wine_location",
      {
        p_location_id: location.id,
      }
    );

    if (error) {
      console.error(
        "ARCHIVE LOCATION RPC ERROR:",
        JSON.stringify(error, null, 2)
      );

      throw new Error(
        error.message ||
          error.details ||
          error.hint ||
          "Unable to archive storage location."
      );
    }

    setActionMessage(`${location.name} archived.`);

    if (editingLocation?.id === location.id) {
      resetEditor();
    }

    await loadData();
  } catch (error) {
    console.error(
      "ARCHIVE LOCATION ERROR:",
      error?.message || error
    );

    setActionError(
      error?.message ||
        "Unable to archive storage location."
    );
  } finally {
    setSavingLocationId(null);
  }
}

  async function restoreLocation(location) {
    setSavingLocationId(location.id);
    setActionError("");
    setActionMessage("");

    try {
      const { error } = await supabase.rpc(
        "restore_wine_location",
        {
          p_location_id: location.id,
        }
      );

      if (error) throw error;

      setActionMessage(`${location.name} restored.`);
      await loadData();
    } catch (error) {
      console.error("RESTORE LOCATION ERROR:", error);
      setActionError(
        error?.message || "Unable to restore storage location."
      );
    } finally {
      setSavingLocationId(null);
    }
  }

  async function addMapping() {
    if (!editingLocation?.id || !mappingDraft.trim()) return;

    setSavingLocationId(editingLocation.id);
    setActionError("");
    setActionMessage("");

    try {
      const { error } = await supabase.rpc(
        "add_wine_location_store_mapping",
        {
          p_location_id: editingLocation.id,
          p_business_store_name: mappingDraft.trim(),
        }
      );

      if (error) throw error;

      setMappingDraft("");
      setActionMessage("CompuCash store mapping added.");
      await loadData();
    } catch (error) {
      console.error("ADD MAPPING ERROR:", error);
      setActionError(
        error?.message || "Unable to add store mapping."
      );
    } finally {
      setSavingLocationId(null);
    }
  }

  async function removeMapping(mapping) {
    const confirmed = window.confirm(
      `Remove mapping "${mapping.business_store_name}"?`
    );

    if (!confirmed) return;

    setSavingLocationId(mapping.location_id);
    setActionError("");
    setActionMessage("");

    try {
      const { error } = await supabase.rpc(
        "remove_wine_location_store_mapping",
        {
          p_mapping_id: mapping.id,
        }
      );

      if (error) throw error;

      setActionMessage("CompuCash store mapping removed.");
      await loadData();
    } catch (error) {
      console.error("REMOVE MAPPING ERROR:", error);
      setActionError(
        error?.message || "Unable to remove store mapping."
      );
    } finally {
      setSavingLocationId(null);
    }
  }

  async function linkMenu(locationId, wineMenuId) {
    const location = locations.find(
      (item) => String(item.id) === String(locationId)
    );

    if (!location) return;

    setSavingLocationId(locationId);
    setActionError("");

    const menuId = wineMenuId || null;

    const { data, error } = await supabase.rpc(
      "update_wine_location",
      {
        p_location_id: location.id,
        p_name: location.name,
        p_location_type:
          location.location_type || "bar_storage",
        p_parent_location_id:
          location.parent_location_id || null,
        p_wine_menu_id: menuId,
        p_slug: location.slug || null,
      }
    );

    if (error) {
      console.error("LINK MENU ERROR:", error);
      setActionError(
        error?.message || "Unable to link wine menu."
      );
      setSavingLocationId(null);
      return;
    }

    const updated = Array.isArray(data) ? data[0] : data;

    setLocations((previous) =>
      previous.map((item) =>
        item.id === locationId
          ? {
              ...item,
              ...(updated || {}),
              wine_menu_id: menuId,
            }
          : item
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
        current.quantity += bottleQuantity(item.quantity);

        if (!current.wines && item.wines) {
          current.wines = item.wines;
        }
      } else {
        inventoryByWine.set(wineId, {
          wine_id: wineId,
          quantity: bottleQuantity(item.quantity),
          wines: item.wines || null,
        });
      }
    });

    const allInventory = Array.from(
      inventoryByWine.values()
    );

    const availableInventory = allInventory.filter(
      (item) => positiveBottleQuantity(item.quantity) > 0
    );

    const availableWineIds = new Set(
      availableInventory.map((item) =>
        String(item.wine_id)
      )
    );

    const totalBottles = availableInventory.reduce(
      (sum, item) =>
        sum + positiveBottleQuantity(item.quantity),
      0
    );

    const netBottles = allInventory.reduce(
      (sum, item) =>
        sum + bottleQuantity(item.quantity),
      0
    );

    const negativeQuantity = allInventory
      .filter(
        (item) => bottleQuantity(item.quantity) < 0
      )
      .reduce(
        (sum, item) =>
          sum + bottleQuantity(item.quantity),
        0
      );

    const stockValue = availableInventory.reduce(
      (sum, item) => {
        const price = Number(item.wines?.price || 0);
        const quantity = positiveBottleQuantity(item.quantity);

        return sum + price * quantity;
      },
      0
    );

    const lowStock = availableInventory.filter(
      (item) => {
        const quantity = positiveBottleQuantity(item.quantity);

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

  const visibleLocations = archiveFilteredLocations.filter((location) => {
    const stats = getVenueStats(location);
    const query = locationSearch.trim().toLowerCase();
    const mappings = mappingsForLocation(location.id);
    const matchesSearch =
      !query ||
      [
        location.name,
        getLocationTypeLabel(location.location_type),
        stats.menu?.name,
        ...mappings.map((mapping) => mapping.business_store_name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);

    if (!matchesSearch) return false;
    if (locationView === "live") return stats.liveGuestWines > 0;
    if (locationView === "attention") {
      return !stats.menu || mappings.length === 0 || stats.negativeQuantity < 0;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="page-fade px-8 py-8">
        <div className="text-slate-400">
          Loading locations & storage...
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

  const portfolioStats = activeLocations.reduce(
    (total, location) => {
      const stats = getVenueStats(location);

      total.wines += stats.availableWines;
      total.live += stats.liveGuestWines;
      total.btg += stats.byTheGlass;
      total.value += stats.stockValue;
      total.attention +=
        !stats.menu ||
        mappingsForLocation(location.id).length === 0 ||
        stats.negativeQuantity < 0
          ? 1
          : 0;

      return total;
    },
    {
      wines: 0,
      live: 0,
      btg: 0,
      value: 0,
      attention: 0,
    }
  );

  const editorOpen = showCreate || Boolean(editingLocation);

  return (
    <div className="venue-wines-page">
      <div className="venue-wines-shell">
        <header className="venue-wines-header">
          <div>
            <div className="venue-wines-eyebrow">
              Wine Operations
            </div>

            <h1>Venue wine operations</h1>

            <p>
              See what is live for guests, spot setup or stock issues,
              and open the right venue workspace without hunting through data.
            </p>
          </div>

          <div className="venue-wines-portfolio" aria-label="Portfolio summary">
            <PortfolioRing
              label="Guest coverage"
              value={portfolioStats.live}
              total={portfolioStats.wines}
              detail={`${portfolioStats.live.toLocaleString()} live`}
            />
            <PortfolioRing
              label="Venue readiness"
              value={activeLocations.length - portfolioStats.attention}
              total={activeLocations.length}
              detail={`${activeLocations.length - portfolioStats.attention}/${activeLocations.length}`}
              tone={portfolioStats.attention ? "amber" : "sage"}
            />
            <div className="venue-portfolio-stat">
              <span>By the glass</span>
              <strong>{portfolioStats.btg.toLocaleString()}</strong>
              <small>servings live across the portfolio</small>
            </div>
            <div className={`venue-portfolio-stat ${portfolioStats.attention ? "has-attention" : ""}`}>
              <span>Needs attention</span>
              <strong>{portfolioStats.attention}</strong>
              <small>{portfolioStats.attention ? "setup or stock review" : "all systems ready"}</small>
            </div>
          </div>
        </header>

        <section className="venue-toolbar mt-5">
          <div className="venue-toolbar-primary">
            <label className="venue-search">
              <span className="sr-only">Search locations</span>
              <span aria-hidden="true">⌕</span>
              <input
                value={locationSearch}
                onChange={(event) => setLocationSearch(event.target.value)}
                placeholder="Search venue, menu or mapped store"
              />
            </label>

            <div className="venue-view-switcher" aria-label="Filter venues">
              {[
                ["all", "All"],
                ["live", "Guest live"],
                ["attention", `Needs attention (${portfolioStats.attention})`],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setLocationView(value)}
                  className={locationView === value ? "is-active" : ""}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="venue-toolbar-actions">
            <button
              type="button"
              onClick={openCreate}
              className="rounded-full bg-[#963d2d] px-5 py-2.5 text-[9px] uppercase tracking-[0.16em] text-white transition hover:bg-[#7f3327]"
            >
              Add location
            </button>

            <button
              type="button"
              onClick={() => setShowArchived((value) => !value)}
              className="rounded-full border border-[#d8c9bd] bg-[#fbf8f3] px-5 py-2.5 text-[9px] uppercase tracking-[0.14em] text-[#6e5a4f]"
            >
              {showArchived
                ? "Hide archived"
                : `Show archived (${locations.length - activeLocations.length})`}
            </button>
          </div>
        </section>

        {(actionError || actionMessage) && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-[10px] ${
              actionError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {actionError || actionMessage}
          </div>
        )}

        {editorOpen && (
          <div className="venue-editor-layer" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreate(false);
              resetEditor();
            }
          }}>
          <section className="venue-editor-modal rounded-[22px] border border-[#ded3c8] bg-[#fbf8f3] p-5 md:p-6" role="dialog" aria-modal="true" aria-label={showCreate ? "Create wine location" : `Manage ${editingLocation?.name || "location"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[8px] uppercase tracking-[0.24em] text-[#a17865]">
                  {showCreate ? "New storage point" : "Manage location"}
                </div>

                <h2 className="mt-2 text-[20px] tracking-[-0.03em] text-[#30241f]">
                  {showCreate
                    ? "Create wine location"
                    : editingLocation?.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  resetEditor();
                }}
                className="rounded-full border border-[#ded3c8] px-3 py-1.5 text-[9px] text-[#7f6e63]"
              >
                Close
              </button>
            </div>

            <form
              onSubmit={showCreate ? createLocation : updateLocation}
              className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              <label className="text-[9px] text-[#76655b]">
                <span className="mb-1.5 block uppercase tracking-[0.12em]">
                  Name
                </span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#d9cbc0] bg-white px-3 py-2.5 text-[11px] outline-none"
                  placeholder="e.g. Casino Bar"
                />
              </label>

              <label className="text-[9px] text-[#76655b]">
                <span className="mb-1.5 block uppercase tracking-[0.12em]">
                  Location type
                </span>
                <select
                  value={form.location_type}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      location_type: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#d9cbc0] bg-white px-3 py-2.5 text-[11px] outline-none"
                >
                  {LOCATION_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-[9px] text-[#76655b]">
                <span className="mb-1.5 block uppercase tracking-[0.12em]">
                  Parent location
                </span>
                <select
                  value={form.parent_location_id}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      parent_location_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#d9cbc0] bg-white px-3 py-2.5 text-[11px] outline-none"
                >
                  <option value="">No parent</option>
                  {activeLocations
                    .filter(
                      (location) =>
                        !editingLocation ||
                        location.id !== editingLocation.id
                    )
                    .map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                </select>
              </label>

              <label className="text-[9px] text-[#76655b]">
                <span className="mb-1.5 block uppercase tracking-[0.12em]">
                  Wine menu
                </span>
                <select
                  value={form.wine_menu_id}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      wine_menu_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#d9cbc0] bg-white px-3 py-2.5 text-[11px] outline-none"
                >
                  <option value="">No wine menu linked</option>
                  {menus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-[9px] text-[#76655b]">
                <span className="mb-1.5 block uppercase tracking-[0.12em]">
                  Slug
                </span>
                <input
                  value={form.slug}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      slug: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#d9cbc0] bg-white px-3 py-2.5 text-[11px] outline-none"
                  placeholder="Generated automatically"
                />
              </label>

              {showCreate && (
                <label className="text-[9px] text-[#76655b]">
                  <span className="mb-1.5 block uppercase tracking-[0.12em]">
                    Initial CompuCash store
                  </span>
                  <input
                    value={form.store_name}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        store_name: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[#d9cbc0] bg-white px-3 py-2.5 text-[11px] outline-none"
                    placeholder="Optional exact store name"
                  />
                </label>
              )}

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={savingForm}
                  className="min-h-10 rounded-full bg-[#30241f] px-5 text-[9px] uppercase tracking-[0.14em] text-white disabled:opacity-50"
                >
                  {savingForm
                    ? "Saving..."
                    : showCreate
                      ? "Create location"
                      : "Save changes"}
                </button>
              </div>
            </form>

            {editingLocation && (
              <div className="mt-6 border-t border-[#e7ddd4] pt-5">
                <div className="text-[8px] uppercase tracking-[0.2em] text-[#a17865]">
                  CompuCash store mappings
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {mappingsForLocation(editingLocation.id).length === 0 && (
                    <span className="text-[9px] text-[#97877c]">
                      No store mappings configured.
                    </span>
                  )}

                  {mappingsForLocation(editingLocation.id).map((mapping) => (
                    <span
                      key={mapping.id}
                      className="inline-flex items-center gap-2 rounded-full border border-[#ded3c8] bg-white px-3 py-1.5 text-[9px] text-[#5f5048]"
                    >
                      {mapping.business_store_name}
                      <button
                        type="button"
                        onClick={() => removeMapping(mapping)}
                        className="text-[#a34d3e]"
                        aria-label={`Remove ${mapping.business_store_name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex max-w-[520px] gap-2">
                  <input
                    value={mappingDraft}
                    onChange={(event) =>
                      setMappingDraft(event.target.value)
                    }
                    className="min-w-0 flex-1 rounded-xl border border-[#d9cbc0] bg-white px-3 py-2.5 text-[11px] outline-none"
                    placeholder="Exact CompuCash business store name"
                  />

                  <button
                    type="button"
                    onClick={addMapping}
                    disabled={
                      !mappingDraft.trim() ||
                      savingLocationId === editingLocation.id
                    }
                    className="rounded-full border border-[#cdb9aa] px-4 text-[9px] uppercase tracking-[0.12em] text-[#6e5a4f] disabled:opacity-50"
                  >
                    Add mapping
                  </button>
                </div>
              </div>
            )}
          </section>
          </div>
        )}

        {visibleLocations.length === 0 ? (
          <div className="venue-wines-empty">
            No locations match this view. Try another search or filter.
          </div>
        ) : (
          <section className="venue-directory">
            {visibleLocations.map((location) => {
              const stats = getVenueStats(location);
              const mappings = mappingsForLocation(location.id);
              const archived = location.is_active === false;
              const setupMissing = !stats.menu || mappings.length === 0;
              const stockIssue = stats.negativeQuantity < 0;
              const readinessLabel = archived
                ? "Archived"
                : stockIssue
                  ? "Stock review"
                  : setupMissing
                    ? "Setup needed"
                    : "Guest ready";

              return (
                <article
                  key={location.id}
                  className={`venue-directory-row ${
                    archived ? "opacity-60" : ""
                  }`}
                >
                  <div className="venue-card-topline">
                    <div className="venue-status-line">
                      <span
                        className={
                          archived
                            ? "venue-status-dot"
                            : stats.menu
                              ? "venue-status-dot is-linked"
                              : "venue-status-dot"
                        }
                      />

                      <span>
                        {archived
                          ? "Archived"
                          : readinessLabel}
                      </span>
                    </div>

                    <span className="venue-card-index">{String(visibleLocations.indexOf(location) + 1).padStart(2, "0")}</span>
                  </div>

                  <div className="venue-identity">
                    <h2>{location.name}</h2>

                    <div className="venue-identity-meta mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[8px]">
                      <span>
                        {getLocationTypeLabel(location.location_type)}
                      </span>
                      <span>Parent: {getParentName(location)}</span>
                      <span>
                        {mappings.length} store mapping
                        {mappings.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="venue-readiness-notes">
                      {!stats.menu && <span>No guest menu</span>}
                      {mappings.length === 0 && <span>No store mapping</span>}
                      {stockIssue && <span>Negative stock detected</span>}
                      {!setupMissing && !stockIssue && <span>Inventory and guest menu connected</span>}
                    </div>
                  </div>

                  <div className="venue-card-analytics">
                    <div
                      className="venue-card-ring"
                      style={{
                        "--venue-progress": `${(stats.availableWines > 0 ? Math.min(100, (stats.liveGuestWines / stats.availableWines) * 100) : 0) * 3.6}deg`,
                      }}
                    >
                      <div>
                        <strong>{stats.availableWines > 0 ? Math.round((stats.liveGuestWines / stats.availableWines) * 100) : 0}%</strong>
                        <span>guest live</span>
                      </div>
                    </div>

                    <div className="venue-metrics">
                      <div><strong>{stats.availableWines}</strong><span>Wines</span></div>
                      <div><strong>{stats.byTheGlass}</strong><span>BTG</span></div>
                      <div className={stats.lowStock > 0 ? "has-alert" : ""}><strong>{stats.lowStock}</strong><span>Low</span></div>
                    </div>
                  </div>

                  <div className="venue-card-value">
                    <div><span>Inventory value</span><strong>€{Math.round(stats.stockValue).toLocaleString()}</strong></div>
                    <div><span>Physical stock</span><strong>{formatQuantity(stats.totalBottles)} <small>btl</small></strong></div>
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
                        archived ||
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

                  <div className="venue-card-alerts">
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

                  <div className="venue-card-actions">
                    <button
                      type="button"
                      onClick={() => openEdit(location)}
                      className="venue-manage-button"
                    >
                      Manage
                    </button>

                    {archived ? (
                      <button
                        type="button"
                        disabled={savingLocationId === location.id}
                        onClick={() => restoreLocation(location)}
                        className="rounded-full border border-emerald-300 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-emerald-700 disabled:opacity-50"
                      >
                        Restore
                      </button>
                    ) : (
                      <>
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

                        <button
                          type="button"
                          disabled={savingLocationId === location.id}
                          onClick={() => archiveLocation(location)}
                          className="venue-archive-button"
                        >
                          Archive
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
