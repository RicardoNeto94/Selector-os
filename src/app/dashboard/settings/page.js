"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function SettingsPage() {
  const supabase = createClientComponentClient();

  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);

  const [restaurantName, setRestaurantName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#22c55e");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedMessage, setSavedMessage] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        setError("You must be signed in to change settings.");
        setLoading(false);
        return;
      }

      setUser(user);

      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (restaurantError) throw restaurantError;

      setRestaurant(restaurantData);

      if (restaurantData) {
        setRestaurantName(restaurantData.name || "");
        setPrimaryColor(
          restaurantData.theme_primary_color || "#22c55e"
        );
      }
    } catch (err) {
      console.error("Settings load error:", err);
      setError(err.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!restaurant) return;

    try {
      setSaving(true);
      setError(null);
      setSavedMessage(null);

      const updates = {
        name: restaurantName || restaurant.name,
        theme_primary_color: primaryColor,
      };

      const { error: updateError } = await supabase
        .from("restaurants")
        .update(updates)
        .eq("id", restaurant.id);

      if (updateError) throw updateError;

      setSavedMessage("Settings saved.");
    } catch (err) {
      console.error("Save settings error:", err);
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-300 text-sm">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl text-slate-100">
      {/* ERROR / SUCCESS */}
      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {savedMessage && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          {savedMessage}
        </div>
      )}

      {/* ACCOUNT BLOCK */}
      <section className="bg-slate-950/80 border border-white/10 rounded-2xl p-8 shadow-[0_24px_60px_rgba(0,0,0,0.7)] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Account</h1>
          <p className="text-sm text-slate-400">
            Signed in as{" "}
            <span className="font-semibold text-slate-100">
              {user?.email ?? "Unknown email"}
            </span>
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-full border border-red-500/60 text-red-200 hover:bg-red-600/10 transition"
          onClick={() => {
            window.location.href = "/logout";
          }}
        >
          Log out
        </button>
      </section>

      {/* RESTAURANT SETTINGS */}
      <section className="bg-slate-950/80 border border-white/10 rounded-2xl shadow-[0_18px_45px_rgba(0,0,0,0.55)] p-8 space-y-6">
        <h2 className="text-xl font-semibold">Restaurant</h2>

        {/* Name */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-300">
            Restaurant name
          </label>
          <input
            type="text"
            className="input"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder="Ex: Koyo"
          />
          <p className="text-xs text-slate-500">
            This name is visible in your dashboard and can be used in guest
            views.
          </p>
        </div>

        {/* Theme Color */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">
            Primary theme color
          </label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-16 rounded border border-slate-700 bg-slate-900/70"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="input max-w-[160px]"
            />
          </div>
          <p className="text-xs text-slate-500">
            This color is applied to certain accents in the SelectorOS views.
            (Theme presets will be added later.)
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="button disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      {/* FUTURE SECTION */}
      <section className="bg-slate-950/60 border border-white/5 rounded-2xl shadow-[0_18px_45px_rgba(0,0,0,0.55)] p-8 opacity-80">
        <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
        <p className="text-sm text-slate-400">
          • Team roles &amp; permission manager <br />
          • Custom domain settings <br />
          • Theme presets (Shang Shi, Koyo, etc.) <br />
          • Export / import tools
        </p>
      </section>
    </div>
  );
}
