"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function MenuPage() {
  const supabase = createClientComponentClient();

  const [restaurant, setRestaurant] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  // new state for publish flow
  const [publishingId, setPublishingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMenus() {
    setLoading(true);
    setError(null);

    // Get logged in user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Get the restaurant
    const { data: r } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    setRestaurant(r);

    if (!r) {
      setMenus([]);
      setLoading(false);
      return;
    }

    // Get menus
    const { data: m } = await supabase
      .from("menus")
      .select("*")
      .eq("restaurant_id", r.id)
      .order("created_at", { ascending: true });

    setMenus(m || []);
    setLoading(false);
  }

  // 🔧 Step 4 – call /api/menu/publish
  async function handlePublish(menuId) {
    setError(null);
    setPublishingId(menuId);

    try {
      const res = await fetch("/api/menu/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ menuId }),
      });

      let json = null;
      try {
        json = await res.json();
      } catch {
        // ignore JSON parse errors, we'll fallback to generic message
      }

      if (!res.ok) {
        const msg =
          json?.error ||
          `Failed to publish menu (status ${res.status}).`;
        throw new Error(msg);
      }

      // Expecting { url, menuId? } from the API
      const publicUrl = json?.url;

      // Optimistically update this menu with the public URL
      if (publicUrl) {
        setMenus((prev) =>
          prev.map((m) =>
            m.id === menuId ? { ...m, public_url: publicUrl } : m
          )
        );
      }

      // Optional: quick feedback
      // alert("Menu published! Public link copied to clipboard.");
      if (publicUrl && navigator?.clipboard) {
        navigator.clipboard.writeText(publicUrl).catch(() => {});
      }
    } catch (err) {
      console.error("Publish menu error:", err);
      setError(err.message || "Something went wrong while publishing.");
    } finally {
      setPublishingId(null);
    }
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
        >
          + Add Menu
        </button>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
          {error}
        </div>
      )}

      {/* MENUS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {menus.map((menu) => (
          <div
            key={menu.id}
            className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow transition space-y-4"
          >
            <div>
              <h2 className="text-xl font-semibold">{menu.name}</h2>
              <p className="text-gray-500 text-sm mt-1">
                Created: {new Date(menu.created_at).toLocaleString()}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="
                  text-green-600 font-semibold hover:underline
                "
              >
                Edit Menu →
              </button>

              <button
                type="button"
                onClick={() => handlePublish(menu.id)}
                disabled={publishingId === menu.id}
                className={`
                  px-4 py-2 rounded-lg text-sm font-semibold
                  border border-green-500 
                  text-green-700
                  hover:bg-green-50
                  transition
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {publishingId === menu.id
                  ? "Publishing…"
                  : "Create / Update public link"}
              </button>
            </div>

            {menu.public_url && (
              <div className="pt-2 border-t mt-2">
                <p className="text-xs text-gray-500 mb-1">
                  Public allergen tool:
                </p>
                <a
                  href={menu.public_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-green-700 underline break-all"
                >
                  {menu.public_url}
                </a>
              </div>
            )}
          </div>
        ))}

        {menus.length === 0 && (
          <p className="text-gray-500">No menus created yet.</p>
        )}
      </div>
    </div>
  );
}
