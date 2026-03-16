"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WineEditorModal({
  wine,
  inventory,
  setInventory,
  onClose,
  reloadWines
}) {

  const supabase = createClientComponentClient();

  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [qty, setQty] = useState(1);

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

    const fromItem = inventory.find(i => i.id === transferFrom);
    const toItem = inventory.find(i => i.id === transferTo);

    if (!fromItem || !toItem) return;
    if (fromItem.stock < qty) return;

    const newFrom = fromItem.stock - qty;
    const newTo = toItem.stock + qty;

    await supabase
      .from("wine_inventory")
      .update({ stock: newFrom })
      .eq("id", transferFrom);

    await supabase
      .from("wine_inventory")
      .update({ stock: newTo })
      .eq("id", transferTo);

    const updated = inventory.map(i => {
      if (i.id === transferFrom) return { ...i, stock: newFrom };
      if (i.id === transferTo) return { ...i, stock: newTo };
      return i;
    });

    setInventory(updated);
    reloadWines();
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
        vintage: form.vintage ? Number(form.vintage) : null,
        price: form.price ? Number(form.price) : null,
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


        {/* Wine Info */}

        <div className="grid grid-cols-3 gap-3">

          <div>
            <div className="text-slate-500 mb-1">Producer</div>
            <input
              value={form.producer}
              onChange={(e)=>setForm({...form, producer:e.target.value})}
              className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div>
            <div className="text-slate-500 mb-1">Region</div>
            <input
              value={form.region}
              onChange={(e)=>setForm({...form, region:e.target.value})}
              className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div>
            <div className="text-slate-500 mb-1">Country</div>
            <input
              value={form.country}
              onChange={(e)=>setForm({...form, country:e.target.value})}
              className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div>
            <div className="text-slate-500 mb-1">Grapes</div>
            <input
              value={form.grapes}
              onChange={(e)=>setForm({...form, grapes:e.target.value})}
              className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div>
            <div className="text-slate-500 mb-1">Vintage</div>
            <input
              type="number"
              value={form.vintage}
              onChange={(e)=>setForm({...form, vintage:e.target.value})}
              className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
            />
          </div>

          <div>
            <div className="text-slate-500 mb-1">Price €</div>
            <input
              type="number"
              value={form.price}
              onChange={(e)=>setForm({...form, price:e.target.value})}
              className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
            />
          </div>

        </div>


        {/* Description */}

        <div>

          <div className="text-slate-500 mb-1">Description</div>

          <textarea
            rows={2}
            value={form.description}
            onChange={(e)=>setForm({...form, description:e.target.value})}
            className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400"
          />

        </div>


        {/* Inventory + Transfer */}

        <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">

          <div>

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
                    {loc.stock}
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
                <option value="">From</option>
                {inventory.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.location}
                  </option>
                ))}
              </select>

              <select
                value={transferTo}
                onChange={(e)=>setTransferTo(e.target.value)}
                className="px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800"
              >
                <option value="">To</option>
                {inventory.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.location}
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
              disabled={!transferFrom || !transferTo || transferFrom === transferTo}
              className="mt-3 px-4 py-1.5 rounded-md bg-slate-800 text-white hover:bg-slate-700 transition"
            >
              Transfer
            </button>

          </div>

        </div>


        <div className="flex justify-end border-t border-slate-200 pt-4">

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