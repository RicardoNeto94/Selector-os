"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AllergensPage() {
  const supabase = createClientComponentClient();

  const [allergens, setAllergens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllergens();
  }, []);

  async function loadAllergens() {
    setLoading(true);

    const { data } = await supabase
      .from("allergens")
      .select("*")
      .order("allergen_code", { ascending: true });

    setAllergens(data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-300 text-sm">
        Loading allergens…
      </div>
    );
  }

  return (
    <div className="space-y-8 text-slate-100">
      {/* HERO / HEADER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 p-8 border border-white/5 shadow-[0_32px_80px_rgba(0,0,0,0.65)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute right-0 bottom-0 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.2em] text-emerald-300/70 uppercase">
              SelectorOS • Allergen Library
            </p>
            <h1 className="text-3xl md:text-4xl font-black">
              Manage your global allergens.
            </h1>
            <p className="text-sm text-slate-300/80 max-w-xl">
              Centralize allergen definitions once and reuse them across all
              dishes and menus. Updates are reflected live in your staff tools.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3">
            <p className="text-xs text-slate-400">
              Total allergens in library
            </p>
            <div className="text-3xl font-semibold text-emerald-400">
              {allergens.length}
            </div>
            <button
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400 hover:-translate-y-0.5 transition"
            >
              + Add allergen
            </button>
          </div>
        </div>
      </section>

      {/* ALLERGENS CONTENT */}
      {allergens.length === 0 ? (
        // EMPTY STATE
        <section className="rounded-3xl bg-slate-950/80 border border-white/10 p-12 shadow-[0_22px_60px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center text-center space-y-3">
          <p className="text-sm font-semibold tracking-[0.18em] uppercase text-slate-400">
            Allergen library
          </p>
          <p className="text-2xl md:text-3xl font-bold text-slate-50">
            No allergens added yet.
          </p>
          <p className="text-sm text-slate-300 max-w-md">
            Start by creating your first allergen in the library. Your dishes
            and menus will be able to reuse these tags instantly.
          </p>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-slate-950 px-5 py-2.5 text-sm font-semibold hover:bg-emerald-400 hover:-translate-y-0.5 transition"
          >
            + Add allergen
          </button>
        </section>
      ) : (
        // GRID VIEW
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {allergens.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-white/8 bg-slate-950/70 p-6 backdrop-blur-xl shadow-[0_18px_45px_rgba(0,0,0,0.55)] hover:border-emerald-400/40 hover:-translate-y-0.5 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl font-bold text-emerald-300">
                  {a.allergen_code}
                </span>
                <span className="text-xs text-slate-400 italic">
                  Edit coming soon
                </span>
              </div>

              <p className="font-semibold text-slate-100 mb-1">{a.name}</p>

              {a.description && (
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {a.description}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
