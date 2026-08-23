"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function VenueWinePage() {
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();

  const locationId = params.locationId;

  const [location, setLocation] = useState(null);
  const [menu, setMenu] = useState(null);
  const [rows, setRows] = useState([]);
  const [btgSuggestions, setBtgSuggestions] = useState([]);
  const [sakePairings, setSakePairings] = useState([]);
  const [savingPairing, setSavingPairing] = useState(false);
  const [sakeStages, setSakeStages] = useState([]);
  const [stageSearch, setStageSearch] = useState({});

  const [loading, setLoading] = useState(true);
  const [savingWineId, setSavingWineId] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [workspaceTab, setWorkspaceTab] = useState("wines");
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 50;

  useEffect(() => {
    if (locationId) {
      loadData();
    }
  }, [locationId]);

  async function loadData() {
    setLoading(true);

    const { data: locationData, error: locationError } =
      await supabase
        .from("wine_locations")
        .select("*")
        .eq("id", locationId)
        .maybeSingle();

    if (locationError) {
      console.error("LOCATION ERROR:", locationError);
      setLoading(false);
      return;
    }

    if (!locationData) {
      setLoading(false);
      return;
    }

    setLocation(locationData);

    let menuData = null;

    if (locationData.wine_menu_id) {
      const { data, error } = await supabase
        .from("wine_menus")
        .select("*")
        .eq("id", locationData.wine_menu_id)
        .maybeSingle();

      if (error) {
        console.error("MENU ERROR:", error);
      }

      menuData = data || null;
    }

    setMenu(menuData);

    let pairingData = [];

    if (menuData) {
      const { data, error } = await supabase
        .from("sake_pairings")
        .select("*")
        .eq("wine_menu_id", menuData.id)
        .order("position", { ascending: true });

      if (error) console.error("SAKE PAIRINGS ERROR:", error);
      pairingData = data || [];
    }

    setSakePairings(pairingData);
    const pairingIds = pairingData.map((pairing) => pairing.id);
    if (pairingIds.length > 0) {
      const { data: stageData, error: stageError } = await supabase.from("sake_pairing_stages").select(`*, wines ( id, name, producer, vintage, region, country, wine_type )`).in("pairing_id", pairingIds).order("position", { ascending: true });
      if (stageError) console.error("SAKE STAGES ERROR:", stageError);
      setSakeStages(stageData || []);
    } else setSakeStages([]);

    const { data: inventoryData, error: inventoryError } =
      await supabase
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
            region,
            country,
            grape,
            wine_type,
            price,
            is_active
          )
        `)
        .eq("location_id", locationId)
        .gt("quantity", 0);

    if (inventoryError) {
      console.error("INVENTORY ERROR:", inventoryError);
    }

    let menuItemsData = [];

    if (menuData) {
      const { data, error } = await supabase
        .from("wine_menu_items")
        .select("*")
        .eq("wine_menu_id", menuData.id);

      if (error) {
        console.error("MENU ITEMS ERROR:", error);
      }

      menuItemsData = data || [];
    }

    const itemMap = new Map(
      menuItemsData.map((item) => [
        String(item.wine_id),
        item,
      ])
    );

    const {
      data: btgSuggestionData,
      error: btgSuggestionError,
    } = await supabase
      .from("wine_btg_suggestions")
      .select("*")
      .eq("location_id", locationId)
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      });

    if (btgSuggestionError) {
      console.error(
        "BTG SUGGESTIONS ERROR:",
        btgSuggestionError
      );
    }

    setBtgSuggestions(
      btgSuggestionData || []
    );

    const mappedRows = (inventoryData || [])
      .filter((inventory) => inventory.wines)
      .map((inventory) => {
        const wine = inventory.wines;

        const menuItem = itemMap.get(
          String(inventory.wine_id)
        );

        return {
          wineId: inventory.wine_id,
          inventoryId: inventory.id,

          name: wine.name || "",
          producer: wine.producer || "",
          vintage: wine.vintage || "",
          region: wine.region || "",
          country: wine.country || "",
          grape: wine.grape || "",
          wineType: wine.wine_type || "",

          stock: Number(inventory.quantity || 0),

          defaultPrice:
            wine.price !== null &&
            wine.price !== undefined
              ? Number(wine.price)
              : null,

          menuItemId: menuItem?.id || null,

          guestVisible: !!menuItem,

          serviceType:
            menuItem?.service_type || "bottle",

          bottlePrice:
            menuItem?.price_override !== null &&
            menuItem?.price_override !== undefined
              ? Number(menuItem.price_override)
              : wine.price !== null &&
                wine.price !== undefined
              ? Number(wine.price)
              : null,

          glassPrice:
            menuItem?.glass_price !== null &&
            menuItem?.glass_price !== undefined
              ? Number(menuItem.glass_price)
              : null,

          description: menuItem?.description || "",
        };
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );

    setRows(mappedRows);
    setLoading(false);
  }

  function updateLocalWine(wineId, field, value) {
    setRows((prev) =>
      prev.map((row) =>
        row.wineId === wineId
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  }

  async function enableGuestWine(row) {
    if (!menu) {
      alert(
        "This venue does not have a wine menu linked."
      );
      return;
    }

    setSavingWineId(row.wineId);

    const { data, error } = await supabase
      .from("wine_menu_items")
      .insert({
        wine_menu_id: menu.id,
        wine_id: row.wineId,
        quantity: 0,
        description: row.description || "",
        price_override: row.bottlePrice,
        service_type: row.serviceType || "bottle",
        glass_price:
          row.serviceType === "glass" ||
          row.serviceType === "both"
            ? row.glassPrice
            : null,
      })
      .select()
      .single();

    if (error) {
      console.error("ENABLE GUEST WINE ERROR:", error);
      alert("Unable to add wine to guest menu.");
      setSavingWineId(null);
      return;
    }

    setRows((prev) =>
      prev.map((item) =>
        item.wineId === row.wineId
          ? {
              ...item,
              menuItemId: data.id,
              guestVisible: true,
            }
          : item
      )
    );

    setSavingWineId(null);
  }

  async function disableGuestWine(row) {
    if (!row.menuItemId) return;

    setSavingWineId(row.wineId);

    const { error } = await supabase
      .from("wine_menu_items")
      .delete()
      .eq("id", row.menuItemId);

    if (error) {
      console.error("DISABLE GUEST WINE ERROR:", error);
      alert("Unable to remove wine from guest menu.");
      setSavingWineId(null);
      return;
    }

    setRows((prev) =>
      prev.map((item) =>
        item.wineId === row.wineId
          ? {
              ...item,
              menuItemId: null,
              guestVisible: false,
              serviceType: "bottle",
              glassPrice: null,
              description: "",
            }
          : item
      )
    );

    setSavingWineId(null);
  }

  async function toggleGuestWine(row) {
    if (row.guestVisible) {
      await disableGuestWine(row);
      return;
    }

    await enableGuestWine(row);
  }

  async function saveWine(row) {
    if (!row.guestVisible || !row.menuItemId) {
      return;
    }

    setSavingWineId(row.wineId);

    const { error } = await supabase
      .from("wine_menu_items")
      .update({
        description: row.description || "",
        price_override: row.bottlePrice,
        service_type: row.serviceType,
        glass_price:
          row.serviceType === "glass" ||
          row.serviceType === "both"
            ? row.glassPrice
            : null,
      })
      .eq("id", row.menuItemId);

    if (error) {
      console.error("SAVE WINE ERROR:", error);
      alert("Unable to save wine.");
      setSavingWineId(null);
      return;
    }

    setSavingWineId(null);
  }

  async function enableBtgSuggestion(suggestion) {
    if (!menu) {
      alert(
        "This venue does not have a wine menu linked."
      );
      return;
    }

    const row = rows.find(
      (item) =>
        item.wineId === suggestion.wine_id
    );

    if (!row) {
      alert(
        "This BTG wine is not currently available in venue inventory."
      );
      return;
    }

    setSavingWineId(row.wineId);

    const nextServiceType =
      row.guestVisible &&
      row.serviceType === "bottle"
        ? "both"
        : row.serviceType === "both"
        ? "both"
        : "glass";

    let menuItemId = row.menuItemId;

    if (row.guestVisible && row.menuItemId) {
      const { error } = await supabase
        .from("wine_menu_items")
        .update({
          service_type: nextServiceType,
        })
        .eq("id", row.menuItemId);

      if (error) {
        console.error(
          "ENABLE BTG MENU UPDATE ERROR:",
          error
        );
        alert("Unable to enable BTG wine.");
        setSavingWineId(null);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("wine_menu_items")
        .insert({
          wine_menu_id: menu.id,
          wine_id: row.wineId,
          quantity: 0,
          description: row.description || "",
          price_override: row.bottlePrice,
          service_type: nextServiceType,
          glass_price: null,
        })
        .select()
        .single();

      if (error) {
        console.error(
          "ENABLE BTG MENU INSERT ERROR:",
          error
        );
        alert("Unable to enable BTG wine.");
        setSavingWineId(null);
        return;
      }

      menuItemId = data.id;
    }

    const { error: suggestionError } =
      await supabase
        .from("wine_btg_suggestions")
        .update({
          status: "approved",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", suggestion.id);

    if (suggestionError) {
      console.error(
        "BTG SUGGESTION APPROVAL ERROR:",
        suggestionError
      );
      alert(
        "BTG was enabled, but the suggestion could not be marked approved."
      );
      setSavingWineId(null);
      return;
    }

    setRows((prev) =>
      prev.map((item) =>
        item.wineId === row.wineId
          ? {
              ...item,
              menuItemId,
              guestVisible: true,
              serviceType: nextServiceType,
            }
          : item
      )
    );

    setBtgSuggestions((prev) =>
      prev.filter(
        (item) => item.id !== suggestion.id
      )
    );

    setSavingWineId(null);
  }

  async function dismissBtgSuggestion(suggestion) {
    const { error } = await supabase
      .from("wine_btg_suggestions")
      .update({
        status: "dismissed",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", suggestion.id);

    if (error) {
      console.error(
        "DISMISS BTG SUGGESTION ERROR:",
        error
      );
      alert("Unable to dismiss BTG suggestion.");
      return;
    }

    setBtgSuggestions((prev) =>
      prev.filter(
        (item) => item.id !== suggestion.id
      )
    );
  }

  async function createSakePairing() {
    if (!menu) return alert("This venue does not have a wine menu linked.");

    setSavingPairing(true);

    const { data, error } = await supabase
      .from("sake_pairings")
      .insert({
        wine_menu_id: menu.id,
        name: "Koyo Signature Sake Pairing",
        description: "",
        price: null,
        status: "draft",
        is_featured: false,
        position: sakePairings.length,
      })
      .select()
      .single();

    if (error) {
      console.error("CREATE SAKE PAIRING ERROR:", error);
      alert("Unable to create sake pairing.");
    } else {
      setSakePairings((prev) => [...prev, data]);
    }

    setSavingPairing(false);
  }

  function updateLocalPairing(pairingId, field, value) {
    setSakePairings((prev) =>
      prev.map((pairing) =>
        pairing.id === pairingId
          ? { ...pairing, [field]: value }
          : pairing
      )
    );
  }

  async function saveSakePairing(pairing) {
    setSavingPairing(true);

    const { error } = await supabase
      .from("sake_pairings")
      .update({
        name: pairing.name,
        description: pairing.description || "",
        price: pairing.price === "" ? null : pairing.price,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pairing.id);

    if (error) {
      console.error("SAVE SAKE PAIRING ERROR:", error);
      alert("Unable to save sake pairing.");
    }

    setSavingPairing(false);
  }

  async function togglePairingStatus(pairing) {
    const status = pairing.status === "published" ? "draft" : "published";

    const { error } = await supabase
      .from("sake_pairings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", pairing.id);

    if (error) {
      console.error("PAIRING STATUS ERROR:", error);
      alert("Unable to update pairing status.");
      return;
    }

    updateLocalPairing(pairing.id, "status", status);
  }

  async function addSakeStage(pairing, wine) {
    const stages = sakeStages.filter((stage) => stage.pairing_id === pairing.id);
    const stageNumber = stages.length + 1;
    const { data, error } = await supabase.from("sake_pairing_stages").insert({ pairing_id: pairing.id, sake_wine_id: wine.id, stage_number: stageNumber, stage_name: `Stage ${stageNumber}`, description: "", position: stages.length }).select(`*, wines ( id, name, producer, vintage, region, country, wine_type )`).single();
    if (error) { console.error("ADD SAKE STAGE ERROR:", error); alert("Unable to add sake to pairing."); return; }
    setSakeStages((prev) => [...prev, data]);
    setStageSearch((prev) => ({ ...prev, [pairing.id]: "" }));
  }

  async function removeSakeStage(stage) {
    const { error } = await supabase.from("sake_pairing_stages").delete().eq("id", stage.id);
    if (error) { console.error("REMOVE SAKE STAGE ERROR:", error); return; }
    setSakeStages((prev) => prev.filter((item) => item.id !== stage.id));
  }

  const sakeCatalogue = useMemo(() => {
    return rows.map((row) => ({
      id: row.wineId,
      name: row.name,
      producer: row.producer,
      vintage: row.vintage,
      region: row.region,
      country: row.country,
      wine_type: row.wineType,
    }));
  }, [rows]);

  const dedupedBtgSuggestions = useMemo(() => {
    const priority = {
      confirmed: 2,
      opportunity: 1,
    };

    const suggestionMap = new Map();

    const availableWineIds = new Set(rows.map((row) => row.wineId));
    const enabledWineIds = new Set(
      rows
        .filter(
          (row) =>
            row.guestVisible &&
            (row.serviceType === "glass" || row.serviceType === "both")
        )
        .map((row) => row.wineId)
    );

    for (const suggestion of btgSuggestions) {
      if (
        enabledWineIds.has(suggestion.wine_id) ||
        (suggestion.suggestion_type !== "confirmed" &&
          !availableWineIds.has(suggestion.wine_id))
      ) {
        continue;
      }
      const key = [
        suggestion.wine_id || "",
        suggestion.location_id || "",
        Number(suggestion.serving_cl || 0),
      ].join("::");

      const existing = suggestionMap.get(key);

      if (
        !existing ||
        (priority[suggestion.suggestion_type] || 0) >
          (priority[existing.suggestion_type] || 0)
      ) {
        suggestionMap.set(key, suggestion);
      }
    }

    return Array.from(suggestionMap.values());
  }, [btgSuggestions, rows]);

  const confirmedBtgSuggestions = useMemo(
    () =>
      dedupedBtgSuggestions.filter(
        (suggestion) =>
          suggestion.suggestion_type === "confirmed"
      ),
    [dedupedBtgSuggestions]
  );

  const opportunityBtgSuggestions = useMemo(
    () =>
      dedupedBtgSuggestions.filter(
        (suggestion) =>
          suggestion.suggestion_type !== "confirmed"
      ),
    [dedupedBtgSuggestions]
  );

  const stats = useMemo(() => {
    const available = rows.length;

    const guestLive = rows.filter(
      (row) => row.guestVisible
    ).length;

    const byTheGlass = rows.filter(
      (row) =>
        row.guestVisible &&
        (row.serviceType === "glass" ||
          row.serviceType === "both")
    ).length;

    const lowStock = rows.filter(
      (row) => row.stock <= 2
    ).length;

    return {
      available,
      guestLive,
      byTheGlass,
      lowStock,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.toLowerCase().trim();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        row.name.toLowerCase().includes(query) ||
        row.producer.toLowerCase().includes(query) ||
        row.region.toLowerCase().includes(query) ||
        row.country.toLowerCase().includes(query);

      if (!matchesSearch) {
        return false;
      }

      if (filter === "live") {
        return row.guestVisible;
      }

      if (filter === "glass") {
        return (
          row.guestVisible &&
          (row.serviceType === "glass" ||
            row.serviceType === "both")
        );
      }

      if (filter === "hidden") {
        return !row.guestVisible;
      }

      if (filter === "low") {
        return row.stock <= 2;
      }

      return true;
    });
  }, [rows, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter, workspaceTab]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  if (loading) {
    return (
      <div className="page-fade px-8 py-8 text-slate-400">
        Loading venue wine cellar...
      </div>
    );
  }

  if (!location) {
    return (
      <div className="page-fade px-8 py-8">
        <div className="so-card p-8">
          Wine location not found.
        </div>
      </div>
    );
  }

  return (
    <div className="page-fade min-h-screen bg-[#f7f4ef]">
      <div className="max-w-[1780px] mx-auto px-5 md:px-8 lg:px-10 py-7 md:py-9">
        <button
          onClick={() =>
            router.push("/dashboard/wine-cellar/venues")
          }
          className="inline-flex items-center gap-2 text-[12px] font-medium text-[#8a6a59] hover:text-[#3a2a24] transition mb-7"
        >
          <span>←</span>
          <span>Venue Wines</span>
        </button>

        <section className="mb-7">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-[#a08371]">
                Wine Operations / Venue
              </div>

              <h1 className="text-[34px] md:text-[42px] leading-none font-semibold tracking-[-0.035em] text-[#2f221c] mt-3">
                {location.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#e5d9ce] bg-white/70 text-[11px] text-[#6f6058]">
                  <span className={`w-1.5 h-1.5 rounded-full ${menu ? "bg-emerald-500" : "bg-slate-300"}`} />
                  {menu ? "Menu linked" : "No wine menu linked"}
                </span>

                {menu && (
                  <span className="text-[12px] text-[#9a887c]">
                    {menu.name}
                  </span>
                )}
              </div>
            </div>

            {menu && (
              <a
                href={`/wine/${menu.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-11 px-5 rounded-xl border border-[#ded2c7] bg-white text-[12px] font-medium text-[#4b3930] hover:bg-[#f2ebe4] transition shadow-sm"
              >
                Open Guest View ↗
              </a>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          {[
            ["Available wines", stats.available, "In venue stock"],
            ["Guest live", stats.guestLive, "Published now"],
            ["By the glass", stats.byTheGlass, "Glass or both"],
            ["Low stock", stats.lowStock, "2 bottles or fewer"],
          ].map(([label, value, meta]) => (
            <div
              key={label}
              className="rounded-2xl border border-[#e8ddd3] bg-white/80 px-5 py-4 shadow-[0_1px_2px_rgba(58,42,36,0.03)]"
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#a08f84]">
                {label}
              </div>
              <div className="flex items-end justify-between gap-3 mt-3">
                <div className="text-[30px] leading-none font-semibold tracking-[-0.04em] text-[#2f221c]">
                  {value}
                </div>
                <div className="text-[10px] text-[#b1a39a] text-right">
                  {meta}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-[#e5d9ce] bg-white/75 p-1.5 mb-6 overflow-x-auto">
          <div className="flex min-w-max gap-1">
            {[
              ["wines", "Wine List", stats.available],
              ["confirmed", "Confirmed BTG", confirmedBtgSuggestions.length],
              ["opportunities", "BTG Opportunities", opportunityBtgSuggestions.length],
              ["pairings", "Sake Pairing", sakePairings.length],
            ].map(([value, label, count]) => (
              <button
                key={value}
                onClick={() => setWorkspaceTab(value)}
                className={`h-10 px-4 rounded-xl text-[12px] font-medium transition flex items-center gap-2 ${
                  workspaceTab === value
                    ? "bg-[#3a2a24] text-white shadow-sm"
                    : "text-[#75645b] hover:bg-[#f5eee8]"
                }`}
              >
                {label}
                <span className={`min-w-5 h-5 px-1.5 rounded-full text-[10px] flex items-center justify-center ${
                  workspaceTab === value
                    ? "bg-white/15 text-white"
                    : "bg-[#f1e8e1] text-[#8a6a59]"
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </section>

        {workspaceTab === "confirmed" && (
          <section className="rounded-2xl border border-[#dfe8df] bg-white overflow-hidden">
            <div className="px-5 md:px-6 py-5 border-b border-[#e7eee7] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-700">
                  Business Inventory Confirmed
                </div>
                <h2 className="text-[20px] font-semibold text-[#2f221c] mt-1">
                  Confirmed BTG
                </h2>
                <p className="text-[12px] text-[#8c7c72] mt-1">
                  By-the-glass products physically detected in this venue inventory.
                </p>
              </div>
              <span className="self-start md:self-auto px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                {confirmedBtgSuggestions.length} to review
              </span>
            </div>

            {confirmedBtgSuggestions.length === 0 ? (
              <div className="px-6 py-16 text-center text-[13px] text-[#9a887c]">
                No confirmed BTG items waiting for review.
              </div>
            ) : (
              <div className="divide-y divide-[#eee7e1]">
                {confirmedBtgSuggestions.map((suggestion) => {
                  const wine = rows.find((item) => item.wineId === suggestion.wine_id);

                  return (
                    <div key={suggestion.id} className="px-5 md:px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[13px] text-[#2f221c] truncate">
                          {wine?.name || suggestion.business_product_name}
                        </div>
                        <div className="text-[11px] text-emerald-700 mt-1">
                          {Number(suggestion.serving_cl)}cl
                          {suggestion.business_product_number
                            ? ` · Business SKU ${suggestion.business_product_number}`
                            : ""}
                        </div>
                        {!wine && (
                          <div className="text-[11px] text-orange-600 mt-1.5">
                            Base wine is not currently available in venue inventory.
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => dismissBtgSuggestion(suggestion)}
                          className="h-9 px-4 rounded-lg border border-[#e3d8ce] bg-white text-[#75645b] text-[11px] font-medium hover:bg-[#f7f2ed] transition"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => enableBtgSuggestion(suggestion)}
                          disabled={!wine || savingWineId === suggestion.wine_id}
                          className="h-9 px-4 rounded-lg bg-emerald-700 text-white text-[11px] font-medium disabled:opacity-35"
                        >
                          {savingWineId === suggestion.wine_id ? "Enabling..." : "Enable BTG"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {workspaceTab === "opportunities" && (
          <section className="rounded-2xl border border-[#e5d9ce] bg-white overflow-hidden">
            <div className="px-5 md:px-6 py-5 border-b border-[#eee5de] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#9a725f]">
                  Inventory Intelligence
                </div>
                <h2 className="text-[20px] font-semibold text-[#2f221c] mt-1">
                  BTG Opportunities
                </h2>
                <p className="text-[12px] text-[#8c7c72] mt-1">
                  Catalogue BTG products whose base bottle is currently available at this venue.
                </p>
              </div>
              <span className="self-start md:self-auto px-3 py-1.5 rounded-full bg-[#f6eee7] text-[#8a3a2c] text-[11px] font-medium">
                {opportunityBtgSuggestions.length} opportunities
              </span>
            </div>

            {opportunityBtgSuggestions.length === 0 ? (
              <div className="px-6 py-16 text-center text-[13px] text-[#9a887c]">
                No BTG opportunities waiting for review.
              </div>
            ) : (
              <div className="divide-y divide-[#eee7e1]">
                {opportunityBtgSuggestions.map((suggestion) => {
                  const wine = rows.find((item) => item.wineId === suggestion.wine_id);

                  return (
                    <div key={suggestion.id} className="px-5 md:px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 hover:bg-[#fcfaf8] transition">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[13px] text-[#2f221c] truncate">
                          {wine?.name || suggestion.business_product_name}
                        </div>
                        <div className="text-[11px] text-[#9b8b81] mt-1">
                          {Number(suggestion.serving_cl)}cl
                          {suggestion.business_product_number
                            ? ` · Business SKU ${suggestion.business_product_number}`
                            : ""}
                        </div>
                        {!wine && (
                          <div className="text-[11px] text-orange-600 mt-1.5">
                            Base wine is not currently available in venue inventory.
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => dismissBtgSuggestion(suggestion)}
                          className="h-9 px-4 rounded-lg border border-[#e3d8ce] bg-white text-[#75645b] text-[11px] font-medium hover:bg-[#f7f2ed] transition"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => enableBtgSuggestion(suggestion)}
                          disabled={!wine || savingWineId === suggestion.wine_id}
                          className="h-9 px-4 rounded-lg bg-[#8a3a2c] text-white text-[11px] font-medium disabled:opacity-35"
                        >
                          {savingWineId === suggestion.wine_id ? "Enabling..." : "Enable BTG"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {workspaceTab === "pairings" && (
<section className="rounded-2xl border border-[#e5d9ce] bg-white overflow-visible">            <div className="px-5 md:px-6 py-5 border-b border-[#eee5de] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#9a725f]">Koyo Guest Experience</div>
                <h2 className="text-[20px] font-semibold text-[#2f221c] mt-1">Sake Pairing</h2>
                <p className="text-[12px] text-[#8c7c72] mt-1">Build and publish the sake journey presented with the Koyo omakase experience.</p>
              </div>
              <button onClick={createSakePairing} disabled={!menu || savingPairing} className="h-10 px-4 rounded-xl bg-[#3a2a24] text-white text-[11px] font-medium disabled:opacity-35">
                {savingPairing ? "Creating..." : "+ New Pairing"}
              </button>
            </div>

            {sakePairings.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <div className="text-[14px] font-medium text-[#4b3930]">No sake pairing created</div>
                <div className="text-[11px] text-[#aa9b91] mt-2">Create the first Koyo pairing and configure its guest-facing details.</div>
              </div>
            ) : (
              <div className="p-5 md:p-6 space-y-5">
                {sakePairings.map((pairing) => (
<article
  key={pairing.id}
  className="relative rounded-2xl border border-[#e7ddd5] bg-[#fcfaf8] overflow-visible"
>                    <div className="px-5 py-4 border-b border-[#eee5de] flex items-center justify-between gap-3">
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-semibold ${pairing.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {pairing.status === "published" ? "PUBLISHED" : "DRAFT"}
                      </span>
                      <button onClick={() => togglePairingStatus(pairing)} className="h-9 px-4 rounded-lg border border-[#ded2c7] bg-white text-[11px] font-medium text-[#57463d]">
                        {pairing.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_180px] gap-5 p-5">
                      <div className="space-y-4">
                        <label className="block">
                          <span className="block text-[9px] uppercase tracking-[0.18em] text-[#9c8c82] mb-2">Guest title</span>
                          <input value={pairing.name || ""} onChange={(e) => updateLocalPairing(pairing.id, "name", e.target.value)} className="w-full h-11 rounded-xl border border-[#e2d7cd] bg-white px-4 text-[12px] text-[#3a2a24] outline-none" />
                        </label>
                        <label className="block">
                          <span className="block text-[9px] uppercase tracking-[0.18em] text-[#9c8c82] mb-2">Guest description</span>
                          <textarea value={pairing.description || ""} onChange={(e) => updateLocalPairing(pairing.id, "description", e.target.value)} rows={3} placeholder="Describe the sake journey..." className="w-full rounded-xl border border-[#e2d7cd] bg-white px-4 py-3 text-[12px] text-[#3a2a24] outline-none resize-none" />
                        </label>
                      </div>
                      <div className="space-y-4">
                        <label className="block">
                          <span className="block text-[9px] uppercase tracking-[0.18em] text-[#9c8c82] mb-2">Guest price €</span>
                          <input type="number" min="0" step="0.01" value={pairing.price ?? ""} onChange={(e) => updateLocalPairing(pairing.id, "price", e.target.value === "" ? "" : Number(e.target.value))} className="w-full h-11 rounded-xl border border-[#e2d7cd] bg-white px-4 text-[12px] text-[#3a2a24] outline-none" />
                        </label>
                        <button onClick={() => saveSakePairing(pairing)} disabled={savingPairing} className="w-full h-11 rounded-xl bg-[#8a3a2c] text-white text-[11px] font-medium disabled:opacity-40">
                          {savingPairing ? "Saving..." : "Save Pairing"}
                        </button>
                      </div>
                    </div>

                    <div className="px-5 py-5 border-t border-[#eee5de] bg-white">
                      <div className="text-[11px] font-medium text-[#4b3930]">Pairing stages</div>
                      <div className="text-[10px] text-[#a29389] mt-1 mb-5">Search the existing Vaxeron catalogue and add sake in service order.</div>
                      <div className="space-y-3">
                        {sakeStages.filter((stage) => stage.pairing_id === pairing.id).map((stage, index) => (
                          <div key={stage.id} className="flex items-center gap-4 rounded-xl border border-[#eee5de] bg-[#fcfaf8] p-4">
                            <div className="text-[10px] font-semibold text-[#9a725f]">{String(index + 1).padStart(2, "0")}</div>
                            <div className="flex-1">
                              <div className="text-[12px] font-medium text-[#3a2a24]">{stage.wines?.name || "Unknown sake"}</div>
                              <div className="text-[10px] text-[#9a887c] mt-1">{[stage.wines?.producer, stage.wines?.region, stage.wines?.vintage].filter(Boolean).join(" · ")}</div>
                            </div>
                            <button onClick={() => removeSakeStage(stage)} className="text-[10px] text-[#a65a4c]">Remove</button>
                          </div>
                        ))}
                      </div>
<div className="mt-5 relative z-50">                        <input value={stageSearch[pairing.id] || ""} onChange={(e) => setStageSearch((prev) => ({ ...prev, [pairing.id]: e.target.value }))} placeholder="Search sake by name or producer..." className="w-full h-11 rounded-xl border border-[#e2d7cd] bg-white px-4 text-[12px] text-[#3a2a24] outline-none" />
                        {(stageSearch[pairing.id] || "").trim().length >= 2 && (
<div className="absolute z-[999] left-0 right-0 top-[calc(100%+6px)] max-h-[320px] overflow-y-auto rounded-xl border border-[#e2d7cd] bg-white shadow-[0_18px_50px_rgba(58,42,36,0.18)]">                            {sakeCatalogue.filter((wine) => { const q = (stageSearch[pairing.id] || "").trim().toLowerCase(); return [wine.name, wine.producer, wine.region, wine.country, wine.wine_type].filter(Boolean).join(" ").toLowerCase().includes(q); }).slice(0, 12).map((wine) => (
                              <button key={wine.id} onClick={() => addSakeStage(pairing, wine)} className="w-full px-4 py-3 text-left border-b last:border-b-0 border-[#f0e9e3] hover:bg-[#faf7f4]">
                                <div className="text-[12px] font-medium text-[#3a2a24]">{wine.name}</div>
                                <div className="text-[10px] text-[#9a887c] mt-1">{[wine.producer, wine.region, wine.vintage].filter(Boolean).join(" · ")}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {workspaceTab === "wines" && (
          <section className="rounded-2xl border border-[#e5d9ce] bg-white overflow-hidden">
            <div className="px-4 md:px-5 py-4 border-b border-[#eee5de] bg-[#fcfaf8]">
              <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search wine, producer, region or country..."
                    className="w-full h-11 rounded-xl border border-[#e2d7cd] bg-white pl-4 pr-4 text-[12px] text-[#3a2a24] placeholder:text-[#b1a39a] outline-none focus:border-[#b89a87] transition"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto">
                  {[
                    ["all", "All"],
                    ["live", "Guest Live"],
                    ["glass", "By the Glass"],
                    ["hidden", "Hidden"],
                    ["low", "Low Stock"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setFilter(value)}
                      className={`h-10 px-3.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${
                        filter === value
                          ? "bg-[#3a2a24] text-white"
                          : "border border-[#e3d8ce] bg-white text-[#75645b] hover:bg-[#f7f2ed]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-[#a6978e] mt-3">
                Showing {filteredRows.length} of {rows.length} wines
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[12px] min-w-[1320px]">
                <thead className="bg-[#faf7f4] border-b border-[#e9dfd7]">
                  <tr className="text-[9px] uppercase tracking-[0.15em] text-[#9c8c82]">
                    <th className="py-3.5 px-5 text-left font-medium">Wine</th>
                    <th className="py-3.5 px-3 text-left font-medium">Type</th>
                    <th className="py-3.5 px-3 text-center font-medium">Stock</th>
                    <th className="py-3.5 px-3 text-center font-medium">Guest</th>
                    <th className="py-3.5 px-3 text-left font-medium">Service</th>
                    <th className="py-3.5 px-3 text-left font-medium">Bottle €</th>
                    <th className="py-3.5 px-3 text-left font-medium">Glass €</th>
                    <th className="py-3.5 px-3 text-left font-medium">Guest Description</th>
                    <th className="py-3.5 px-5 text-right font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#f0e9e3]">
                  {paginatedRows.map((row) => (
                    <tr key={row.wineId} className="group hover:bg-[#fcfaf8] transition">
                      <td className="py-3.5 px-5">
                        <div className="font-medium text-[#2f221c] max-w-[310px] truncate">
                          {row.name}
                        </div>
                        <div className="text-[10px] text-[#a29389] mt-1 max-w-[310px] truncate">
                          {[row.producer, row.vintage, row.region].filter(Boolean).join(" · ")}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="capitalize text-[#75645b]">
                          {row.wineType || "—"}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex min-w-8 h-7 px-2 items-center justify-center rounded-lg text-[11px] font-medium ${
                          row.stock <= 2
                            ? "bg-orange-50 text-orange-700"
                            : "bg-[#f3eee9] text-[#57463d]"
                        }`}>
                          {row.stock}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => toggleGuestWine(row)}
                          disabled={savingWineId === row.wineId}
                          className={`inline-flex items-center gap-2 h-8 px-3 rounded-full text-[10px] font-semibold transition ${
                            row.guestVisible
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            row.guestVisible ? "bg-emerald-500" : "bg-slate-400"
                          }`} />
                          {row.guestVisible ? "LIVE" : "OFF"}
                        </button>
                      </td>

                      <td className="py-3.5 px-3">
                        <select
                          value={row.serviceType}
                          disabled={!row.guestVisible}
                          onChange={(e) =>
                            updateLocalWine(row.wineId, "serviceType", e.target.value)
                          }
                          className="h-9 min-w-[104px] border border-[#e2d7cd] rounded-lg px-3 bg-white text-[11px] text-[#4b3930] disabled:opacity-35 outline-none"
                        >
                          <option value="bottle">Bottle</option>
                          <option value="glass">Glass</option>
                          <option value="both">Both</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.bottlePrice ?? ""}
                          disabled={!row.guestVisible}
                          onChange={(e) =>
                            updateLocalWine(
                              row.wineId,
                              "bottlePrice",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                          className="w-[88px] h-9 border border-[#e2d7cd] rounded-lg px-3 bg-white text-[11px] text-[#3a2a24] disabled:opacity-35 outline-none focus:border-[#b89a87]"
                        />
                      </td>

                      <td className="py-3.5 px-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.glassPrice ?? ""}
                          disabled={!row.guestVisible || row.serviceType === "bottle"}
                          onChange={(e) =>
                            updateLocalWine(
                              row.wineId,
                              "glassPrice",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                          placeholder={
                            row.serviceType === "glass" || row.serviceType === "both"
                              ? "Set price"
                              : ""
                          }
                          className={`w-[94px] h-9 border rounded-lg px-3 bg-white text-[11px] text-[#3a2a24] disabled:opacity-35 outline-none focus:border-[#b89a87] ${
                            row.guestVisible &&
                            (row.serviceType === "glass" || row.serviceType === "both") &&
                            row.glassPrice === null
                              ? "border-orange-300 bg-orange-50/50"
                              : "border-[#e2d7cd]"
                          }`}
                        />
                      </td>

                      <td className="py-3.5 px-3">
                        <input
                          type="text"
                          value={row.description}
                          disabled={!row.guestVisible}
                          onChange={(e) =>
                            updateLocalWine(row.wineId, "description", e.target.value)
                          }
                          placeholder="Guest description"
                          className="min-w-[250px] w-full h-9 border border-[#e2d7cd] rounded-lg px-3 bg-white text-[11px] text-[#3a2a24] disabled:opacity-35 outline-none focus:border-[#b89a87]"
                        />
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        {row.guestVisible && (
                          <button
                            onClick={() => saveWine(row)}
                            disabled={savingWineId === row.wineId}
                            className="h-9 px-4 rounded-lg bg-[#8a3a2c] text-white text-[11px] font-medium hover:bg-[#713025] transition disabled:opacity-40"
                          >
                            {savingWineId === row.wineId ? "Saving..." : "Save"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRows.length === 0 && (
              <div className="py-20 text-center">
                <div className="text-[13px] text-[#75645b]">No wines match this view.</div>
                <div className="text-[11px] text-[#aa9b91] mt-1">Try another filter or search term.</div>
              </div>
            )}

            {filteredRows.length > 0 && (
              <div className="px-5 py-4 border-t border-[#eee5de] bg-[#fcfaf8] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-[11px] text-[#9a887c]">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} wines
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="h-9 px-3 rounded-lg border border-[#e3d8ce] bg-white text-[11px] font-medium text-[#75645b] disabled:opacity-35">
                    Previous
                  </button>
                  <div className="h-9 px-3 rounded-lg bg-[#f1e8e1] text-[11px] font-medium text-[#57463d] flex items-center">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="h-9 px-3 rounded-lg border border-[#e3d8ce] bg-white text-[11px] font-medium text-[#75645b] disabled:opacity-35">
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
