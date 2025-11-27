"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function MenuPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [restaurant, setRestaurant] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState(null);
  const [publishLoadingId, setPublishLoadingId] = useState(null);

  useEffect(() => {
    loadMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMenus() {
    setLoading(true);
    setGlobalError(null);

    // Get logged in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(userError);
      setGlobalError("Unable to load user.");
      setLoading(false);
      return;
    }

    if (!user) {
      setGlobalError("You must be logged in to view menus.");
      setLoading(false);
      return;
    }

    // Get the restaurant
    const { data: r, error: restError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (restError) {
      console.error(restError);
      setGlobalError("Unable to load restaurant.");
      setLoading(false);
      return;
    }

    if (!r) {
      setGlobalError("Restaurant not found for this user.");
      setLoading(false);
      return;
    }

    setRestaurant(r);

    // Get menus
    const { data: m, error: menuError } = await supabase
      .from("menus")
      .select("*")
      .eq("restaurant_id", r.id)
      .order("created_at", { ascending: true });

    if (menuError) {
      console.error(menuError);
      setGlobalError("Unable to load menus.");
    }

    setMenus(m || []);
    setLoading(false);
  }

  async function handlePublish(menuId) {
    setGlobalError(null);
    setPublishLoadingId(menuId);

    try {
      const res = await fetch("/api/menu/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || `Failed with status ${res.status}`);
      }

      if (json?.url) {
        // Open public page in new tab for now
        window.open(json.url, "_blank");
      }
    } catch (err) {
      console.error("Publish menu error (client):", err);
      setGlobalError(err.message || "Menu not found");
    } finally {
      setPublishLoadingId(null);
    }
  }

  function handleEditMenu(menuId) {
    // For now, just send them to the dishes page.
    // Later you can do router.push(`/menu/${menuId}/edit`) when we build it.
    router.push("/dishes");
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

        <button
          className="
            mt-6 px-5 py-3 
            bg-green-500 text-white 
            rounded-xl 
            hover:bg-green-600 transition font-semibold
          "
          // TODO: real add-menu modal later
          onClick={() => alert("Add Menu: not implemented yet")}
        >
          + Add Menu
        </button>
      </div>

      {/* GLOBAL ERROR */}
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
            className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow transition"
          >
            <h2 className="text-xl font-semibold">{menu.name}</h2>
            <p className="text-gray-500 text-sm mt-1">
              Created: {new Date(menu.created_at).toLocaleString()}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="text-green-600 font-semibold hover:underline"
                type="button"
                onClick={() => handleEditMenu(menu.id)}
              >
                Edit Menu →
              </button>

              <button
                className="
                  px-4 py-2 
                  bg-green-500 text-white 
                  rounded-xl hover:bg-green-600 
                  text-sm font-semibold
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                type="button"
                onClick={() => handlePublish(menu.id)}
                disabled={publishLoadingId === menu.id}
              >
                {publishLoadingId === menu.id
                  ? "Creating link..."
                  : "Create / Update public link"}
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
