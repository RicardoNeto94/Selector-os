"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function CreateMenuModal({ isOpen, onClose, restaurantId }) {

  const supabase = createClientComponentClient();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [accent, setAccent] = useState("#c9a96a");
  const [background, setBackground] = useState("#003223");
  const [logo, setLogo] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
  if (!name || !slug) {
    alert("Name and slug are required");
    return;
  }

  setLoading(true);

  const { data, error } = await supabase
    .from("menus")
    .insert({
      name,
      public_slug: slug,
      restaurant_id: restaurantId,
      theme_accent: accent,
      theme_background: background,
      logo_url: logo,
      is_active: true,
    })
    .select();

  setLoading(false);

  if (error) {
    console.error("SUPABASE ERROR:", error);
    alert(error.message); // 🔥 shows real reason
    return;
  }

  console.log("CREATED:", data);

  onClose();
  window.location.reload();
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">

      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

        <h2 className="text-lg font-semibold mb-4">
          Create New Menu
        </h2>

        <input
          placeholder="Menu name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        />

        <input
          placeholder="Public slug (koyo-wine)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        />

        <div className="mb-3">
          <label className="text-xs">Accent Color</label>
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="w-full h-10"
          />
        </div>

        <div className="mb-3">
          <label className="text-xs">Background</label>
          <input
            type="color"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            className="w-full h-10"
          />
        </div>

        <input
          placeholder="Logo URL"
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          className="w-full border p-2 rounded mb-4"
        />

        <div className="flex justify-between">

          <button onClick={onClose}>
            Cancel
          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded"
          >
            {loading ? "Creating..." : "Create"}
          </button>

        </div>

      </div>
    </div>
  );
}