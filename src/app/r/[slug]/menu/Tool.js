"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";

// This is the base component that will later:
// ✔ Load dishes for this restaurant
// ✔ Load allergens
// ✔ Render a Shang Shi style grid
// ✔ Handle guest/staff mode
// ✔ Handle dish highlighting
// ✔ Handle counters
// ✔ Handle resets

export default function Tool() {
  const supabase = createClientComponentClient();
  const params = useParams();

  const [restaurant, setRestaurant] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // 1. fetch restaurant
    const { data: r } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", params.slug)
      .maybeSingle();

    setRestaurant(r);

    // 2. fetch dishes for this restaurant
    const { data: d } = await supabase
      .from("dishes")
      .select("*")
      .eq("restaurant_id", r.id)
      .order("position", { ascending: true });

    setDishes(d || []);

    // 3. fetch all allergens
    const { data: a } = await supabase.from("allergen").select("*");
    setAllergens(a || []);

    setLoading(false);
  };

  if (loading) {
    return <p className="text-gray-400">Loading menu…</p>;
  }

  if (!restaurant) {
    return <p className="text-red-500">Restaurant not found.</p>;
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-6">
        {restaurant.name} — Live Allergen Tool
      </h2>

      <p className="text-gray-600 mb-4">
        Tool is connected. Next step: render grid, categories, dish cards, staff/guest mode.
      </p>

      <div className="border rounded-xl p-4 bg-gray-50">
        <pre className="text-xs text-gray-500">
          {JSON.stringify(
            {
              restaurant: restaurant.slug,
              dishes: dishes.length,
              allergens: allergens.length,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}

