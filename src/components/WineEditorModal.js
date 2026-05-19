"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WineEditorModal({
  wine,
  inventory,
  locations = [],
  setInventory,
  onClose,
  reloadWines
}) {

  const supabase = createClientComponentClient();

  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [qty, setQty] = useState(1);

  const [adjustLocation, setAdjustLocation] = useState("");
  const [adjustQty, setAdjustQty] = useState(1);

  const [form, setForm] = useState({
    name: wine.name || "",
    producer: wine.producer || "",
    country: wine.country || "",
    region: wine.region || "",
    grapes: wine.grapes || "",
    vintage: wine.vintage || "",
    price: wine.price || "",
    description: wine.description || ""
  });

  async function transferWine() {

    if (!transferFrom || !transferTo) return;

    const fromItem = inventory.find(
      i => i.location_id === transferFrom
    );

    let toItem = inventory.find(
      i => i.location_id === transferTo
    );

    if (!fromItem) return;

    if (!toItem) {

      const { data: inserted } = await supabase
        .from("wine_inventory")
        .insert({
          wine_id: wine.id,
          location_id: transferTo,
          quantity: 0
        })
        .select()
        .single();

      const targetLocation = locations.find(
        l => l.id === transferTo
      );

      toItem = {
        ...inserted,
        location: targetLocation?.name || "New Location"
      };

      setInventory(prev => [
        ...prev,
        toItem
      ]);

    }

    if (fromItem.quantity < qty) return;

    const newFrom = fromItem.quantity - qty;
    const newTo = toItem.quantity + qty;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    await supabase
      .from("wine_inventory")
      .update({
        quantity: newFrom
      })
      .eq("id", fromItem.id);

    await supabase
      .from("wine_inventory")
      .update({
        quantity: newTo
      })
      .eq("id", toItem.id);

    await supabase
      .from("wine_transfers")
      .insert({
        wine_id: wine.id,
        from_location_id: fromItem.location_id,
        to_location_id: toItem.location_id,
        quantity: qty,
        transferred_by: user?.id || null,
        note: `Transfer from ${fromItem.location} to ${toItem.location}`
      });

    const updated = inventory.map(i => {

      if (i.id === fromItem.id) {
        return {
          ...i,
          quantity: newFrom
        };
      }

      if (i.id === toItem.id) {
        return {
          ...i,
          quantity: newTo
        };
      }

      return i;

    });

    setInventory(updated);

    reloadWines();
  }

  async function addStock() {

    if (!adjustLocation || adjustQty <= 0) return;

    const item = inventory.find(
      i => i.id === adjustLocation
    );

    if (!item) return;

    const newQuantity =
      item.quantity + Number(adjustQty);

    const { error } = await supabase
      .from("wine_inventory")
      .update({
        quantity: newQuantity
      })
      .eq("id", adjustLocation);

    if (error) {
      console.error(error);
      return;
    }

    const updated = inventory.map(i => {

      if (i.id === adjustLocation) {
        return {
          ...i,
          quantity: newQuantity
        };
      }

      return i;

    });

    setInventory(updated);

    reloadWines();
  }

  async function removeStock() {

    if (!adjustLocation || adjustQty <= 0) return;

    const item = inventory.find(
      i => i.id === adjustLocation
    );

    if (!item) return;

    const newQuantity = Math.max(
      item.quantity - Number(adjustQty),
      0
    );

    const { error } = await supabase
      .from("wine_inventory")
      .update({
        quantity: newQuantity
      })
      .eq("id", adjustLocation);

    if (error) {
      console.error(error);
      return;
    }

    const updated = inventory.map(i => {

      if (i.id === adjustLocation) {
        return {
          ...i,
          quantity: newQuantity
        };
      }

      return i;

    });

    setInventory(updated);

    reloadWines();
  }

  async function archiveWine() {

    const confirmed = confirm(
      "Archive this wine?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("wines")
      .update({
        is_active: false
      })
      .eq("id", wine.id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    reloadWines();
    onClose();
  }

  async function saveWine() {

    const { error } = await supabase
      .from("wines")
      .update({
        name: form.name,
        producer: form.producer,
        country: form.country,
        region: form.region,
        grapes: form.grapes,
        vintage: form.vintage
          ? Number(form.vintage)
          : null,
        price: form.price
          ? Number(form.price)
          : null,
        description: form.description
      })
      .eq("id", wine.id);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    reloadWines();
    onClose();
  }

  return (

    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">

      <div className="
        w-[780px] max-w-[95%]
        bg-[#fafafa]
        border border-[#e6e6e6]
        rounded-xl
        shadow-[0_20px_60px_rgba(0,0,0,0.25)]
        p-6
        space-y-5
        text-[13px]
      ">

        <div className="flex justify-between items-center">

          <h2 className="text-[15px] font-semibold text-slate-800">
            {wine.name} {wine.vintage}
          </h2>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition"
          >
            ✕
          </button>

        </div>

        <div className="grid grid-cols-3 gap-3">

          <div>
            <div className="text-slate-500 mb-1">
              Producer
            </div>

            <input
              value={form.producer}
              onChange={(e)=>setForm({
                ...form,
                producer:e.target.value
              })}
              className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
            />
          </div>

          <div>
            <div className="text-slate-500 mb-1">
              Region
            </div>

            <input
              value={form.region}
              onChange={(e)=>setForm({
                ...form,
                region:e.target.value
              })}
              className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
            />
          </div>

          <div>
            <div className="text-slate-500 mb-1">
              Country
            </div>

            <input
              value={form.country}
              onChange={(e)=>setForm({
                ...form,
                country:e.target.value
              })}
              className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
            />
          </div>

          <div>
            <div className="text-slate-500 mb-1">
              Grapes
            </div>

            <input
              value={form.grapes}
              onChange={(e)=>setForm({
                ...form,
                grapes:e.target.value
              })}
              className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
            />
          </div>

          <div>
            <div className="text-slate-500 mb-1">
              Vintage
            </div>

            <input
              type="number"
              value={form.vintage}
              onChange={(e)=>setForm({
                ...form,
                vintage:e.target.value
              })}
              className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
            />
          </div>

          <div>
            <div className="text-slate-500 mb-1">
              Price €
            </div>

            <input
              type="number"
              value={form.price}
              onChange={(e)=>setForm({
                ...form,
                price:e.target.value
              })}
              className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
            />
          </div>

        </div>

        <div>

          <div className="text-slate-500 mb-1">
            Description
          </div>

          <textarea
            rows={2}
            value={form.description}
            onChange={(e)=>setForm({
              ...form,
              description:e.target.value
            })}
            className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
          />

        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">

          <div>

            <div className="mb-6">

              <h3 className="text-slate-700 font-medium mb-2">
                Adjust Inventory
              </h3>

              <div className="grid grid-cols-3 gap-2">

                <select
                  value={adjustLocation}
                  onChange={(e)=>setAdjustLocation(e.target.value)}
                  className="px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
                >

                  <option value="">
                    Select Location
                  </option>

                  {inventory.map(i => (

                    <option
                      key={i.id}
                      value={i.id}
                    >
                      {i.location}
                    </option>

                  ))}

                </select>

                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e)=>setAdjustQty(Number(e.target.value))}
                  className="px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
                />

                <div className="flex gap-2">

                  <button
                    onClick={addStock}
                    className="flex-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white"
                  >
                    +
                  </button>

                  <button
                    onClick={removeStock}
                    className="flex-1 px-3 py-1.5 rounded-md bg-red-600 text-white"
                  >
                    −
                  </button>

                </div>

              </div>

            </div>

            <h3 className="text-slate-700 font-medium mb-2">
              Inventory
            </h3>

            <div className="space-y-1">

              {inventory.map(loc => (

                <div
                  key={loc.id}
                  className="flex justify-between px-3 py-2 bg-white border border-slate-300 rounded-md"
                >

                  <span className="text-slate-600">
                    {loc.location}
                  </span>

                  <span className="font-medium text-slate-800">
                    {loc.quantity}
                  </span>

                </div>

              ))}

            </div>

          </div>

          <div>

            <h3 className="text-slate-700 font-medium mb-2">
              Transfer Bottles
            </h3>

            <div className="grid grid-cols-3 gap-2">

              <select
                value={transferFrom}
                onChange={(e)=>setTransferFrom(e.target.value)}
                className="px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
              >

                <option value="">
                  From
                </option>

                {locations.map(i => (

                  <option
                    key={i.id}
                    value={i.id}
                  >
                    {i.name}
                  </option>

                ))}

              </select>

              <select
                value={transferTo}
                onChange={(e)=>setTransferTo(e.target.value)}
                className="px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
              >

                <option value="">
                  To
                </option>

                {locations.map(i => (

                  <option
                    key={i.id}
                    value={i.id}
                  >
                    {i.name}
                  </option>

                ))}

              </select>

              <input
                type="number"
                value={qty}
                onChange={(e)=>setQty(Number(e.target.value))}
                className="px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
              />

            </div>

            <button
              onClick={transferWine}
              disabled={
                !transferFrom ||
                !transferTo ||
                transferFrom === transferTo
              }
              className="mt-3 px-4 py-1.5 rounded-md bg-slate-800 text-white"
            >
              Transfer
            </button>

          </div>

        </div>

        <div className="flex justify-between border-t border-slate-200 pt-4">

          <button
            onClick={archiveWine}
            className="px-5 py-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition"
          >
            Archive Wine
          </button>

          <button
            onClick={saveWine}
            className="px-5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 transition"
          >
            Save Changes
          </button>

        </div>

      </div>

    </div>

  );

}