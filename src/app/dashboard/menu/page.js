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
    try {
      setLoading(true);
      setGlobalError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setGlobalError("You must be signed in to see menus.");
        setLoading(false);
        return;
      }

      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (restaurantError) {
        console.error("Restaurant load error:", restaurantError);
        throw restaurantError;
      }

      if (!restaurantData) {
        setGlobalError("No restaurant found for this account.");
        setRestaurant(null);
        setMenus([]);
        setLoading(false);
        return;
      }

      setRestaurant(restaurantData);

      const { data: menusData, error: menusError } = await supabase
        .from("menus")
        .select("*")
        .eq("restaurant_id", restaurantData.id)
        .order("created_at", { ascending: false });

      if (menusError) {
        console.error("Menus load error:", menusError);
        throw menusError;
      }

      setMenus(menusData || []);
    } catch (err) {
      console.error("loadMenus error:", err);
      setGlobalError(err.message || "Failed to load menus.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateMenu() {
    try {
      setGlobalError(null);

      const res = await fetch("/api/menu", {
        method: "POST",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || "Failed to create menu");
      }

      // Reload menus so the new one appears
      await loadMenus();
    } catch (err) {
      console.error("Add menu error:", err);
      setGlobalError(err.message || "Could not create menu.");
    }
  }

  async function handlePublishMenu(menuId) {
    try {
      setGlobalError(null);
      setPublishLoadingId(menuId);

      const res = await fetch("/api/menu/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || "Failed to publish menu");
      }

      // Optional: store the URL in local state so we can show it immediately
      if (json.url) {
        setMenus((prev) =>
          prev.map((m) =>
            m.id === menuId ? { ...m, public_url: json.url } : m
          )
        );
      }
    } catch (err) {
      console.error("Publish menu error:", err);
      setGlobalError(err.message || "Could not publish menu.");
    } finally {
      setPublishLoadingId(null);
    }
  }

  async function handleDeleteMenu(menuId) {
    const sure = window.confirm(
      "Delete this menu? This will remove its public link and cannot be undone."
    );
    if (!sure) return;

    try {
      setGlobalError(null);
      setDeleteLoadingId(menuId);

      const res = await fetch("/api/menu/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuId }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || "Failed to delete menu");
      }

      setMenus((prev) => prev.filter((m) => m.id !== menuId));
    } catch (err) {
      console.error("Delete menu error:", err);
      setGlobalError(err.message || "Could not delete menu.");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-300 text-sm">
        Loading menus…
      </div>
    );
  }

  return (
    <div className="space-y-8 text-slate-100">
      {/* HEADER CARD */}
      <section className="bg-slate-950/80 border border-white/10 rounded-2xl p-8 shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold">Menus</h1>
            <p className="text-slate-400">
              Organize your tasting menus and connect them to the staff
              SelectorOS view.
            </p>
            {restaurant?.name && (
              <p className="text-xs text-slate-500">
                Restaurant:{" "}
                <span className="font-semibold text-slate-200">
                  {restaurant.name}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-col items-start md:items-end gap-3">
            <p className="text-xs text-slate-400">Total menus</p>
            <div className="text-3xl font-semibold text-emerald-400">
              {menus.length}
            </div>
            <button
              onClick={handleCreateMenu}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-slate-950 px-5 py-2.5 text-sm font-semibold hover:bg-emerald-400 hover:-translate-y-0.5 transition"
            >
              + Add menu
            </button>
          </div>
        </div>
      </section>

      {/* GLOBAL ERROR */}
      {globalError && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {globalError}
        </div>
      )}

      {/* MENUS GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {menus.map((menu) => {
          const isPublishing = publishLoadingId === menu.id;
          const isDeleting = deleteLoadingId === menu.id;

          return (
            <div
              key={menu.id}
              className="bg-slate-950/70 border border-white/10 rounded-2xl p-6 shadow-[0_18px_45px_rgba(0,0,0,0.55)] hover:border-emerald-400/40 hover:-translate-y-0.5 transition flex flex-col gap-4"
            >
              {/* Title / Meta */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {menu.name || "Untitled menu"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Created:{" "}
                    {menu.created_at
                      ? new Date(menu.created_at).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Public link info */}
              <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-slate-100">
                  Staff / Guest link
                </p>
                {menu.public_url ? (
                  <>
                    <p className="truncate text-slate-400">{menu.public_url}</p>
                    <p className="text-[11px] text-emerald-300/80">
                      Link is live. Share this with your team to access the
                      SelectorOS view.
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400">
                    This menu does not have a public link yet. Publish it to
                    generate one.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 justify-between items-center">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 transition"
                  disabled
                >
                  Edit menu (coming soon)
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePublishMenu(menu.id)}
                    disabled={isPublishing}
                    className={`
                      inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold
                      ${
                        isPublishing
                          ? "bg-emerald-900/70 text-emerald-200 cursor-wait"
                          : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      }
                    `}
                  >
                    {isPublishing ? "Publishing…" : "Create / update link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteMenu(menu.id)}
                    disabled={isDeleting}
                    className={`
                      inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold
                      ${
                        isDeleting
                          ? "bg-red-200 text-red-700 cursor-wait"
                          : "bg-red-500 text-white hover:bg-red-600"
                      }
                    `}
                  >
                    {isDeleting ? "Deleting…" : "Delete menu"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {menus.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-20">
            <p className="text-lg mb-2">No menus created yet.</p>
            <p className="text-sm">
              Create your first menu to connect it with the SelectorOS staff
              view.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
