"use client";

export const dynamic = "force-dynamic";

import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon

} from "@heroicons/react/24/outline";

import { createClient } from "@/lib/supabase/client";
import { fetchAllQueryRows } from "@/lib/wineInventory";

/* =======================================================
   HELPERS
======================================================= */

function formatDate(value) {

  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(
    new Date(value)
  );

}

function normalize(value) {

  return String(
    value || ""
  )
    .trim()
    .toLowerCase();

}

function movementLabel(type) {

  const labels = {

    transfer:
      "Transfer",

    adjustment:
      "Adjustment",

    opening:
      "Opening Stock",

    breakage:
      "Breakage",

    sale:
      "Sale",

    return:
      "Return"

  };

  return (
    labels[type] ||
    type ||
    "Movement"
  );

}

function movementSymbol(
  movement
) {

  if (
    movement.movement_type ===
    "transfer"
  ) {

    return "→";

  }

  const quantity =
    Number(
      movement.quantity || 0
    );

  if (quantity > 0) {
    return "+";
  }

  if (quantity < 0) {
    return "−";
  }

  return "";

}

function displayQuantity(
  movement
) {

  const quantity =
    Number(
      movement.quantity || 0
    );

  return Math.abs(quantity);

}

/* =======================================================
   PAGE
======================================================= */

