"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { summarizeInventoryValuation } from "@/lib/inventoryValuation";
import { BOTTLE_FORMATS, fetchAllQueryRows, guestServiceReadiness, hasGlassService, INVENTORY_ROUNDING_EPSILON, isLowStock, positiveBottleQuantity, summarizeBottleFormats, summarizeInventoryFamilies } from "@/lib/wineInventory";
import { ReadinessFunnel } from "@/components/dashboard/OperationalVisuals";
import WineDetailDrawer from "@/components/dashboard/WineDetailDrawer";
import "../venue-wines.css";

function formatQuantity(value) {
  return Number(value || 0).toLocaleString("en-IE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

const LOCATION_TYPE_LABELS = {
  master_cellar: "Master cellar",
  venue_cellar: "Venue cellar",
  bar_storage: "Bar storage",
  service_station: "Service station",
  private_collection: "Private collection",
  transit: "Transit",
};

function locationTypeLabel(type) {
  return LOCATION_TYPE_LABELS[type] || type || "Wine storage";
}

export default function VenueWinePage() {
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();

  const locationId = params.locationId;

  const [location, setLocation] = useState(null);
  const [menu, setMenu] = useState(null);
  const [rows, setRows] = useState([]);
  const [inventoryValuations, setInventoryValuations] = useState([]);
  const [storeMappings, setStoreMappings] = useState([]);
  const [btgSuggestions, setBtgSuggestions] = useState([]);
  const [sakePairings, setSakePairings] = useState([]);
  const [savingPairing, setSavingPairing] = useState(false);
  const [sakeStages, setSakeStages] = useState([]);
  const [stageSearch, setStageSearch] = useState({});

  const [loading, setLoading] = useState(true);
  const [savingWineId, setSavingWineId] = useState(null);
  const [descriptionAssistantOpen, setDescriptionAssistantOpen] = useState(false);
  const [descriptionAssistantBusy, setDescriptionAssistantBusy] = useState(false);
  const [descriptionAssistantError, setDescriptionAssistantError] = useState("");
  const [descriptionDrafts, setDescriptionDrafts] = useState([]);
  const [descriptionDraftsRemaining, setDescriptionDraftsRemaining] = useState(0);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [workspaceTab, setWorkspaceTab] = useState("wines");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWineId, setSelectedWineId] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [bulkActionBusy, setBulkActionBusy] = useState(false);
  const [bulkActionMessage, setBulkActionMessage] = useState("");

  // Editable rows contain several inputs and toggles. Keeping the rendered page
  // intentionally compact avoids scroll-time layout and paint spikes while
  // search and filters continue to operate across the complete inventory.
  const PAGE_SIZE = 30;

  useEffect(() => {
    if (locationId) {
      loadData();
    }
  }, [locationId]);

  useEffect(() => {
    if (!descriptionAssistantOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [descriptionAssistantOpen]);

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

    const { data: mappingData, error: mappingError } = await supabase
      .from("wine_location_store_mappings")
      .select("id, business_store_id, business_store_name")
      .eq("location_id", locationId)
      .order("business_store_name");

    if (mappingError) {
      console.error("STORE MAPPINGS ERROR:", mappingError);
    }

    setStoreMappings(mappingData || []);

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

    let inventoryData = [];
    try {
      inventoryData = await fetchAllQueryRows(() => supabase
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
            size,
            price,
            description,
            is_active
          )
        `)
        .eq("location_id", locationId)
        .gt("quantity", INVENTORY_ROUNDING_EPSILON)
        .order("id"));
    } catch (inventoryError) {
      console.error("INVENTORY ERROR:", inventoryError);
    }

    let menuItemsData = [];

    let valuationData = [];
    try {
      valuationData = await fetchAllQueryRows(() => supabase
        .from("wine_inventory_valuations")
        .select("wine_id,location_id,cost_covered_quantity,unit_inventory_cost,unit_sale_price_net,unit_sale_price_gross,vat_percent,source_updated_at")
        .eq("location_id", locationId)
        .order("wine_id"));
    } catch (valuationError) {
      // The table is intentionally administrator-only. Operational roles get
      // an empty commercial view while retaining all stock and service tools.
      console.info("INVENTORY VALUATIONS UNAVAILABLE FOR CURRENT ROLE");
    }
    setInventoryValuations(valuationData);

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
    const valuationMap = new Map(
      valuationData.map((item) => [String(item.wine_id), item])
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
        const valuation = valuationMap.get(String(inventory.wine_id));

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
          size: wine.size || "",

          stock: positiveBottleQuantity(inventory.quantity),

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

          description: menuItem?.description || wine.description || "",
          hasVenueDescription: Boolean(menuItem?.description?.trim()),
          hasMasterDescription: Boolean(wine.description?.trim()),

          averagePurchaseCost: valuation?.unit_inventory_cost ?? null,
          compucashSalePriceNet: valuation?.unit_sale_price_net ?? null,
          compucashSalePriceGross: valuation?.unit_sale_price_gross ?? null,
          compucashVatPercent: valuation?.vat_percent ?? null,
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

  function toggleServiceOption(row, option) {
    const hasBottle = row.serviceType === "bottle" || row.serviceType === "both";
    const hasGlass = row.serviceType === "glass" || row.serviceType === "both";
    const nextBottle = option === "bottle" ? !hasBottle : hasBottle;
    const nextGlass = option === "glass" ? !hasGlass : hasGlass;

    // Every guest-visible wine must retain at least one service format.
    if (!nextBottle && !nextGlass) return;

    updateLocalWine(
      row.wineId,
      "serviceType",
      nextBottle && nextGlass ? "both" : nextGlass ? "glass" : "bottle"
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

  function toggleRowSelection(wineId) {
    setSelectedRowIds((current) =>
      current.includes(wineId)
        ? current.filter((id) => id !== wineId)
        : [...current, wineId]
    );
    setBulkActionMessage("");
  }

  function toggleCurrentPageSelection() {
    const pageIds = paginatedRows.map((row) => row.wineId);
    const pageIsSelected = pageIds.length > 0 && pageIds.every((id) => selectedRowIds.includes(id));

    setSelectedRowIds((current) =>
      pageIsSelected
        ? current.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...current, ...pageIds]))
    );
    setBulkActionMessage("");
  }

  async function showSelectedOnGuestList() {
    if (!menu || bulkActionBusy) return;

    const selectedRows = rows.filter(
      (row) => selectedRowIds.includes(row.wineId) && !row.guestVisible
    );
    if (!selectedRows.length) {
      setBulkActionMessage("Every selected wine is already on the guest list.");
      return;
    }

    setBulkActionBusy(true);
    setBulkActionMessage("");
    const { data, error } = await supabase
      .from("wine_menu_items")
      .insert(selectedRows.map((row) => ({
        wine_menu_id: menu.id,
        wine_id: row.wineId,
        quantity: 0,
        description: row.description || "",
        price_override: row.bottlePrice,
        service_type: row.serviceType || "bottle",
        glass_price: hasGlassService(row.serviceType) ? row.glassPrice : null,
      })))
      .select("id, wine_id");

    if (error) {
      console.error("BULK ENABLE GUEST WINES ERROR:", error);
      setBulkActionMessage("The selected wines could not be added. No stock quantities were changed.");
      setBulkActionBusy(false);
      return;
    }

    const menuItemByWine = new Map((data || []).map((item) => [String(item.wine_id), item.id]));
    setRows((current) => current.map((row) => {
      const menuItemId = menuItemByWine.get(String(row.wineId));
      return menuItemId ? { ...row, menuItemId, guestVisible: true } : row;
    }));
    setBulkActionMessage(`${selectedRows.length} wine${selectedRows.length === 1 ? "" : "s"} added to the guest list.`);
    setBulkActionBusy(false);
  }

  async function enableSelectedBtg() {
    if (!menu || bulkActionBusy) return;

    const selectedRows = rows.filter(
      (row) => selectedRowIds.includes(row.wineId) && row.guestVisible && row.menuItemId
    );
    if (!selectedRows.length) {
      setBulkActionMessage("Add the selected wines to the guest list before enabling BTG.");
      return;
    }

    setBulkActionBusy(true);
    setBulkActionMessage("");
    const { error } = await supabase
      .from("wine_menu_items")
      .update({ service_type: "both" })
      .in("id", selectedRows.map((row) => row.menuItemId));

    if (error) {
      console.error("BULK ENABLE BTG ERROR:", error);
      setBulkActionMessage("BTG could not be enabled for the selected wines.");
      setBulkActionBusy(false);
      return;
    }

    const selectedIds = new Set(selectedRows.map((row) => row.wineId));
    setRows((current) => current.map((row) =>
      selectedIds.has(row.wineId) ? { ...row, serviceType: "both" } : row
    ));
    setBulkActionMessage(`BTG enabled for ${selectedRows.length} wine${selectedRows.length === 1 ? "" : "s"}. Add glass prices where required.`);
    setBulkActionBusy(false);
  }

  async function generateMissingDescriptions() {
    const missing = rows.filter(
      (row) => row.guestVisible && !String(row.description || "").trim()
    );
    if (!missing.length) return;

    setDescriptionAssistantOpen(true);
    setDescriptionAssistantBusy(true);
    setDescriptionAssistantError("");
    setDescriptionDrafts([]);

    try {
      const response = await fetch("/api/wines/descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          locationId,
          wineIds: missing.slice(0, 24).map((row) => row.wineId),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to generate descriptions.");

      setDescriptionDrafts(
        (payload.descriptions || []).map((draft) => ({ ...draft, selected: true }))
      );
      setDescriptionDraftsRemaining(
        Math.max(0, missing.length - (payload.descriptions || []).length)
      );
    } catch (error) {
      setDescriptionAssistantError(error.message || "Unable to generate descriptions.");
    } finally {
      setDescriptionAssistantBusy(false);
    }
  }

  function updateDescriptionDraft(wineId, field, value) {
    setDescriptionDrafts((drafts) =>
      drafts.map((draft) => draft.wineId === wineId ? { ...draft, [field]: value } : draft)
    );
  }

  async function approveDescriptionDrafts() {
    const selected = descriptionDrafts.filter(
      (draft) => draft.selected && String(draft.description || "").trim()
    );
    if (!selected.length) return;

    setDescriptionAssistantBusy(true);
    setDescriptionAssistantError("");
    try {
      const response = await fetch("/api/wines/descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          locationId,
          descriptions: selected.map(({ wineId, description }) => ({ wineId, description })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to approve descriptions.");

      const approvedByWine = new Map(
        selected.map((draft) => [String(draft.wineId), draft.description.trim()])
      );
      setRows((currentRows) => currentRows.map((row) => {
        const approved = approvedByWine.get(String(row.wineId));
        return approved
          ? { ...row, description: approved, hasMasterDescription: true }
          : row;
      }));
      setDescriptionDrafts([]);
      setDescriptionAssistantOpen(false);
    } catch (error) {
      setDescriptionAssistantError(error.message || "Unable to approve descriptions.");
    } finally {
      setDescriptionAssistantBusy(false);
    }
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
            hasGlassService(row.serviceType)
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

    const totalBottles = rows.reduce(
      (total, row) => total + Number(row.stock || 0),
      0
    );
    const inventoryFamilies = summarizeInventoryFamilies(rows, (row) => row.stock);

    const guestLive = rows.filter(
      (row) => row.guestVisible
    ).length;

    const byTheGlass = rows.filter(
      (row) =>
        row.guestVisible &&
        (row.serviceType === "glass" ||
          row.serviceType === "both")
    ).length;

    const lowStock = rows.filter((row) => isLowStock(row.stock)).length;

    const missingGlassPrice = rows.filter(
      (row) =>
        row.guestVisible &&
        hasGlassService(row.serviceType) &&
        !(Number(row.glassPrice) > 0)
    ).length;

    const missingBottlePrice = rows.filter(
      (row) =>
        row.guestVisible &&
        row.serviceType !== "glass" &&
        !(Number(row.bottlePrice) > 0)
    ).length;

    const pricingIssues = rows.filter(
      (row) =>
        row.guestVisible &&
        (((row.serviceType === "bottle" || row.serviceType === "both") &&
          !(Number(row.bottlePrice) > 0)) ||
          ((row.serviceType === "glass" || row.serviceType === "both") &&
            !(Number(row.glassPrice) > 0)))
    ).length;

    const missingDescriptions = rows.filter(
      (row) => row.guestVisible && !String(row.description || "").trim()
    ).length;

    const priced = rows.filter((row) => {
      if (!row.guestVisible) return false;
      return guestServiceReadiness({
        quantity: row.stock,
        listed: row.guestVisible,
        serviceType: row.serviceType,
        bottlePrice: row.bottlePrice,
        glassPrice: row.glassPrice,
      }).ready;
    }).length;

    const guestReady = rows.filter((row) => {
      if (!String(row.description || "").trim()) return false;
      return guestServiceReadiness({
        quantity: row.stock,
        listed: row.guestVisible,
        serviceType: row.serviceType,
        bottlePrice: row.bottlePrice,
        glassPrice: row.glassPrice,
      }).ready;
    }).length;

    const btgSignals = dedupedBtgSuggestions.length;
    const guestActions = pricingIssues + btgSignals + missingDescriptions;

    return {
      available,
      totalBottles,
      inventoryFamilies,
      guestLive,
      byTheGlass,
      lowStock,
      missingGlassPrice,
      missingBottlePrice,
      pricingIssues,
      missingDescriptions,
      priced,
      guestReady,
      btgSignals,
      guestActions,
    };
  }, [rows, dedupedBtgSuggestions]);

  const stockByType = useMemo(() => {
    const totals = new Map();

    rows.forEach((row) => {
      const type = row.wineType || "Other";
      totals.set(type, (totals.get(type) || 0) + Number(row.stock || 0));
    });

    return Array.from(totals.entries())
      .map(([type, quantity]) => ({ type, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);
  }, [rows]);

  const bottleFormats = useMemo(() => summarizeBottleFormats(rows), [rows]);

  const commercialSummary = useMemo(
    () => summarizeInventoryValuation({
      inventoryRows: rows.map((row) => ({
        wine_id: row.wineId,
        location_id: locationId,
        quantity: row.stock,
      })),
      valuationRows: inventoryValuations,
    }),
    [inventoryValuations, locationId, rows]
  );

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
          hasGlassService(row.serviceType)
        );
      }

      if (filter === "hidden") {
        return !row.guestVisible;
      }

      if (filter === "low") {
        return isLowStock(row.stock);
      }

      return true;
    });
  }, [rows, search, filter]);

  const missingGuestDescriptionCount = useMemo(
    () => rows.filter(
      (row) => row.guestVisible && !String(row.description || "").trim()
    ).length,
    [rows]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const currentPageSelected = paginatedRows.length > 0 && paginatedRows.every(
    (row) => selectedRowIds.includes(row.wineId)
  );

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

  const supportsGuestExperience = [
    "venue_cellar",
    "bar_storage",
    "service_station",
  ].includes(location.location_type);
  const isStorageWorkspace = !supportsGuestExperience;
  const supportsSakePairing = location.name?.toLowerCase().includes("koyo");
  const isBespokeWineExperience = ["koyo-wine", "shang-shi-wine"].includes(menu?.slug);
  const workspaceAttention = isStorageWorkspace ? stats.lowStock : stats.guestActions;
  const workspaceTabs = isStorageWorkspace
    ? [["wines", "Inventory & guest controls", stats.available]]
    : [
        ["wines", "Inventory & guest list", stats.available],
        ["confirmed", "Confirmed BTG", confirmedBtgSuggestions.length],
        ["opportunities", "BTG opportunities", opportunityBtgSuggestions.length],
        ...(supportsSakePairing
          ? [["pairings", "Sake pairing", sakePairings.length]]
          : []),
      ];
  return (
    <div className={`venue-detail-page page-fade min-h-screen ${isStorageWorkspace ? "is-storage-workspace" : "is-guest-workspace"}`}>
      <div className="venue-detail-shell px-5 md:px-8 lg:px-10 py-6 md:py-7">
        <button
          onClick={() =>
            router.push("/dashboard/wine-cellar/venues")
          }
          className="venue-detail-back"
        >
          <span>←</span>
          <span>All venues</span>
        </button>

        <section className="venue-detail-hero">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div>
              <div className="venue-detail-eyebrow">
                {isStorageWorkspace ? "Inventory command centre" : "Guest wine workspace"}
              </div>

              <h1>
                {location.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {isStorageWorkspace ? (
                  <>
                    <span className="venue-context-pill is-connected">
                      <span />
                      {storeMappings.length} CompuCash store{storeMappings.length === 1 ? "" : "s"} connected
                    </span>
                    <span className={`venue-context-pill ${menu ? "is-connected" : ""}`}>
                      <span />
                      {menu ? "Guest menu linked" : "Guest menu not linked"}
                    </span>
                  </>
                ) : (
                  <span className={`venue-context-pill ${menu ? "is-connected" : ""}`}>
                    <span />
                    {menu ? "Guest menu linked" : "Guest menu not linked"}
                  </span>
                )}

                {menu && (
                  <span className="text-[12px] text-[#9a887c]">
                    {menu.name}
                  </span>
                )}

                <span className={`venue-health-pill ${workspaceAttention > 0 ? "has-alert" : "is-ready"}`}>
                  {workspaceAttention > 0
                    ? isStorageWorkspace
                      ? `${workspaceAttention} low-stock lines`
                      : `${workspaceAttention} guest action${workspaceAttention === 1 ? "" : "s"}`
                    : isStorageWorkspace ? "Inventory healthy" : "Guest experience ready"}
                </span>
              </div>

              <p className="venue-detail-intro">
                {isStorageWorkspace
                  ? "Monitor the physical stock received from CompuCash, inspect storage health and trace every connected business store from one operational view."
                  : "Control what guests can see, how each wine is served and the prices shown on this venue’s digital list."}
              </p>
            </div>

            {!isStorageWorkspace && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push(isBespokeWineExperience
                    ? `/dashboard/wine-menus/${menu.slug}/editor`
                    : `/dashboard/wine-menus/studio?locationId=${location.id}`)}
                  className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-[#17332c] text-[11px] font-semibold tracking-[0.04em] text-white hover:bg-[#244b40] transition shadow-sm"
                >
                  {menu ? "Manage Digital Wine List" : "Create Digital Wine List"}
                </button>
                {menu && (
                  <a
                    href={`/wine/${menu.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center h-11 px-5 rounded-xl border border-[#d6e0dc] bg-white text-[11px] font-medium text-[#36534b] hover:bg-[#edf5f2] transition shadow-sm"
                  >
                    Open Guest View ↗
                  </a>
                )}
              </div>
            )}

            {isStorageWorkspace && (
              <div className="venue-node-identity">
                <span>Location type</span>
                <strong>{locationTypeLabel(location.location_type)}</strong>
                <small>Physical inventory · CompuCash connected</small>
              </div>
            )}
          </div>
        </section>

        <details className="venue-insights-panel">
          <summary>
            <div className="venue-insights-title">
              <span>Inventory intelligence</span>
              <strong>Commercial &amp; stock insights</strong>
              <small>Average cost, revenue coverage and bottle formats</small>
            </div>
            <div className="venue-insights-glance" aria-hidden="true">
              {inventoryValuations.length > 0 && (
                <span><small>Average cost value</small>€{Math.round(commercialSummary.inventoryCost).toLocaleString()}</span>
              )}
              <span><small>Standard bottles</small>{formatQuantity(bottleFormats.standard)}</span>
              <i>⌄</i>
            </div>
          </summary>

          <div className="venue-insights-content">
            {inventoryValuations.length > 0 && (
              <section className="venue-commercial-overview" aria-label="Administrator commercial overview">
                <div className="venue-commercial-heading">
                  <div>
                    <span>Administrator view · Compucash</span>
                    <h2>Commercial overview</h2>
                  </div>
                  <p>Average purchase cost and revenue potential for this location’s current physical stock.</p>
                </div>
                <div className="venue-commercial-metrics">
                  <div title="Current stock multiplied by Compucash average purchase cost">
                    <span>Inventory at average cost</span>
                    <strong>€{Math.round(commercialSummary.inventoryCost).toLocaleString()}</strong>
                    <small>{commercialSummary.costCoverage.toFixed(1)}% cost coverage</small>
                  </div>
                  <div title="Current stock multiplied by the default Compucash selling price excluding VAT">
                    <span>Potential net revenue</span>
                    <strong>€{Math.round(commercialSummary.potentialRevenueNet).toLocaleString()}</strong>
                    <small>€{Math.round(commercialSummary.potentialRevenueGross).toLocaleString()} including VAT</small>
                  </div>
                  <div title="Comparable net revenue minus average purchase cost">
                    <span>Potential gross profit</span>
                    <strong>€{Math.round(commercialSummary.potentialGrossProfit).toLocaleString()}</strong>
                    <small>{commercialSummary.potentialMargin.toFixed(1)}% margin on priced stock</small>
                  </div>
                  <div className={commercialSummary.saleCoverage < 90 ? "needs-coverage" : ""}>
                    <span>Selling-price coverage</span>
                    <strong>{commercialSummary.saleCoverage.toFixed(1)}%</strong>
                    <small>{commercialSummary.saleCoverage < 90 ? "Revenue estimate is partial" : "Revenue estimate is well covered"}</small>
                  </div>
                </div>
              </section>
            )}

            <section className="venue-format-summary" aria-label="Inventory by bottle format">
              {Object.entries(BOTTLE_FORMATS).map(([key, format]) => (
                <div key={key} className={key === "unknown" && bottleFormats[key] > 0 ? "needs-review" : ""}>
                  <span>{format.label}</span>
                  <strong>{formatQuantity(bottleFormats[key])}</strong>
                  <small>{format.detail}</small>
                </div>
              ))}
              <div>
                <span>Fractional / open</span>
                <strong>{formatQuantity(bottleFormats.fractional)}</strong>
                <small>Included in format totals</small>
              </div>
            </section>
          </div>
        </details>

        {!isStorageWorkspace && (stats.guestActions > 0 || stats.lowStock > 0 || !menu) && (
          <details className="venue-attention-panel venue-readiness-disclosure" aria-label="Venue readiness">
            <summary>
              <div className="venue-attention-copy">
                <span className="venue-attention-kicker">Service readiness</span>
                <h2>{stats.guestActions > 0 || !menu ? "Complete the guest setup" : "Guest service is ready"}</h2>
                <p>Open the readiness view for pricing, descriptions and stock actions.</p>
              </div>
              <div className="venue-attention-summary" aria-label="Venue action summary">
                <span><strong>{menu ? stats.guestActions : "Menu required"}</strong> guest setup</span>
                <span><strong>{stats.lowStock}</strong> low stock</span>
              </div>
              <i className="venue-readiness-chevron" aria-hidden="true">⌄</i>
            </summary>
            <div className="venue-readiness-body">
              <div className="venue-readiness-funnel">
                <ReadinessFunnel steps={[
                  { label: "Available", value: stats.available },
                  { label: "Guest list", value: stats.guestLive },
                  { label: "Priced", value: stats.priced },
                  { label: "Guest ready", value: stats.guestReady },
                ]} />
              </div>
              <div className="venue-attention-actions">
                {!menu && <button type="button" onClick={() => router.push("/dashboard/wine-cellar/venues")}>Link a wine menu</button>}
                {stats.missingDescriptions > 0 && <button type="button" onClick={generateMissingDescriptions}>Draft {Math.min(24, stats.missingDescriptions)} descriptions</button>}
                {stats.missingGlassPrice > 0 && <button type="button" onClick={() => { setWorkspaceTab("wines"); setFilter("glass"); }}>Add {stats.missingGlassPrice} glass prices</button>}
                {dedupedBtgSuggestions.length > 0 && <button type="button" onClick={() => setWorkspaceTab(confirmedBtgSuggestions.length ? "confirmed" : "opportunities")}>Review {dedupedBtgSuggestions.length} BTG signals</button>}
                {stats.lowStock > 0 && <button type="button" onClick={() => { setWorkspaceTab("wines"); setFilter("low"); }}>Review low stock</button>}
              </div>
            </div>
          </details>
        )}

        {isStorageWorkspace && (
          <section className="venue-storage-overview">
            <div className="venue-storage-source">
              <span className="venue-storage-kicker">Connected inventory sources</span>
              <h2>CompuCash store network</h2>
              <p>Quantities from these business stores are consolidated into this physical Vaxeron location.</p>
              <div className="venue-store-list">
                {storeMappings.length > 0 ? storeMappings.map((mapping) => (
                  <span key={mapping.id}><i />{mapping.business_store_name}</span>
                )) : <span className="is-empty">No store mappings configured</span>}
              </div>
              <button type="button" onClick={() => router.push("/dashboard/wine-cellar/venues")}>Manage location mappings</button>
            </div>
            <div className="venue-stock-composition">
              <div className="venue-storage-heading">
                <div>
                  <span className="venue-storage-kicker">Stock composition</span>
                  <h2>Physical bottles by category</h2>
                </div>
                <strong>{formatQuantity(stats.totalBottles)} <small>btl</small></strong>
              </div>
              <div className="venue-composition-list">
                {stockByType.map((item) => {
                  const percentage = stats.totalBottles > 0 ? (item.quantity / stats.totalBottles) * 100 : 0;
                  return (
                    <div key={item.type} className="venue-composition-row">
                      <div><span>{item.type}</span><strong>{formatQuantity(item.quantity)}</strong></div>
                      <div className="venue-composition-track"><i style={{ width: `${Math.max(2, percentage)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section className="venue-workspace-tabs overflow-x-auto">
          <div className="flex min-w-max gap-1">
            {workspaceTabs.map(([value, label, count]) => (
              <button
                key={value}
                onClick={() => setWorkspaceTab(value)}
                className={`h-10 px-4 rounded-xl text-[12px] font-medium transition flex items-center gap-2 ${
                  workspaceTab === value
                    ? "is-active"
                    : ""
                }`}
              >
                {label}
                <span className={`min-w-5 h-5 px-1.5 rounded-full text-[10px] flex items-center justify-center ${
                    workspaceTab === value ? "is-active" : ""
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
                          className="venue-primary-action h-9 px-4 rounded-lg text-white text-[11px] font-medium disabled:opacity-35"
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
              <button onClick={createSakePairing} disabled={!menu || savingPairing} className="venue-primary-action h-10 px-4 rounded-xl text-white text-[11px] font-medium disabled:opacity-35">
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
                        <button onClick={() => saveSakePairing(pairing)} disabled={savingPairing} className="venue-primary-action w-full h-11 rounded-xl text-white text-[11px] font-medium disabled:opacity-40">
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
          <section className="venue-inventory-panel">
            <div className="venue-list-heading">
              <div>
                <span>Live inventory register</span>
                <h2>Wine inventory</h2>
                <p>{isStorageWorkspace
                  ? "Physical quantities come from CompuCash. Guest visibility, service format, pricing and descriptions become active when a wine menu is linked."
                  : "Stock comes from CompuCash. Use the controls below to decide what guests see and complete service pricing."}</p>
              </div>
              <div className="venue-list-heading-actions">
                {menu && missingGuestDescriptionCount > 0 && (
                  <button
                    type="button"
                    className="venue-description-assistant-trigger"
                    onClick={generateMissingDescriptions}
                  >
                    <span aria-hidden="true">✦</span>
                    Draft {Math.min(24, missingGuestDescriptionCount)} descriptions
                    <small>{missingGuestDescriptionCount} missing</small>
                  </button>
                )}
                <div className="venue-list-legend">
                  <span><i className="is-live" /> Live on guest list</span>
                  <span><i className="is-warning" /> Action needed</span>
                </div>
              </div>
            </div>
            {!menu && (
              <div className="venue-menu-lock">
                <div><strong>Guest controls are currently locked</strong><span>Link a wine menu to this location to enable guest visibility, BTG, pricing and descriptions.</span></div>
                <button type="button" onClick={() => router.push("/dashboard/wine-cellar/venues")}>Link a wine menu</button>
              </div>
            )}
            <div className="venue-inventory-toolbar">
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
                        ["all", "All", rows.length],
                        ["live", "On guest list", stats.guestLive],
                        ["glass", "By the Glass", stats.byTheGlass],
                        ["hidden", "Hidden", rows.length - stats.guestLive],
                        ["low", "Low Stock", stats.lowStock],
                      ].map(([value, label, count]) => (
                    <button
                      key={value}
                      onClick={() => setFilter(value)}
                      className={`h-10 px-3.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${
                        filter === value ? "is-active" : ""
                      }`}
                    >
                      {label} <span className="venue-filter-count">{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-[#a6978e] mt-3">
                Showing {filteredRows.length} of {rows.length} wines
              </div>
            </div>

            {selectedRowIds.length > 0 && (
              <div className="venue-bulk-actions" role="status" aria-live="polite">
                <div>
                  <strong>{selectedRowIds.length} selected</strong>
                  <span>{bulkActionMessage || "Apply one safe action to several wines."}</span>
                </div>
                <div className="venue-bulk-action-buttons">
                  <button type="button" onClick={showSelectedOnGuestList} disabled={!menu || bulkActionBusy}>
                    Add to guest list
                  </button>
                  <button type="button" onClick={enableSelectedBtg} disabled={!menu || bulkActionBusy}>
                    Enable BTG
                  </button>
                  <button type="button" className="is-quiet" onClick={() => { setSelectedRowIds([]); setBulkActionMessage(""); }} disabled={bulkActionBusy}>
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div className="venue-inventory-table-wrap">
              <table className="venue-inventory-table w-full text-[12px]">
                <colgroup>
                  <col className="venue-col-select" />
                  <col className="venue-col-wine" />
                  <col className="venue-col-type" />
                  <col className="venue-col-stock" />
                  <col className="venue-col-guest" />
                  <col className="venue-col-service" />
                  <col className="venue-col-price" />
                  <col className="venue-col-price" />
                  <col className="venue-col-description" />
                  <col className="venue-col-action" />
                </colgroup>
                <thead className="bg-[#faf7f4] border-b border-[#e9dfd7]">
                  <tr className="text-[9px] uppercase tracking-[0.15em] text-[#9c8c82]">
                    <th className="py-3.5 pl-4 pr-1 text-center font-medium">
                      <input
                        type="checkbox"
                        aria-label="Select all wines on this page"
                        checked={currentPageSelected}
                        onChange={toggleCurrentPageSelection}
                      />
                    </th>
                    <th className="py-3.5 px-5 text-left font-medium">Wine</th>
                    <th className="py-3.5 px-3 text-left font-medium">Type</th>
                    <th className="py-3.5 px-3 text-center font-medium">Stock</th>
                    <th className="py-3.5 px-3 text-center font-medium">Guest</th>
                    <th className="py-3.5 px-3 text-left font-medium">Serve as</th>
                    <th className="py-3.5 px-3 text-left font-medium">Bottle €</th>
                    <th className="py-3.5 px-3 text-left font-medium">Glass €</th>
                    <th className="py-3.5 px-3 text-left font-medium">Guest Description</th>
                    <th className="py-3.5 px-5 text-right font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#f0e9e3]">
                  {paginatedRows.map((row) => (
                    <tr key={row.wineId} className={`group hover:bg-[#fcfaf8] transition ${isLowStock(row.stock) || (row.guestVisible && hasGlassService(row.serviceType) && !(Number(row.glassPrice) > 0)) ? "venue-row-needs-attention" : ""}`}>
                      <td className="py-3.5 pl-4 pr-1 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.name}`}
                          checked={selectedRowIds.includes(row.wineId)}
                          onChange={() => toggleRowSelection(row.wineId)}
                        />
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-medium text-[#2f221c] max-w-[310px] truncate">
                          {row.name}
                        </div>
                        <div className="text-[10px] text-[#a29389] mt-1 max-w-[310px] truncate">
                          {[row.producer, row.vintage, row.region].filter(Boolean).join(" · ")}
                        </div>
                        {inventoryValuations.length > 0 && row.averagePurchaseCost !== null && (
                          <details className="venue-row-commercial">
                            <summary>Commercial details</summary>
                            <div>
                              <span>Avg purchase <strong>€{Number(row.averagePurchaseCost).toFixed(2)}</strong></span>
                              <span>Cost value <strong>€{(Number(row.averagePurchaseCost) * Number(row.stock || 0)).toFixed(2)}</strong></span>
                              <span>Compucash net sale <strong>{row.compucashSalePriceNet == null ? "—" : `€${Number(row.compucashSalePriceNet).toFixed(2)}`}</strong></span>
                              <span>Gross sale <strong>{row.compucashSalePriceGross == null ? "—" : `€${Number(row.compucashSalePriceGross).toFixed(2)}`}</strong></span>
                            </div>
                          </details>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="capitalize text-[#75645b]">
                          {row.wineType || "—"}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex min-w-8 h-7 px-2 items-center justify-center rounded-lg text-[11px] font-medium ${
                          isLowStock(row.stock)
                            ? "bg-orange-50 text-orange-700"
                            : "bg-[#f3eee9] text-[#57463d]"
                        }`}>
                          {formatQuantity(row.stock)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => toggleGuestWine(row)}
                          disabled={!menu || savingWineId === row.wineId}
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
                        <div className="venue-service-toggles" aria-label={`Service format for ${row.name}`}>
                          <button
                            type="button"
                            aria-pressed={row.serviceType === "bottle" || row.serviceType === "both"}
                            disabled={!row.guestVisible}
                            onClick={() => toggleServiceOption(row, "bottle")}
                            className={row.serviceType === "bottle" || row.serviceType === "both" ? "is-active" : ""}
                          >Bottle</button>
                          <button
                            type="button"
                            aria-pressed={row.serviceType === "glass" || row.serviceType === "both"}
                            disabled={!row.guestVisible}
                            onClick={() => toggleServiceOption(row, "glass")}
                            className={row.serviceType === "glass" || row.serviceType === "both" ? "is-active is-btg" : ""}
                          >BTG</button>
                        </div>
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
                          className="venue-price-input h-9 border border-[#e2d7cd] rounded-lg px-3 bg-white text-[11px] text-[#3a2a24] disabled:opacity-35 outline-none focus:border-[#b89a87]"
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
                          className={`venue-price-input h-9 border rounded-lg px-3 bg-white text-[11px] text-[#3a2a24] disabled:opacity-35 outline-none focus:border-[#b89a87] ${
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
                          className="venue-description-input w-full h-9 border border-[#e2d7cd] rounded-lg px-3 bg-white text-[11px] text-[#3a2a24] disabled:opacity-35 outline-none focus:border-[#b89a87]"
                        />
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedWineId(row.wineId)}
                            className="h-9 px-3 rounded-lg border border-[#d8e3dd] bg-white text-[#45665d] text-[10px] font-medium"
                          >Details</button>
                        {row.guestVisible && (
                          <button
                            onClick={() => saveWine(row)}
                            disabled={savingWineId === row.wineId}
                            className="venue-primary-action h-9 px-4 rounded-lg text-white text-[11px] font-medium transition disabled:opacity-40"
                          >
                            {savingWineId === row.wineId ? "Saving..." : "Save"}
                          </button>
                        )}
                        </div>
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

        <WineDetailDrawer wineId={selectedWineId} open={Boolean(selectedWineId)} onClose={() => setSelectedWineId(null)} />

        {descriptionAssistantOpen && typeof document !== "undefined" && createPortal((
          <div className="venue-description-assistant-backdrop" role="presentation">
            <section
              className="venue-description-assistant"
              role="dialog"
              aria-modal="true"
              aria-labelledby="wine-description-assistant-title"
            >
              <header>
                <div>
                  <span>Vaxeron intelligence · Administrator review</span>
                  <h2 id="wine-description-assistant-title">Guest description drafts</h2>
                  <p>AI prepares factual drafts from existing wine metadata. Nothing reaches the guest list until you approve it.</p>
                </div>
                <button
                  type="button"
                  aria-label="Close description assistant"
                  onClick={() => !descriptionAssistantBusy && setDescriptionAssistantOpen(false)}
                >×</button>
              </header>

              {descriptionAssistantBusy && descriptionDrafts.length === 0 ? (
                <div className="venue-description-assistant-loading">
                  <i aria-hidden="true">✦</i>
                  <strong>Preparing a carefully grounded batch…</strong>
                  <span>Usually this takes a few seconds.</span>
                </div>
              ) : descriptionAssistantError ? (
                <div className="venue-description-assistant-error">
                  <strong>Description assistant is not ready</strong>
                  <span>{descriptionAssistantError}</span>
                </div>
              ) : descriptionDrafts.length === 0 ? (
                <div className="venue-description-assistant-empty">
                  Every stocked wine on this guest list already has a description.
                </div>
              ) : (
                <div className="venue-description-draft-list">
                  {descriptionDrafts.map((draft) => (
                    <article key={draft.wineId} className={draft.selected ? "is-selected" : ""}>
                      <label className="venue-description-draft-select">
                        <input
                          type="checkbox"
                          checked={draft.selected}
                          onChange={(event) => updateDescriptionDraft(draft.wineId, "selected", event.target.checked)}
                        />
                        <span />
                      </label>
                      <div>
                        <h3>{draft.name}</h3>
                        <textarea
                          value={draft.description}
                          maxLength={420}
                          rows={3}
                          onChange={(event) => updateDescriptionDraft(draft.wineId, "description", event.target.value)}
                        />
                        <small>{draft.description.length}/420 · Shared description for every venue without its own override</small>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <footer>
                <div>
                  <strong>{descriptionDrafts.filter((draft) => draft.selected).length}</strong> selected
                  {descriptionDraftsRemaining > 0 && <span> · {descriptionDraftsRemaining} remain for another batch</span>}
                </div>
                <div>
                  <button
                    type="button"
                    className="is-secondary"
                    disabled={descriptionAssistantBusy}
                    onClick={() => setDescriptionAssistantOpen(false)}
                  >Cancel</button>
                  <button
                    type="button"
                    className="is-primary"
                    disabled={descriptionAssistantBusy || !descriptionDrafts.some((draft) => draft.selected && draft.description.trim())}
                    onClick={approveDescriptionDrafts}
                  >{descriptionAssistantBusy ? "Saving…" : "Approve selected"}</button>
                </div>
              </footer>
            </section>
          </div>
        ), document.body)}
      </div>
    </div>
  );
}
