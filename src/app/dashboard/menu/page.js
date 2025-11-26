"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function MenuPage() {
  const supabase = createClientComponentClient();

  const [restaurant, setRestaurant] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenus();
  }, []);

  async function loadMenus() {
    setLoading(true);

    // Get logged in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get the restaurant
    const { data: r } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    setRestaurant(r);

    // Get menus
    const { data: m } = await supabase
      .from("menus")
      .select("*")
      .eq("restaurant_id", r.id)
      .order("created_at", { ascending: true });

    setMenus(m || []);
    setLoading(false);
  }

  if (loading) {
    return <p className="text-gray-400">Loading menus…</p>;
  }

  return (
    <div className="space-y-10">

      {/* HEADER */}
      <div className="bg-white shadow-sm border rounded-2xl p-8">
        <h1 className="text-3xl font-bold">Menu Editor</h1>
        <p className="text-gray-500 mt-1">
          Manage your restaurant menus. Multiple menus will be supported soon.
        </p>

        <button className="
          mt-6 px-5 py-3 
          bg-green-500 text-white 
          rounded-xl 
          hover:bg-green-600 transition font-semibold
        ">
          + Add Menu
        </button>
      </div>

      {/* MENUS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {menus.map(menu => (
          <div
            key={menu.id}
            className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow transition"
          >
            <h2 className="text-xl font-semibold">{menu.name}</h2>
            <p className="text-gray-500 text-sm mt-1">
              Created: {new Date(menu.created_at).toLocaleString()}
            </p>

            <button className="
              mt-4 text-green-600 font-semibold hover:underline
            ">
              Edit Menu →
            </button>
          </div>
        ))}

        {menus.length === 0 && (
          <p className="text-gray-500">No menus created yet.</p>
        )}
      </div>

    </div>
  );
}