export default function WineTransfersPage() {

  const supabase =
    createClient();

  const [
    movements,
    setMovements
  ] = useState([]);

  const [
    wines,
    setWines
  ] = useState([]);

  const [
    locations,
    setLocations
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    search,
    setSearch
  ] = useState("");

  const [
    typeFilter,
    setTypeFilter
  ] = useState("all");

  const [
    locationFilter,
    setLocationFilter
  ] = useState("all");

  const [
  inventory,
  setInventory
] = useState([]);

const [
  showTransferModal,
  setShowTransferModal
] = useState(false);

const [
  transferSource,
  setTransferSource
] = useState("");

const [
  transferWineId,
  setTransferWineId
] = useState("");

const [
  transferWineSearch,
  setTransferWineSearch
] = useState("");

const [
  transferDestination,
  setTransferDestination
] = useState("");

const [
  transferQty,
  setTransferQty
] = useState(1);

const [
  transferNote,
  setTransferNote
] = useState("");

const [
  transferring,
  setTransferring
] = useState(false);

  /* =====================================================
     LOAD
  ===================================================== */

  useEffect(() => {

    loadData();

  }, []);

  async function loadData() {

    setLoading(true);

    try {

      const [
  movementRows,
  wineRows,
  locationsResult,
  inventoryRows
] = await Promise.all([

        fetchAllQueryRows(() => supabase
          .from("wine_movements")
          .select(`
            id,
            wine_id,
            from_location,
            to_location,
            quantity,
            movement_type,
            created_by,
            notes,
            created_at
          `)
          .order(
            "created_at",
            {
              ascending: false
            }
          )),

        fetchAllQueryRows(() => supabase
          .from("wines")
          .select(`
            id,
            name,
            producer,
            vintage
          `).order("id")),

        supabase
          .from("wine_locations")
          .select(`
            id,
            name
          `)
          .order("name"),

fetchAllQueryRows(() => supabase
  .from("wine_inventory")
  .select(`
    id,
    wine_id,
    location_id,
    quantity
  `)
  .gt("quantity", 0)
  .order("id"))

]);

      if (
        locationsResult.error
      ) {

        throw (
          locationsResult.error
        );

      }

      setMovements(
        movementRows
      );

      setWines(
        wineRows
      );

      setLocations(
        locationsResult.data || []
      );

      setInventory(
  inventoryRows
);

    } catch (error) {

      console.error(
        "MOVEMENT HISTORY ERROR:",
        JSON.stringify(
          error,
          null,
          2
        )
      );

    }

    setLoading(false);

  }
  /* =====================================================
   MANUAL TRANSFER
===================================================== */

const sourceLocations = useMemo(() => {

  const locationIdsWithStock = new Set(
    inventory
      .filter(
        item =>
          Number(item.quantity || 0) > 0
      )
      .map(
        item => String(item.location_id)
      )
  );

  return locations.filter(
    location =>
      locationIdsWithStock.has(
        String(location.id)
      )
  );

}, [
  inventory,
  locations
]);

const sourceInventory = useMemo(() => {

  if (!transferSource) {
    return [];
  }

  return inventory.filter(
    item =>
      String(item.location_id) ===
        String(transferSource) &&
      Number(item.quantity || 0) > 0
  );

}, [
  inventory,
  transferSource
]);

const selectedInventoryItem = useMemo(() => {

  return sourceInventory.find(
    item =>
      String(item.wine_id) ===
      String(transferWineId)
  ) || null;

}, [
  sourceInventory,
  transferWineId
]);

async function executeTransfer() {

  if (
    !selectedInventoryItem ||
    !transferDestination ||
    Number(transferQty) <= 0
  ) {
    return;
  }

  const quantity =
    Number(transferQty);

  const sourceQty =
    Number(
      selectedInventoryItem.quantity || 0
    );

  if (
    String(transferSource) ===
    String(transferDestination)
  ) {

    alert(
      "Source and destination cannot be the same."
    );

    return;

  }

  if (quantity > sourceQty) {

    alert(
      "Not enough stock available."
    );

    return;

  }

  try {

    setTransferring(true);

    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();

    const sourceNewQty =
      sourceQty - quantity;

    const {
      error: sourceError
    } = await supabase
      .from("wine_inventory")
      .update({
        quantity: sourceNewQty
      })
      .eq(
        "id",
        selectedInventoryItem.id
      );

    if (sourceError) {
      throw sourceError;
    }

    const {
      data: existingDestination,
      error: destinationCheckError
    } = await supabase
      .from("wine_inventory")
      .select("*")
      .eq(
        "wine_id",
        selectedInventoryItem.wine_id
      )
      .eq(
        "location_id",
        transferDestination
      )
      .maybeSingle();

    if (destinationCheckError) {
      throw destinationCheckError;
    }

    if (existingDestination) {

      const {
        error
      } = await supabase
        .from("wine_inventory")
        .update({
          quantity:
            Number(
              existingDestination.quantity || 0
            ) + quantity
        })
        .eq(
          "id",
          existingDestination.id
        );

      if (error) {
        throw error;
      }

    } else {

      const {
        error
      } = await supabase
        .from("wine_inventory")
        .insert({
          wine_id:
            selectedInventoryItem.wine_id,
          location_id:
            transferDestination,
          quantity
        });

      if (error) {
        throw error;
      }

    }

    const {
      error: transferError
    } = await supabase
      .from("wine_transfers")
      .insert({
        wine_id:
          selectedInventoryItem.wine_id,
        from_location_id:
          selectedInventoryItem.location_id,
        to_location_id:
          transferDestination,
        quantity,
        transferred_by:
          user?.id || null
      });

    if (transferError) {
      throw transferError;
    }

    const {
      error: movementError
    } = await supabase
      .from("wine_movements")
      .insert({
        wine_id:
          selectedInventoryItem.wine_id,
        from_location:
          selectedInventoryItem.location_id,
        to_location:
          transferDestination,
        quantity,
        movement_type:
          "transfer",
        created_by:
          user?.id || null,
        notes:
          transferNote.trim() ||
          "Wine transferred between cellar locations."
      });

    if (movementError) {
      throw movementError;
    }

    await loadData();

    setShowTransferModal(false);
    setTransferSource("");
    setTransferWineId("");
    setTransferDestination("");
    setTransferQty(1);
    setTransferNote("");

  } catch (error) {

    console.error(
      "TRANSFER ERROR:",
      error
    );

    alert(
      "Transfer failed."
    );

  } finally {

    setTransferring(false);

  }

}

  /* =====================================================
     MAPS
  ===================================================== */

  const winesMap =
    useMemo(() => {

      const map = {};

      wines.forEach(wine => {

        map[
          String(wine.id)
        ] = wine;

      });

      return map;

    }, [wines]);

      const filteredSourceInventory =
    useMemo(() => {

      const query =
        transferWineSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return [];
      }

      return sourceInventory
        .filter(item => {

          const wine =
            winesMap[
              String(item.wine_id)
            ];

          const searchableText = [
            wine?.name,
            wine?.producer,
            wine?.vintage,
            wine?.country,
            wine?.region
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            query
          );

        })
        .slice(0, 8);

    }, [
      sourceInventory,
      transferWineSearch,
      winesMap
    ]);

  const locationsMap =
    useMemo(() => {

      const map = {};

      locations.forEach(
        location => {

          map[
            String(location.id)
          ] = location;

        }
      );

      return map;

    }, [locations]);

  /* =====================================================
     FILTER
  ===================================================== */

  const filteredMovements =
    useMemo(() => {

      return movements.filter(
        movement => {

          const wine =
            winesMap[
              String(
                movement.wine_id
              )
            ];

          const fromLocation =
            locationsMap[
              String(
                movement.from_location
              )
            ];

          const toLocation =
            locationsMap[
              String(
                movement.to_location
              )
            ];

          const searchValue =
            normalize(search);

          const matchesSearch =
            !searchValue ||

            normalize(
              wine?.name
            ).includes(
              searchValue
            ) ||

            normalize(
              wine?.producer
            ).includes(
              searchValue
            ) ||

            normalize(
              movement.notes
            ).includes(
              searchValue
            );

          const matchesType =
            typeFilter === "all" ||

            movement.movement_type ===
              typeFilter;

          const matchesLocation =
            locationFilter === "all" ||

            movement.from_location ===
              locationFilter ||

            movement.to_location ===
              locationFilter;

          return (
            matchesSearch &&
            matchesType &&
            matchesLocation
          );

        }
      );

    }, [
      movements,
      winesMap,
      locationsMap,
      search,
      typeFilter,
      locationFilter
    ]);

  /* =====================================================
     METRICS
  ===================================================== */

  const transferCount =
    movements.filter(
      movement =>
        movement.movement_type ===
        "transfer"
    ).length;

  const adjustmentCount =
    movements.filter(
      movement =>
        movement.movement_type ===
        "adjustment"
    ).length;

  const movementTypes = [

    "all",
    "transfer",
    "adjustment",
    "opening",
    "breakage",
    "sale",
    "return"

  ];

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {

    return (

      <div
        className="
          page-fade
          text-slate-400
        "
      >

        Loading movement history...

      </div>

    );

  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (

    <div
      className="
        page-fade
        space-y-8
      "
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <div
        className="
          flex
          flex-col
          gap-5
          lg:flex-row
          lg:items-end
          lg:justify-between
        "
      >

        <div>

          <div
            className="
              text-[10px]
              uppercase
              tracking-[0.28em]
              text-slate-400
              mb-2
            "
          >

            Wine Operations

          </div>

          <h1
            className="
              text-2xl
              font-semibold
              text-slate-900
            "
          >

            Movement History

          </h1>

          <p
            className="
              mt-2
              text-sm
              text-slate-500
              max-w-xl
            "
          >

            Complete operational record
            of wine stock movements
            across the cellar and venues.

          </p>

        </div>

        <div className="flex items-center gap-3">

  <button
    onClick={loadData}
    className="so-btn-secondary"
  >
    Refresh
  </button>

  <button
    onClick={() =>
      setShowTransferModal(true)
    }
    className="so-btn-primary"
  >
    New Transfer
  </button>

</div>
      </div>

      {/* =================================================
          METRICS
      ================================================= */}

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-4
        "
      >

        <div className="so-card">

          <div
            className="
              text-[10px]
              uppercase
              tracking-[0.22em]
              text-slate-400
            "
          >

            Total Movements

          </div>

          <div
            className="
              mt-3
              text-3xl
              font-light
              text-slate-900
            "
          >

            {movements.length}

          </div>

        </div>

        <div className="so-card">

          <div
            className="
              text-[10px]
              uppercase
              tracking-[0.22em]
              text-slate-400
            "
          >

            Transfers

          </div>

          <div
            className="
              mt-3
              text-3xl
              font-light
              text-slate-900
            "
          >

            {transferCount}

          </div>

        </div>

        <div className="so-card">

          <div
            className="
              text-[10px]
              uppercase
              tracking-[0.22em]
              text-slate-400
            "
          >

            Adjustments

          </div>

          <div
            className="
              mt-3
              text-3xl
              font-light
              text-slate-900
            "
          >

            {adjustmentCount}

          </div>

        </div>

      </div>

      {/* =================================================
          FILTERS
      ================================================= */}

      <div
        className="
          so-card
          flex
          flex-col
          lg:flex-row
          gap-4
          lg:items-center
        "
      >

        <div
          className="
            so-search-control
            relative
            flex-1
          "
        >

          <MagnifyingGlassIcon
            className="so-search-icon
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              w-4
              h-4
              text-slate-400
            "
          />

          <input
            type="text"
            value={search}
            onChange={
              e =>
                setSearch(
                  e.target.value
                )
            }
            placeholder="Search wine, producer or notes..."
            className="so-search-input
              w-full
              border
              border-slate-200
              rounded-lg
              bg-white
              pl-10
              pr-4
              py-2.5
              text-sm
              text-slate-900
              outline-none
              focus:border-slate-400
            "
          />

        </div>

        <div
          className="
            flex
            items-center
            gap-2
          "
        >

          <AdjustmentsHorizontalIcon
            className="
              w-4
              h-4
              text-slate-400
            "
          />

          <select
            value={typeFilter}
            onChange={
              e =>
                setTypeFilter(
                  e.target.value
                )
            }
            className="
              border
              border-slate-200
              rounded-lg
              bg-white
              px-3
              py-2.5
              text-sm
              text-slate-700
              outline-none
            "
          >

            {movementTypes.map(
              type => (

                <option
                  key={type}
                  value={type}
                >

                  {
                    type === "all"
                      ? "All Movements"
                      : movementLabel(type)
                  }

                </option>

              )
            )}

          </select>

        </div>

        <select
          value={locationFilter}
          onChange={
            e =>
              setLocationFilter(
                e.target.value
              )
          }
          className="
            border
            border-slate-200
            rounded-lg
            bg-white
            px-3
            py-2.5
            text-sm
            text-slate-700
            outline-none
          "
        >

          <option value="all">

            All Locations

          </option>

          {locations.map(
            location => (

              <option
                key={location.id}
                value={location.id}
              >

                {location.name}

              </option>

            )
          )}

        </select>

      </div>

      {/* =================================================
          LEDGER
      ================================================= */}

      <div
        className="
          so-card
          overflow-hidden
          p-0
        "
      >

        <div
          className="
            overflow-x-auto
          "
        >

          <table
            className="
              w-full
              min-w-[1000px]
              text-sm
            "
          >

            <thead>

              <tr
                className="
                  border-b
                  border-slate-200
                  bg-slate-50/70
                "
              >

                <th
                  className="
                    px-5
                    py-4
                    text-left
                    text-[10px]
                    uppercase
                    tracking-[0.18em]
                    font-medium
                    text-slate-400
                  "
                >

                  Date

                </th>

                <th
                  className="
                    px-5
                    py-4
                    text-left
                    text-[10px]
                    uppercase
                    tracking-[0.18em]
                    font-medium
                    text-slate-400
                  "
                >

                  Wine

                </th>

                <th
                  className="
                    px-5
                    py-4
                    text-left
                    text-[10px]
                    uppercase
                    tracking-[0.18em]
                    font-medium
                    text-slate-400
                  "
                >

                  Movement

                </th>

                <th
                  className="
                    px-5
                    py-4
                    text-left
                    text-[10px]
                    uppercase
                    tracking-[0.18em]
                    font-medium
                    text-slate-400
                  "
                >

                  Route

                </th>

                <th
                  className="
                    px-5
                    py-4
                    text-right
                    text-[10px]
                    uppercase
                    tracking-[0.18em]
                    font-medium
                    text-slate-400
                  "
                >

                  Qty

                </th>

                <th
                  className="
                    px-5
                    py-4
                    text-left
                    text-[10px]
                    uppercase
                    tracking-[0.18em]
                    font-medium
                    text-slate-400
                  "
                >

                  Notes

                </th>

              </tr>

            </thead>

            <tbody>

              {
                filteredMovements.length === 0
                  ? (

                    <tr>

                      <td
                        colSpan="6"
                        className="
                          px-5
                          py-16
                          text-center
                          text-slate-400
                        "
                      >

                        No wine movements
                        match the selected filters.

                      </td>

                    </tr>

                  )
                  : (

                    filteredMovements.map(
                      movement => {

                        const wine =
                          winesMap[
                            String(
                              movement.wine_id
                            )
                          ];

                        const fromLocation =
                          locationsMap[
                            String(
                              movement.from_location
                            )
                          ];

                        const toLocation =
                          locationsMap[
                            String(
                              movement.to_location
                            )
                          ];

                        const isTransfer =
                          movement.movement_type ===
                          "transfer";

                        return (

                          <tr
                            key={movement.id}
                            className="
                              border-b
                              border-slate-100
                              last:border-b-0
                              hover:bg-slate-50/60
                              transition
                            "
                          >

                            <td
                              className="
                                px-5
                                py-5
                                text-xs
                                text-slate-500
                                whitespace-nowrap
                              "
                            >

                              {
                                formatDate(
                                  movement.created_at
                                )
                              }

                            </td>

                            <td
                              className="
                                px-5
                                py-5
                              "
                            >

                              <div
                                className="
                                  font-medium
                                  text-slate-900
                                "
                              >

                                {
                                  wine?.name ||
                                  "Unknown Wine"
                                }

                              </div>

                              <div
                                className="
                                  mt-1
                                  text-xs
                                  text-slate-400
                                "
                              >

                                {
                                  [
                                    wine?.producer,
                                    wine?.vintage
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")
                                }

                              </div>

                            </td>

                            <td
                              className="
                                px-5
                                py-5
                              "
                            >

                              <span
                                className="
                                  inline-flex
                                  items-center
                                  rounded-full
                                  border
                                  border-slate-200
                                  px-2.5
                                  py-1
                                  text-[10px]
                                  uppercase
                                  tracking-[0.14em]
                                  text-slate-600
                                "
                              >

                                {
                                  movementLabel(
                                    movement.movement_type
                                  )
                                }

                              </span>

                            </td>

                            <td
                              className="
                                px-5
                                py-5
                              "
                            >

                              <div
                                className="
                                  flex
                                  items-center
                                  gap-3
                                  text-xs
                                  text-slate-600
                                  whitespace-nowrap
                                "
                              >

                                <span>

                                  {
                                    fromLocation?.name ||
                                    "External"
                                  }

                                </span>

                                {
                                  isTransfer
                                    ? (

                                      <ArrowRightIcon
                                        className="
                                          w-3.5
                                          h-3.5
                                          text-slate-300
                                        "
                                      />

                                    )
                                    : (

                                      <ArrowsRightLeftIcon
                                        className="
                                          w-3.5
                                          h-3.5
                                          text-slate-300
                                        "
                                      />

                                    )
                                }

                                <span>

                                  {
                                    toLocation?.name ||
                                    "External"
                                  }

                                </span>

                              </div>

                            </td>

                            <td
                              className="
                                px-5
                                py-5
                                text-right
                                whitespace-nowrap
                              "
                            >

                              <span
                                className={
                                  `
                                  font-medium
                                  ${
                                    Number(
                                      movement.quantity
                                    ) < 0
                                      ? "text-red-500"
                                      : "text-slate-900"
                                  }
                                  `
                                }
                              >

                                {
                                  movementSymbol(
                                    movement
                                  )
                                }

                                {
                                  displayQuantity(
                                    movement
                                  )
                                }

                              </span>

                            </td>

                            <td
                              className="
                                px-5
                                py-5
                                text-xs
                                text-slate-500
                                max-w-[280px]
                              "
                            >

                              {
                                movement.notes ||
                                "—"
                              }

                            </td>

                          </tr>

                        );

                      }
                    )

                  )
              }

            </tbody>

          </table>

        </div>

      </div>

      {/* =================================================
          FOOTER COUNT
      ================================================= */}

      <div
        className="
          flex
          justify-between
          items-center
          text-xs
          text-slate-400
        "
      >

        <span>

          {
            filteredMovements.length
          }
          {" "}
          movements shown

        </span>

        <span>

          Wine movement ledger

        </span>

      </div>

          {/* =================================================
          MANUAL TRANSFER MODAL
      ================================================= */}

      {showTransferModal && (

        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-slate-950/35
            backdrop-blur-[2px]
            px-4
          "
        >

          <div
            className="
              w-full
              max-w-xl
              rounded-[24px]
              border
              border-slate-200
              bg-white
              shadow-2xl
              overflow-hidden
            "
          >

            {/* HEADER */}

            <div
              className="
                flex
                items-start
                justify-between
                gap-6
                border-b
                border-slate-100
                px-7
                py-6
              "
            >

              <div>

                <div
                  className="
                    text-[9px]
                    uppercase
                    tracking-[0.28em]
                    text-slate-400
                  "
                >
                  Wine Operations
                </div>

                <h2
                  className="
                    mt-2
                    text-xl
                    font-semibold
                    text-slate-900
                  "
                >
                  New Transfer
                </h2>

                <p
                  className="
                    mt-1.5
                    text-sm
                    text-slate-500
                  "
                >
                  Move wine between cellar
                  and venue storage locations.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowTransferModal(false)
                }
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-slate-200
                  text-slate-400
                  transition
                  hover:bg-slate-50
                  hover:text-slate-900
                "
              >
                <XMarkIcon className="h-4 w-4" />
              </button>

            </div>

            {/* FORM */}

            <div className="space-y-5 px-7 py-6">

              {/* SOURCE */}

              <div>

                <label
                  className="
                    mb-2
                    block
                    text-[9px]
                    uppercase
                    tracking-[0.2em]
                    text-slate-400
                  "
                >
                  From Location
                </label>

                <select
                  value={transferSource}
                  onChange={e => {

                    setTransferSource(
                      e.target.value
                    );

                    setTransferWineId("");
                    setTransferWineSearch("");
                    setTransferDestination("");
                    setTransferQty(1);

                  }}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-slate-900
                    outline-none
                    focus:border-slate-400
                  "
                >

                  <option value="">
                    Select source location
                  </option>

                  {sourceLocations.map(
                    location => (

                      <option
                        key={location.id}
                        value={location.id}
                      >
                        {location.name}
                      </option>

                    )
                  )}

                </select>

              </div>

              {/* WINE */}

              <div>

                <label
                  className="
                    mb-2
                    block
                    text-[9px]
                    uppercase
                    tracking-[0.2em]
                    text-slate-400
                  "
                >
                  Wine
                </label>

                <select
                  value={transferWineId}
                  onChange={e => {

                    setTransferWineId(
                      e.target.value
                    );

                    setTransferQty(1);

                  }}
                  disabled={!transferSource}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-slate-900
                    outline-none
                    disabled:cursor-not-allowed
                    disabled:bg-slate-50
                    disabled:text-slate-400
                    focus:border-slate-400
                  "
                >

                  <option value="">
                    {
                      transferSource
                        ? "Select wine"
                        : "Select source location first"
                    }
                  </option>

                  {sourceInventory.map(
                    item => {

                      const wine =
                        winesMap[
                          String(item.wine_id)
                        ];

                      return (

                        <option
                          key={item.id}
                          value={item.wine_id}
                        >
                          {
                            [
                              wine?.name ||
                                "Unknown Wine",
                              wine?.producer,
                              wine?.vintage
                            ]
                              .filter(Boolean)
                              .join(" · ")
                          }
                          {" — "}
                          {Number(
                            item.quantity || 0
                          )}
                          {" available"}
                        </option>

                      );

                    }
                  )}

                </select>

              </div>

              {/* AVAILABLE */}

              {selectedInventoryItem && (

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    rounded-xl
                    border
                    border-slate-100
                    bg-slate-50
                    px-4
                    py-3
                  "
                >

                  <span
                    className="
                      text-xs
                      text-slate-500
                    "
                  >
                    Available stock
                  </span>

                  <span
                    className="
                      text-sm
                      font-medium
                      text-slate-900
                    "
                  >
                    {Number(
                      selectedInventoryItem.quantity ||
                        0
                    )}
                    {" bottles"}
                  </span>

                </div>

              )}

              {/* DESTINATION */}

              <div>

                <label
                  className="
                    mb-2
                    block
                    text-[9px]
                    uppercase
                    tracking-[0.2em]
                    text-slate-400
                  "
                >
                  To Location
                </label>

                <select
                  value={transferDestination}
                  onChange={e =>
                    setTransferDestination(
                      e.target.value
                    )
                  }
                  disabled={!transferSource}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-slate-900
                    outline-none
                    disabled:cursor-not-allowed
                    disabled:bg-slate-50
                    disabled:text-slate-400
                    focus:border-slate-400
                  "
                >

                  <option value="">
                    Select destination
                  </option>

                  {locations
                    .filter(
                      location =>
                        String(location.id) !==
                        String(transferSource)
                    )
                    .map(
                      location => (

                        <option
                          key={location.id}
                          value={location.id}
                        >
                          {location.name}
                        </option>

                      )
                    )}

                </select>

              </div>

              {/* QUANTITY */}

              <div>

                <label
                  className="
                    mb-2
                    block
                    text-[9px]
                    uppercase
                    tracking-[0.2em]
                    text-slate-400
                  "
                >
                  Quantity
                </label>

                <input
                  type="number"
                  min="1"
                  max={
                    selectedInventoryItem
                      ? Number(
                          selectedInventoryItem.quantity ||
                            0
                        )
                      : undefined
                  }
                  value={transferQty}
                  onChange={e =>
                    setTransferQty(
                      Number(e.target.value)
                    )
                  }
                  disabled={!selectedInventoryItem}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-slate-900
                    outline-none
                    disabled:cursor-not-allowed
                    disabled:bg-slate-50
                    focus:border-slate-400
                  "
                />

              </div>

              {/* NOTE */}

              <div>

                <label
                  className="
                    mb-2
                    block
                    text-[9px]
                    uppercase
                    tracking-[0.2em]
                    text-slate-400
                  "
                >
                  Note
                  <span className="normal-case tracking-normal">
                    {" "}— optional
                  </span>
                </label>

                <textarea
                  value={transferNote}
                  onChange={e =>
                    setTransferNote(
                      e.target.value
                    )
                  }
                  placeholder="Transfer reason or operational note..."
                  rows={3}
                  className="
                    w-full
                    resize-none
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-slate-900
                    outline-none
                    placeholder:text-slate-300
                    focus:border-slate-400
                  "
                />

              </div>

            </div>

            {/* FOOTER */}

            <div
              className="
                flex
                items-center
                justify-end
                gap-3
                border-t
                border-slate-100
                bg-slate-50/60
                px-7
                py-5
              "
            >

              <button
                type="button"
                onClick={() =>
                  setShowTransferModal(false)
                }
                className="so-btn-secondary"
                disabled={transferring}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={executeTransfer}
                disabled={
                  transferring ||
                  !selectedInventoryItem ||
                  !transferDestination ||
                  Number(transferQty) <= 0 ||
                  Number(transferQty) >
                    Number(
                      selectedInventoryItem?.quantity ||
                        0
                    )
                }
                className="so-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {
                  transferring
                    ? "Transferring..."
                    : "Confirm Transfer"
                }
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
