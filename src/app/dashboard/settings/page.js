"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function SettingsPage() {
  const supabase = createClientComponentClient();

  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [saving, setSaving] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#22c55e"); // default green

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);

    if (!user) return;

    const { data: r } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (r) {
      setRestaurant(r);
      setRestaurantName(r.name);
      setPrimaryColor(r.theme_primary_color || "#22c55e");
    }
  }

  async function saveRestaurantSettings() {
    setSaving(true);

    await supabase
      .from("restaurants")
      .update({
        name: restaurantName,
        theme_primary_color: primaryColor,
      })
      .eq("id", restaurant.id);

    setSaving(false);
  }

  return (
    <div className="space-y-12 max-w-3xl">

      {/* HEADER */}
      <div className="bg-white shadow-sm border rounded-2xl p-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your account and restaurant preferences.
        </p>
      </div>

      {/* ACCOUNT SECTION */}
      <div className="bg-white border rounded-2xl shadow-sm p-8 space-y-6">
        <h2 className="text-xl font-semibold">Account</h2>

        <div className="space-y-1">
          <p className="text-gray-600 text-sm">Email</p>
          <p className="text-gray-900 font-medium">{user?.email}</p>
        </div>

        <button
          className="
            px-5 py-3 
            bg-red-500 text-white 
            rounded-xl 
            hover:bg-red-600 transition font-semibold
          "
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/logout";
          }}
        >
          Log out
        </button>
      </div>

      {/* RESTAURANT SETTINGS */}
      <div className="bg-white border rounded-2xl shadow-sm p-8 space-y-6">
        <h2 className="text-xl font-semibold">Restaurant</h2>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Restaurant Name
          </label>
          <input
            type="text"
            className="w-full border rounded-xl px-4 py-2 mt-1"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
          />
        </div>

        {/* Primary Theme Color */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Theme Color
          </label>
          <input
            type="color"
            className="w-16 h-10 border rounded mt-1 cursor-pointer"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
          />
        </div>

        <button
          onClick={saveRestaurantSettings}
          className="
            mt-4 px-5 py-3 
            bg-green-500 text-white 
            rounded-xl 
            hover:bg-green-600 transition font-semibold
          "
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* FUTURE SECTION */}
      <div className="bg-white border rounded-2xl shadow-sm p-8 opacity-60">
        <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
        <p className="text-gray-500">
          • Team roles & permission manager <br />
          • Custom domain settings <br />
          • Theme presets (Shang Shi, Koyo, etc.) <br />
          • Export/import tools
        </p>
      </div>

    </div>
  );
}
