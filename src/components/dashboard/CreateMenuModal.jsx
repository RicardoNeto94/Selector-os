"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function CreateMenuModal({ isOpen, onClose, restaurantId }) {

  const supabase = createClientComponentClient();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [defaultView, setDefaultView] = useState("food");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // ✅ slug generator
  const generateSlug = (value) => {
    return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "");
  };

  const handleCreate = async () => {

    if (!name.trim()) {
      alert("Menu name is required");
      return;
    }

    const finalSlug = slug || generateSlug(name);

    setLoading(true);

    const { error } = await supabase
      .from("menus")
      .insert({
        name: name.trim(),
        public_slug: finalSlug,
        restaurant_id: restaurantId,
        default_view: defaultView,
        is_active: true,
      });

    setLoading(false);

    if (error) {
      console.error("CREATE MENU ERROR:", error);
      alert(error.message);
      return;
    }

    // reset
    setName("");
    setSlug("");
    setDefaultView("food");

    onClose();

    // 🔥 smoother refresh (no full reload)
    window.location.href = "/dashboard/menu";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg">

      <div className="so-modal">

        {/* HEADER */}
        <div className="mb-6">

          <h2 className="text-xl font-semibold text-white">
            Create new menu
          </h2>

          <p className="text-sm text-slate-400 mt-1">
            This will generate a live menu and QR code instantly.
          </p>

        </div>

        {/* NAME */}
        <div className="mb-4">

          <label className="text-xs text-slate-400 mb-1 block">
            Menu name
          </label>

          <input
            placeholder="e.g. Fox Den, Shang Shi Wine"
            value={name}
            onChange={(e) => {
              const value = e.target.value;
              setName(value);
              setSlug(generateSlug(value));
            }}
            className="w-full bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          />

        </div>

        {/* SLUG */}
        <div className="mb-5">

          <label className="text-xs text-slate-400 mb-1 block">
            URL slug
          </label>

          <div className="flex items-center gap-2">

            <span className="text-xs text-slate-500">
              /menu/
            </span>

            <input
              value={slug}
              onChange={(e) => setSlug(generateSlug(e.target.value))}
              className="flex-1 bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            />

          </div>

        </div>

        {/* DEFAULT VIEW */}
        <div className="mb-6">

          <label className="text-xs text-slate-400 mb-2 block">
            Default menu type
          </label>

          <div className="grid grid-cols-2 gap-2">

            {[
              { key: "food", label: "Food" },
              { key: "drinks", label: "Drinks" },
              { key: "wine", label: "Wine" },
              { key: "services", label: "Services" },
            ].map((type) => (
              <button
                key={type.key}
                onClick={() => setDefaultView(type.key)}
                className={`px-4 py-3 rounded-xl text-sm transition text-left ${
                  defaultView === type.key
                    ? "bg-white text-black font-medium"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {type.label}
              </button>
            ))}

          </div>

        </div>

        {/* ACTIONS */}
        <div className="flex justify-between items-center">

          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-white"
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="bg-white text-black px-6 py-2 rounded-xl font-medium hover:opacity-90"
          >
            {loading ? "Creating..." : "Create Menu"}
          </button>

        </div>

      </div>

    </div>
  );
}