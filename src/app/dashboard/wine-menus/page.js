"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WineMenusPage() {

  const supabase = createClientComponentClient();

  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!restaurant) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("wine_menus")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });

    setMenus(data || []);
    setLoading(false);
  };

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

        <h1 className="text-2xl font-semibold text-white">
          Wine Menus
        </h1>

        <a
          href="/dashboard/wine-menus/new"
          className="so-btn-primary"
        >
          + Create Wine Menu
        </a>

      </div>

      {menus.length === 0 ? (

        <div className="so-card p-8 text-center text-slate-400">
          No wine menus yet. Create your first wine list.
        </div>

      ) : (

        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">

          {menus.map((menu) => (

            <a
              key={menu.id}
              href={`/dashboard/wine-menus/${menu.id}`}
              className="so-card p-6 hover:scale-[1.02] transition-transform"
            >

              <div className="text-lg font-semibold text-white">
                {menu.name}
              </div>

              <div className="text-sm text-slate-400 mt-2">
                Created {new Date(menu.created_at).toLocaleDateString()}
              </div>

            </a>

          ))}

        </div>

      )}

    </div>
  );
}
