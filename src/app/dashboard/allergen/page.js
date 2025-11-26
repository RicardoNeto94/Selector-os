"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    return <p className="text-gray-400">Loading allergens…</p>;
  }

  return (
    <div className="space-y-10">

      {/* HEADER */}
      <div className="bg-white shadow-sm border rounded-2xl p-8">
        <h1 className="text-3xl font-bold">Allergens</h1>
        <p className="text-gray-500 mt-1">
          Manage global allergen definitions used across your dishes.
        </p>

        <button
          className="
            mt-6 px-5 py-3 
            bg-green-500 text-white 
            rounded-xl 
            hover:bg-green-600 transition font-semibold
          "
        >
          + Add Allergen
        </button>
      </div>

      {/* ALLERGEN GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {allergens.map((a) => (
          <div
            key={a.id}
            className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-lg transition"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xl font-bold text-green-600">
                {a.allergen_code}
              </span>

              <Link
                href={`/dashboard/allergens/${a.id}`}
                className="text-green-600 text-sm font-semibold hover:underline"
              >
                Edit →
              </Link>
            </div>

            <p className="text-gray-700 text-sm">{a.name}</p>

            {a.description && (
              <p className="text-gray-500 text-xs mt-3">{a.description}</p>
            )}
          </div>
        ))}

        {/* EMPTY STATE */}
        {allergens.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-20">
            <p className="text-lg mb-4">No allergens added yet.</p>
            <p className="text-sm">Add your first allergen to get started.</p>
          </div>
        )}

      </div>
    </div>
  );
}
