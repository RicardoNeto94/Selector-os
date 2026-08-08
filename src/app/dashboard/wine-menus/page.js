"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function WineMenusPage() {

  const supabase = createClient();

  const [menus, setMenus] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [accentColor, setAccentColor] = useState("#0F2744");

  useEffect(() => {
    loadMenus();
  }, []);

  async function loadMenus() {

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: restaurantData } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!restaurantData) {
      setLoading(false);
      return;
    }

    setRestaurant(restaurantData);

    const { data } = await supabase
      .from("wine_menus")
      .select("*")
      .eq("restaurant_id", restaurantData.id)
      .order("created_at", { ascending: false });

    setMenus(data || []);
    setLoading(false);
  }

  function generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-");
  }

  async function uploadLogo(file) {

    if (!file) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `menu-logo-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("restaurant-logos")
      .upload(fileName, file);

    if (error) {
      console.error(error);
      alert("Logo upload failed");
      return null;
    }

    const { data } = supabase.storage
      .from("menu-logos")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function createMenu() {

    if (!menuName || !restaurant) return;

    const slug = generateSlug(menuName);

    let logoUrl = null;

    if (logoFile) {
      logoUrl = await uploadLogo(logoFile);
    }

    const { error } = await supabase
      .from("wine_menus")
      .insert({
        name: menuName,
        slug: slug,
        restaurant_id: restaurant.id,
        logo_url: logoUrl
      });

    if (error) {
      console.error(error);
      alert("Failed to create menu");
      return;
    }

    setMenuName("");
    setLogoFile(null);
    setShowModal(false);

    loadMenus();
    window.location.reload();
  }

  async function deleteMenu(menuId) {

    const confirmed = confirm("Delete this wine menu?");
    if (!confirmed) return;

    await supabase
      .from("wine_menu_items")
      .delete()
      .eq("wine_menu_id", menuId);

    const { error } = await supabase
      .from("wine_menus")
      .delete()
      .eq("id", menuId);

    if (error) {
      console.error(error);
      alert("Failed to delete menu");
      return;
    }

    loadMenus();
  }

  if (loading) {
    return (
      <div className="page-fade">
        <div className="text-slate-400">Loading wine menus…</div>
      </div>
    );
  }

  return (
    <div className="page-fade">

      <div className="flex items-center justify-between mb-8">

        <h1 className="text-2xl font-semibold text-slate-900">
          Wine Menus
        </h1>

        <button
          onClick={() => setShowModal(true)}
          className="so-btn-primary"
        >
          + Create Wine Menu
        </button>

      </div>

      {menus.length === 0 ? (

        <div className="so-card p-8 text-center text-slate-400">
          No wine menus yet. Create your first wine list.
        </div>

      ) : (

        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">

          {menus.map((menu) => (

            <div
              key={menu.id}
              className="so-card flex flex-col justify-between h-[180px]"
            >

              <div>

                <div className="text-lg font-semibold text-slate-900">
                  {menu.name}
                </div>

                <div className="text-xs text-slate-500 mt-1">
                  Created {new Date(menu.created_at).toLocaleDateString()}
                </div>

                <div
                  className="mt-4 h-3 rounded"
                  style={{
                    background: menu.accent_color || "#0F2744"
                  }}
                />

              </div>

              <div className="flex justify-between items-center mt-6">

                <a
                  href={`/dashboard/wine-menus/${menu.slug}`}
                  className="text-sm font-medium text-slate-700 hover:text-black"
                >
                  Open
                </a>

                <a
  href={`/wine/${menu.slug}`}
  target="_blank"
  className="
    text-sm
    font-medium
    text-[#0F2744]
    hover:opacity-70
    transition-all
  "
>
  Guest View
</a>

                <button
                  onClick={() => deleteMenu(menu.id)}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  Delete
                </button>

              </div>

            </div>

          ))}

        </div>

      )}

      {showModal && (

        <div className="so-modal-backdrop">

          <div className="so-modal">

            <h2 className="text-xl font-semibold text-[var(--so-text-main)] mb-6">
              Create Wine Menu
            </h2>

            <div className="space-y-5">

              <input
                type="text"
                placeholder="Menu name (Example: Shang Shi)"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                className="w-full border border-gray-300 rounded p-3 text-[var(--so-text-main)] placeholder:text-gray-400 bg-white"
              />

              <div className="flex flex-col gap-2">

                <label className="text-sm text-[var(--so-text-muted)]">
                  Restaurant Logo
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e)=>setLogoFile(e.target.files[0])}
                />

              </div>

              <div className="flex gap-3 pt-2">

                <button
                  onClick={createMenu}
                  className="so-btn-primary"
                >
                  Create
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  className="so-btn-secondary"
                >
                  Cancel
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}