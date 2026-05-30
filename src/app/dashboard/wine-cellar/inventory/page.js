"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WineInventoryPage() {

  const supabase =
    createClientComponentClient();

  const [inventory, setInventory] =
    useState([]);

  const [locations, setLocations] =
    useState([]);

  const [selectedLocation, setSelectedLocation] =
    useState("all");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [updatingId, setUpdatingId] =
    useState(null);
const [showTransferModal, setShowTransferModal] =
  useState(false);

const [selectedInventoryItem, setSelectedInventoryItem] =
  useState(null);

const [transferQty, setTransferQty] =
  useState(1);

const [transferDestination, setTransferDestination] =
  useState("");
  useEffect(() => {

    loadData();

  }, []);

  /* =======================================================
     LOAD
  ======================================================= */

  async function loadData() {

    setLoading(true);

    const { data: inventoryData } =
      await supabase
        .from("wine_inventory")
        .select(`
          *,
          wines (
            id,
            name,
            producer,
            vintage,
            price,
            wine_type,
            country
          ),
          wine_locations (
            id,
            name
          )
        `)
        .order(
          "quantity",
          {
            ascending:false
          }
        );

    const { data: locationsData } =
      await supabase
        .from("wine_locations")
        .select("*")
        .order("name");

    setInventory(
      inventoryData || []
    );

    setLocations(
      locationsData || []
    );

    setLoading(false);

  }

  /* =======================================================
     UPDATE STOCK
  ======================================================= */

  async function updateQuantity(
    inventoryId,
    currentQty,
    change
  ) {

    const nextQty =
      Math.max(
        0,
        Number(currentQty || 0)
        +
        change
      );

    setUpdatingId(inventoryId);

    const { error } =
      await supabase
        .from("wine_inventory")
        .update({
          quantity: nextQty
        })
        .eq(
          "id",
          inventoryId
        );

    if(error){

      console.error(error);

      setUpdatingId(null);

      return;

    }

    setInventory(prev =>

      prev.map(item => {

        if(
          item.id !== inventoryId
        ){
          return item;
        }

        return {
          ...item,
          quantity: nextQty
        };

      })

    );

    setUpdatingId(null);

  }
  
async function updateQuantity(
  inventoryId,
  currentQty,
  change
) {

  const nextQty =
    Math.max(
      0,
      Number(currentQty || 0)
      +
      change
    );

  setUpdatingId(inventoryId);

  const { error } =
    await supabase
      .from("wine_inventory")
      .update({
        quantity: nextQty
      })
      .eq(
        "id",
        inventoryId
      );

  if(error){

    console.error(error);

    setUpdatingId(null);

    return;

  }

  setInventory(prev =>

    prev.map(item => {

      if(
        item.id !== inventoryId
      ){
        return item;
      }

      return {
        ...item,
        quantity: nextQty
      };

    })

  );

  setUpdatingId(null);

}

/* =======================================================
   EXECUTE TRANSFER
======================================================= */

