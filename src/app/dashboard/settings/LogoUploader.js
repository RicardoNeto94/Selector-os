// src/app/dashboard/settings/LogoUploader.js
"use client";

import { useState } from "react";
import Image from "next/image";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LogoUploader({ restaurantId, initialLogoUrl }) {
  const supabase = createClientComponentClient();
  const [file, setFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || "");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    setFile(f || null);
    setMessage("");
  }

  async function handleUpload() {
    if (!file || !restaurantId) return;
    setUploading(true);
    setMessage("");

    try {
      const ext = file.name.split(".").pop();
      const path = `${restaurantId}/${Date.now()}.${ext}`;

      // 1) Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("restaurant-logos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2) Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("restaurant-logos").getPublicUrl(path);

      // 3) Save to restaurants.logo_url
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({ logo_url: publicUrl })
        .eq("id", restaurantId);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      setMessage("Logo updated for guest view.");
    } catch (err) {
      console.error(err);
      setMessage("Failed to upload logo. Check console / Supabase logs.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Restaurant logo"
              className="w-full h-full object-contain bg-white"
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500">
            No logo
          </div>
        )}

        <div className="text-xs text-slate-400">
          <p>Recommended: square logo, at least 256×256px.</p>
          <p>Supported: PNG, JPG, SVG.</p>
        </div>
      </div>

      {/* File input + button */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          onChange={handleFileChange}
          className="text-xs text-slate-200"
        />

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-4 py-2 rounded-full text-xs font-semibold bg-emerald-400 text-slate-950 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-default transition"
        >
          {uploading ? "Uploading…" : "Save logo"}
        </button>
      </div>

      {message && (
        <p className="text-xs text-slate-400">
          {message}
        </p>
      )}
    </div>
  );
}
