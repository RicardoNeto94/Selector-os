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

  const [publishingId, setPublishingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMenus() {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1) Get logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(userError);
      setErrorMessage("You must be logged in to view menus.");
      setLoading(false);
      return;
    }

    // 2) Get restaurant
    const { data: r, error: restaurantError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (restaurantError || !r) {
      console.error(restaurantError);
      setErrorMessage("Could not load restaurant for this user.");
      setLoading(false);
      return;
    }

    setRestaurant(r);

    // 3) Get menus
    const { data: m, error: menuError } = await supabase
      .from("menus")
      .select("*")
      .eq("restaurant_id", r.id)
      .order("created_at", { ascending: true });

    if (menuError) {
      console.error(menuError);
      setErrorMessage("Failed to load menus.");
      setLoading(false);
      return;
    }

    setMenus(m || []);
    setLoading(false);
  }

  // 🔗 Publish menu -> ask backend for public URL
  async function handlePublish(menuId) {
    setErrorMessage(null);
    setSuccessMessage(null);
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
        // ignore parse errors
      }

      if (!res.ok) {
        const msg =
          json?.error ||
          `Failed to publish menu (status ${res.status}). Check Supabase policies.`;
        throw new Error(msg);
      }

      if (!json?.url) {
        throw new Error("Publish endpoint did not return a public URL.");
      }

      setSuccessMessage(`Public link ready: ${json.url}`);

      // Try to copy URL for convenience
      if (navigator?.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(json.url);
          setSuccessMessage(`Copied public URL to clipboard: ${json.url}`);
        } catch {
          // ignore copy failures
        }
      }

      // Refresh menus so public_url is visible if you later display it
      await loadMenus();
    } catch (err) {
      console.error("Publish menu error (client):", err);
      setErrorMessage(err.message || "Failed to publish menu.");
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
          type="button"
          onClick={() => {
            // We don’t have the full menu-builder yet
            // For now we just reload, or later this will go to /dashboard/menu/[id]
            alert("Menu creation/editing UI is coming next.");
          }}
        >
          + Add Menu
        </button>
      </div>

      {/* GLOBAL STATUS BANNERS */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-center">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl p-4 text-center">
          {successMessage}
        </div>
      )}

      {/* MENUS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {menus.map((menu) => (
          <div
            key={menu.id}
            className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow transition flex flex-col justify-between"
          >
            <div>
              <h2 className="text-xl font-semibold">{menu.name}</h2>
              <p className="text-gray-500 text-sm mt-1">
                Created: {new Date(menu.created_at).toLocaleString()}
              </p>

              {menu.public_url && (
                <p className="text-xs text-gray-400 mt-2 break-all">
                  Public link: {menu.public_url}
                </p>
              )}
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                className="text-green-600 font-semibold hover:underline"
                type="button"
                onClick={() => {
                  // TODO: when we build the menu builder, we’ll navigate there.
                  // Example: router.push(`/dashboard/menu/${menu.id}`);
                  alert("Edit Menu UI not built yet – this is just a placeholder.");
                }}
              >
                Edit Menu →
              </button>

              <button
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition
                  ${
                    publishingId === menu.id
                      ? "bg-gray-300 text-gray-700 cursor-wait"
                      : "bg-green-500 text-white hover:bg-green-600"
                  }
                `}
                type="button"
                disabled={publishingId === menu.id}
                onClick={() => handlePublish(menu.id)}
              >
                {publishingId === menu.id
                  ? "Publishing…"
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
