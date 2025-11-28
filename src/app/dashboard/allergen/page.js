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
