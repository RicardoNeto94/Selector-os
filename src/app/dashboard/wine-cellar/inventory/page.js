"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WineInventoryPage() {

  const supabase = createClientComponentClient();

  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {

    setLoading(true);

    const { data: inventoryData } = await supabase
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
      .order("quantity", { ascending: false });

    const { data: locationsData } = await supabase
      .from("wine_locations")
      .select("*")
      .order("name");

    setInventory(inventoryData || []);
    setLocations(locationsData || []);

    setLoading(false);
  }

  const filteredInventory = useMemo(() => {

    return inventory.filter((item) => {

      const wine = item.wines || {};
      const location = item.wine_locations || {};

      const matchesLocation =
        selectedLocation === "all"
          ? true
          : location.id === selectedLocation;

      const matchesSearch =
        wine.name?.toLowerCase().includes(search.toLowerCase()) ||
        wine.producer?.toLowerCase().includes(search.toLowerCase());

      return matchesLocation && matchesSearch;

    });

  }, [inventory, selectedLocation, search]);

  return (

    <div className="max-w-[1700px] mx-auto px-8 py-8">

      {/* HEADER */}

      <div className="flex items-center justify-between mb-8">

        <div>

          <div className="so-title">
            Wine Inventory
          </div>

          <div className="so-sub mt-2">
            Multi-location inventory explorer
          </div>

        </div>

      </div>

      {/* FILTERS */}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 mb-6">

        <input
          className="so-input"
          placeholder="Search wine or producer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="so-input"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
        >

          <option value="all">
            All Locations
          </option>

          {locations.map((location) => (

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

      <div className="so-card overflow-hidden">

        <div className="so-inventory-table-head">

          <div>Wine</div>
          <div>Producer</div>
          <div>Vintage</div>
          <div>Location</div>
          <div>Qty</div>
          <div>Value</div>

        </div>

        {loading && (

          <div className="p-10 text-sm text-slate-500">
            Loading inventory...
          </div>

        )}

        {!loading && filteredInventory.map((item) => {

          const wine = item.wines || {};
          const location = item.wine_locations || {};

          const value =
            (wine.price || 0) * (item.quantity || 0);

          return (

            <div
              key={item.id}
              className="so-inventory-row"
            >

              <div className="font-medium text-[#2f221c]">
                {wine.name || "Unnamed Wine"}
              </div>

              <div className="text-slate-500">
                {wine.producer || "-"}
              </div>

              <div>
                {wine.vintage || "NV"}
              </div>

              <div>
                {location.name || "-"}
              </div>

              <div>
                {item.quantity || 0}
              </div>

              <div className="font-medium">
                €{value.toLocaleString()}
              </div>

            </div>

          );

        })}

      </div>

    </div>

  );

}