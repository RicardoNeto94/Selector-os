"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LogoUploader({ restaurantId, initialLogoUrl }) {
  const supabase = createClientComponentClient();

  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG or JPG).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Max file size is 2MB.");
      return;
    }

    try {
      setUploading(true);

      const ext = file.name.split(".").pop() || "png";
      const path = `restaurant-${restaurantId}-${Date.now()}.${ext}`;

      // 1) Upload to Supabase Storage (bucket: restaurant-logos)
      const { error: uploadError } = await supabase
        .storage
        .from("restaurant-logos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 2) Get public URL
      const { data } = supabase
        .storage
        .from("restaurant-logos")
        .getPublicUrl(path);

      const publicUrl = data.publicUrl;

      // 3) Save to restaurants table so guest view can use it
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({
          logo_url: publicUrl,
          theme_logo_url: publicUrl, // so guest view / theme can reuse
        })
        .eq("id", restaurantId);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
    } catch (err) {
      console.error("Logo upload error", err);
      setError(err.message || "Failed to upload logo.");
    } finally {
      setUploading(false);
      // reset input so same file can be chosen again if needed
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* Preview box */}
        <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Restaurant logo"
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-[11px] text-slate-400 text-center px-1">
              No logo yet
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-xs font-medium text-slate-700">
              Logo for guest view
            </p>
            <p className="text-[11px] text-slate-500">
              This logo appears on your public allergen page.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center justify-center rounded-full bg-slate-900 text-slate-50 text-xs font-semibold px-4 py-1.5 cursor-pointer hover:bg-slate-800 transition">
              {uploading ? "Uploading…" : "Upload logo"}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
            </label>
            <span className="text-[11px] text-slate-400">
              PNG or JPG, up to 2MB.
            </span>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-2 py-1">
          {error}
        </p>
      )}
    </div>
  );
}
