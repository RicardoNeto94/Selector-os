// src/app/dashboard/settings/LogoUploader.js

"use client";

import { useState } from "react";

export default function LogoUploader({ restaurantId, initialLogoUrl }) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    if (
      !["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)
    ) {
      setError("Only PNG, JPG or SVG images are allowed.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("restaurantId", String(restaurantId));

      const res = await fetch("/api/restaurant-logo", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("Upload failed", json);
        throw new Error(json.error || "Failed to upload logo");
      }

      setLogoUrl(json.logo_url);
      setSuccess("Logo updated successfully.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to upload logo. Check console / logs.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="inline-flex items-center px-4 py-2 rounded-full bg-slate-800 text-slate-100 text-sm cursor-pointer hover:bg-slate-700 transition">
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {uploading ? "Uploading…" : "Choose logo file"}
        </label>

        {logoUrl && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Current:</span>
            <div className="h-10 w-24 rounded-lg overflow-hidden bg-slate-900/60 flex items-center justify-center border border-slate-700/70">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Restaurant logo preview"
                className="max-h-8 max-w-[90px] object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs text-emerald-400">{success}</p>}

      <p className="text-xs text-slate-500">
        Recommended: horizontal logo, PNG/SVG with transparent background.
      </p>
    </div>
  );
}
