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
  AdjustmentsHorizontalIcon
} from "@heroicons/react/24/outline";

import {
  createClientComponentClient
} from "@supabase/auth-helpers-nextjs";

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
    createClientComponentClient();

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
        movementsResult,
        winesResult,
        locationsResult
      ] = await Promise.all([

        supabase
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
          ),

        supabase
          .from("wines")
          .select(`
            id,
            name,
            producer,
            vintage
          `),

        supabase
          .from("wine_locations")
          .select(`
            id,
            name
          `)
          .order("name")

      ]);

      if (
        movementsResult.error
      ) {

        throw (
          movementsResult.error
        );

      }

      if (
        winesResult.error
      ) {

        throw (
          winesResult.error
        );

      }

      if (
        locationsResult.error
      ) {

        throw (
          locationsResult.error
        );

      }

      setMovements(
        movementsResult.data || []
      );

      setWines(
        winesResult.data || []
      );

      setLocations(
        locationsResult.data || []
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

        <button
          onClick={loadData}
          className="so-btn-secondary"
        >

          Refresh

        </button>

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
            relative
            flex-1
          "
        >

          <MagnifyingGlassIcon
            className="
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
            className="
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

    </div>

  );

}