"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function WinesPage() {

  const supabase = createClientComponentClient();

  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWines();
  }, []);

  const loadWines = async () => {

    try {

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

      const { data: winesData, error } = await supabase
        .from("wines")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Wine loading error:", error);
      }

      setWines(winesData || []);

    } catch (err) {
      console.error("Unexpected wine loading error:", err);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="page-fade">
        <div className="text-slate-400">Loading wines…</div>
      </div>
    );
  }

  return (
    <div className="page-fade">

      <div className="flex items-center justify-between mb-8">

        <h1 className="text-2xl font-semibold text-white">
          Wine Library
        </h1>

        <a
          href="/dashboard/wines/new"
          className="so-btn-primary"
        >
          + Add Wine
        </a>

      </div>

      {wines.length === 0 ? (
        <div className="so-card p-8 text-center text-slate-400">
          No wines yet. Start by adding your first bottle.
        </div>
      ) : (

        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">

          {wines.map((wine) => (

            <div
              key={wine.id}
              className="so-card p-6 hover:scale-[1.02] transition-transform cursor-pointer"
            >

              <div className="text-lg font-semibold text-white">
                {wine.name}
              </div>

              <div className="text-sm text-slate-400 mt-1">
                {wine.region} · {wine.country}
              </div>

              <div className="text-sm text-slate-400">
                {wine.vintage} · {wine.size}
              </div>

              <div className="mt-3 text-sm text-slate-300">
                €{wine.price ?? "-"}
              </div>

              <div className="mt-2 text-xs text-slate-500">
                Stock: {wine.stock ?? 0} bottles
              </div>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}
