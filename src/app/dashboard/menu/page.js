"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function MenuPage() {
  const supabase = createClientComponentClient();

  const [restaurant, setRestaurant] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState(null);

  const [publishLoadingId, setPublishLoadingId] = useState(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  useEffect(() => {
    loadMenus();
  }, []);

  async function loadMenus() {
    setLoading(true);
    setGlobalError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: r } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    setRestaurant(r);

    const { data: m } = await supabase
      .from("menus")
      .select("*")
      .eq("restaurant_id", r.id)
      .order("created_at", { ascending: true });

    setMenus(m || []);
    setLoading(false);
  }

  // OPTIONAL: your existing Add Menu logic; left as-is if you already wired it
  async function handleAddMenu() {
    if (menus.length > 0) return; // enforce single menu for now

    setGlobalError(null);
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Main Menu" }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to create menu");
      }

      await loadMenus();
    } catch (err) {
      console.error("Add menu error:", err);
      setGlobalError(err.message || "Could not create menu");
    }
  }

  // 🔴 NEW: delete menu handler
  async function handleDeleteMenu(menuId) {
  if (
    !confirm(
      "Are you sure you want to delete this menu? This cannot be undone."
    )
  ) {
    return;
  }

  setGlobalError(null);
  setDeleteLoadingId(menuId);

  try {
    const res = await fetch("/api/menu/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuId }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || "Failed to delete menu");
    }

    // Remove from local state so UI updates immediately
    setMenus((prev) => prev.filter((m) => m.id !== menuId));
  } catch (err) {
    console.error("Delete menu error (client):", err);
    setGlobalError(err.message || "Could not delete menu");
  } finally {
    setDeleteLoadingId(null);
  }
}


  // 🔵 Existing: publish handler (you already have this wired to /api/menu/publish)
  async function handlePublish(menuId) {
    // keep your current version here;
    // just make sure it uses publishLoadingId state.
  }

  if (loading) {
    return <p className="text-gray-400">Loading menus…</p>;
  }

  const hasMenu = menus.length > 0;

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <div className="bg-white shadow-sm border rounded-2xl p-8">
        <h1 className="text-3xl font-bold">Menu Editor</h1>
        <p className="text-gray-500 mt-1">
          Manage your restaurant menus. Multiple menus will be supported soon.
        </p>

        <button
          onClick={handleAddMenu}
          disabled={hasMenu}
          className={`
            mt-6 px-5 py-3 
            rounded-xl font-semibold transition
            ${hasMenu
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-green-500 text-white hover:bg-green-600"
            }
          `}
        >
          {hasMenu ? "Menu already created" : "+ Add Menu"}
        </button>
      </div>

      {globalError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
          {globalError}
        </div>
      )}

      {/* MENUS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {menus.map((menu) => (
          <div
            key={menu.id}
            className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow transition flex flex-col gap-4"
          >
            <div>
              <h2 className="text-xl font-semibold">{menu.name}</h2>
              <p className="text-gray-500 text-sm mt-1">
                Created: {new Date(menu.created_at).toLocaleString()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-auto">
              {/* Edit (we’ll wire this later to menu editor page) */}
              <button className="text-green-600 font-semibold hover:underline">
                Edit Menu →
              </button>

              {/* Publish / public link */}
              <button
                onClick={() => handlePublish(menu.id)}
                disabled={publishLoadingId === menu.id}
                className={`
                  px-4 py-2 rounded-xl font-semibold
                  ${publishLoadingId === menu.id
                    ? "bg-green-200 text-green-700 cursor-wait"
                    : "bg-green-500 text-white hover:bg-green-600"
                  }
                `}
              >
                {publishLoadingId === menu.id
                  ? "Publishing..."
                  : "Create / Update public link"}
              </button>

              {/* 🔴 Delete button */}
              <button
                onClick={() => handleDeleteMenu(menu.id)}
                disabled={deleteLoadingId === menu.id}
                className={`
                  ml-auto px-4 py-2 rounded-xl font-semibold
                  ${deleteLoadingId === menu.id
                    ? "bg-red-200 text-red-700 cursor-wait"
                    : "bg-red-500 text-white hover:bg-red-600"
                  }
                `}
              >
                {deleteLoadingId === menu.id ? "Deleting..." : "Delete menu"}
              </button>
            </div>
          </div>
        ))}

        {menus.length === 0 && (
          <p className="text-gray-500">No menus created yet.</p>
        )}
      </div>
    </div>
  );
}