async function executeTransfer() {

  if(
    !selectedInventoryItem
    ||
    !transferDestination
    ||
    transferQty <= 0
  ){
    return;
  }

  const sourceQty =
    Number(
      selectedInventoryItem.quantity || 0
    );

  if(
    transferQty > sourceQty
  ){

    alert(
      "Not enough stock available."
    );

    return;

  }

  try {

    setUpdatingId(
      selectedInventoryItem.id
    );

    /* =========================================
       SOURCE UPDATE
    ========================================= */

    const sourceNewQty =
      sourceQty - transferQty;

    const { error: sourceError } =
      await supabase
        .from("wine_inventory")
        .update({
          quantity: sourceNewQty
        })
        .eq(
          "id",
          selectedInventoryItem.id
        );

    if(sourceError){
      throw sourceError;
    }

    /* =========================================
       DESTINATION CHECK
    ========================================= */

    const {
      data: existingDestination
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
      .single();

    /* =========================================
       DESTINATION UPDATE
    ========================================= */

    if(existingDestination){

      const { error:updateError } =
        await supabase
          .from("wine_inventory")
          .update({
            quantity:
              Number(
                existingDestination.quantity || 0
              )
              +
              transferQty
          })
          .eq(
            "id",
            existingDestination.id
          );

      if(updateError){
        throw updateError;
      }

    } else {

      const { error:createError } =
        await supabase
          .from("wine_inventory")
          .insert({

            wine_id:
              selectedInventoryItem.wine_id,

            location_id:
              transferDestination,

            quantity:
              transferQty

          });

      if(createError){
        throw createError;
      }

    }

    /* =========================================
       TRANSFER LOG
    ========================================= */

    await supabase
      .from("wine_transfers")
      .insert({

        wine_id:
          selectedInventoryItem.wine_id,

        from_location_id:
          selectedInventoryItem.location_id,

        to_location_id:
          transferDestination,

        quantity:
          transferQty

      });

    /* =========================================
       MOVEMENT LOG
    ========================================= */

    await supabase
      .from("wine_movements")
      .insert({

        wine_id:
          selectedInventoryItem.wine_id,

        location_id:
          transferDestination,

        quantity:
          transferQty,

        movement_type:
          "transfer"

      });

    /* =========================================
       REFRESH
    ========================================= */

    await loadData();

    setShowTransferModal(false);

    setSelectedInventoryItem(null);

    setTransferDestination("");

    setTransferQty(1);

  } catch(error){

    console.error(error);

    alert(
      "Transfer failed."
    );

  }

  setUpdatingId(null);

}

  /* =======================================================
     FILTERED
  ======================================================= */

  const filteredInventory =
    useMemo(() => {

      return inventory.filter(
        (item) => {

          const wine =
            item.wines || {};

          const location =
            item.wine_locations || {};

          const matchesLocation =

            selectedLocation === "all"

              ?

              true

              :

              location.id === selectedLocation;

          const matchesSearch =

            wine.name
              ?.toLowerCase()
              .includes(
                search.toLowerCase()
              )

            ||

            wine.producer
              ?.toLowerCase()
              .includes(
                search.toLowerCase()
              );

          return (
            matchesLocation
            &&
            matchesSearch
          );

        }
      );

    }, [
      inventory,
      selectedLocation,
      search
    ]);

  /* =======================================================
     TOTALS
  ======================================================= */

  const totalValue =
    filteredInventory.reduce(
      (sum,item) => {

        const wine =
          item.wines || {};

        return (
          sum
          +
          (
            Number(wine.price || 0)
            *
            Number(item.quantity || 0)
          )
        );

      },
      0
    );

  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <div
      className="
      max-w-[1700px]
      mx-auto

      px-8
      py-8
    "
    >

      {/* HEADER */}

      <div
        className="
        flex
        items-center
        justify-between

        mb-8
      "
      >

        <div>

          <div className="so-title">

            Wine Inventory

          </div>

          <div className="so-sub mt-2">

            Multi-location inventory explorer

          </div>

        </div>

        <div
          className="
          px-5
          py-3

          rounded-2xl

          bg-white

          border
          border-[#efe7df]
        "
        >

          <div
            className="
            text-xs
            uppercase
            tracking-[0.18em]

            text-slate-400

            mb-1
          "
          >

            Inventory Value

          </div>

          <div
            className="
            text-xl
            font-semibold

            text-[#2f221c]
          "
          >

            €{totalValue.toLocaleString()}

          </div>

        </div>

      </div>

      {/* FILTERS */}

      <div
        className="
        grid
        grid-cols-1
        md:grid-cols-[1fr_260px]

        gap-4
        mb-6
      "
      >

        <input
          className="so-input"

          placeholder="
            Search wine or producer...
          "

          value={search}

          onChange={(e)=>
            setSearch(
              e.target.value
            )
          }
        />

        <select
          className="so-input"

          value={selectedLocation}

          onChange={(e)=>
            setSelectedLocation(
              e.target.value
            )
          }
        >

          <option value="all">

            All Locations

          </option>

          {locations.map(location => (

            <option
              key={location.id}
              value={location.id}
            >

              {location.name}

            </option>

          ))}

        </select>

      </div>

      {/* TABLE */}

      <div
        className="
        so-card
        overflow-hidden
      "
      >

        {/* HEAD */}

        <div
          className="
          so-inventory-table-head
        "
        >

          <div>Wine</div>
          <div>Producer</div>
          <div>Vintage</div>
          <div>Location</div>
          <div>Stock</div>
          <div>Value</div>

        </div>

        {/* LOADING */}

        {loading && (

          <div
            className="
            p-10
            text-sm
            text-slate-500
          "
          >

            Loading inventory...

          </div>

        )}

        {/* ROWS */}

        {
          !loading
          &&
          filteredInventory.map(item => {

            const wine =
              item.wines || {};

            const location =
              item.wine_locations || {};

            const value =

              (
                Number(wine.price || 0)
                *
                Number(item.quantity || 0)
              );

            return (

              <div
                key={item.id}

                className="
                so-inventory-row
              "
              >

                {/* WINE */}

                <div>

                  <div
                    className="
                    font-medium
                    text-[#2f221c]
                  "
                  >

                    {
                      wine.name
                      ||
                      "Unnamed Wine"
                    }

                  </div>

                  <div
                    className="
                    text-xs
                    text-slate-400
                    mt-1
                  "
                  >

                    {
                      wine.country
                    }

                  </div>

                </div>

                {/* PRODUCER */}

                <div
                  className="
                  text-slate-500
                "
                >

                  {
                    wine.producer
                    ||
                    "-"
                  }

                </div>

                {/* VINTAGE */}

                <div>

                  {
                    wine.vintage
                    ||
                    "NV"
                  }

                </div>

                {/* LOCATION */}

                <div>

                  {
                    location.name
                    ||
                    "-"
                  }

                </div>

                {/* STOCK CONTROLS */}

<div>

  <div
    className="
    flex
    items-center
    gap-2
  "
  >

    <button

      disabled={
        updatingId === item.id
      }

      onClick={()=>
        updateQuantity(
          item.id,
          item.quantity,
          -1
        )
      }

      className="
      w-8
      h-8

      rounded-xl

      border
      border-[#e7ddd3]

      bg-white

      hover:bg-[#f7f3ee]

      transition-all
    "
    >

      −

    </button>

    <div
      className="
      min-w-[40px]

      text-center

      font-medium
    "
    >

      {
        item.quantity || 0
      }

    </div>

    <button

      disabled={
        updatingId === item.id
      }

      onClick={()=>
        updateQuantity(
          item.id,
          item.quantity,
          1
        )
      }

      className="
      w-8
      h-8

      rounded-xl

      border
      border-[#e7ddd3]

      bg-white

      hover:bg-[#f7f3ee]

      transition-all
    "
    >

      +

    </button>

    <button

      onClick={() => {

  setSelectedInventoryItem(item);

  setTransferQty(1);

  setTransferDestination("");

  setShowTransferModal(true);

}}

      className="
      ml-2

      px-3
      h-8

      rounded-xl

      bg-[#f4efe8]

      border
      border-[#e7ddd3]

      text-xs
      uppercase
      tracking-[0.14em]

      hover:bg-[#efe7dd]

      transition-all
    "
    >

      Transfer

    </button>

  </div>

</div>

                {/* VALUE */}

                <div
                  className="
                  font-medium
                "
                >

                  €
                  {
                    value.toLocaleString()
                  }

                </div>

              </div>

            );

          })
        }

      </div>
{/* =======================================================
   TRANSFER MODAL
======================================================= */}

{
  showTransferModal
  &&
  selectedInventoryItem
  &&
  (

    <div
      className="
      fixed
      inset-0
      z-[999]

      bg-black/40

      backdrop-blur-sm

      flex
      items-center
      justify-center

      p-6
    "
    >

      <div
        className="
        w-full
        max-w-[520px]

        rounded-[28px]

        bg-white

        border
        border-[#efe7df]

        shadow-[0_30px_90px_rgba(0,0,0,0.12)]

        p-8
      "
      >

        <div
          className="
          text-[24px]
          font-semibold

          text-[#2f221c]

          mb-2
        "
        >

          Transfer Wine

        </div>

        <div
          className="
          text-sm
          text-slate-500

          mb-8
        "
        >

          {
            selectedInventoryItem.wines?.name
          }

        </div>

        {/* FROM */}

        <div className="mb-6">

          <div
            className="
            text-xs
            uppercase
            tracking-[0.18em]

            text-slate-400

            mb-2
          "
          >

            From

          </div>

          <div
            className="
            h-12

            rounded-2xl

            bg-[#f8f5f1]

            border
            border-[#ece3da]

            flex
            items-center

            px-4
          "
          >

            {
              selectedInventoryItem
                .wine_locations
                ?.name
            }

          </div>

        </div>

        {/* TO */}

        <div className="mb-6">

          <div
            className="
            text-xs
            uppercase
            tracking-[0.18em]

            text-slate-400

            mb-2
          "
          >

            To

          </div>

          <select

            value={transferDestination}

            onChange={(e)=>
              setTransferDestination(
                e.target.value
              )
            }

            className="
            so-input
          "
          >

            <option value="">
              Select destination
            </option>

            {
              locations
                .filter(
                  l =>
                    l.id
                    !==
                    selectedInventoryItem.location_id
                )
                .map(location => (

                  <option
                    key={location.id}
                    value={location.id}
                  >

                    {location.name}

                  </option>

                ))
            }

          </select>

        </div>

        {/* QTY */}

        <div className="mb-8">

          <div
            className="
            text-xs
            uppercase
            tracking-[0.18em]

            text-slate-400

            mb-2
          "
          >

            Quantity

          </div>

          <input
            type="number"

            min="1"

            max={
              selectedInventoryItem.quantity
            }

            value={transferQty}

            onChange={(e)=>
              setTransferQty(
                Number(e.target.value)
              )
            }

            className="
            so-input
          "
          />

        </div>

        {/* ACTIONS */}

        <div
          className="
          flex
          justify-end
          gap-3
        "
        >

          <button

            onClick={() =>
              setShowTransferModal(false)
            }

            className="
            px-5
            h-11

            rounded-2xl

            border
            border-[#e7ddd3]

            bg-white
          "
          >

            Cancel

          </button>

          <button

  onClick={executeTransfer}

  disabled={
    !transferDestination
    ||
    transferQty <= 0
  }

  className="
  px-6
  h-11

  rounded-2xl

  bg-[#2f221c]

  text-white

  hover:opacity-90

  disabled:opacity-40

  transition-all
"
>

  Confirm Transfer

</button>

        </div>

      </div>

    </div>

  )
}
    </div>

  );

}