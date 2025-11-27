import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function PublicMenuPage({ params }) {
  const supabase = createServerComponentClient({ cookies });

  // restaurantId is the slug from the URL
  const { restaurantId } = params;

  // Fetch restaurant by public_slug
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("public_slug", restaurantId)
    .single();

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="text-2xl font-bold">Restaurant not found</h1>
        <p className="text-gray-500 mt-2">This menu link is invalid.</p>
      </div>
    );
  }

  // Fetch published menu
  const { data: menu } = await supabase
    .from("menus")
    .select("id, name, created_at")
    .eq("restaurant_id", restaurant.id)
    .eq("is_published", true)
    .single();

  if (!menu) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <p className="text-gray-500 mt-2">This restaurant has no published menu yet.</p>
      </div>
    );
  }

  // Fetch dishes + allergens
  const { data: dishes } = await supabase
    .from("dishes")
    .select("id, name, description, allergens(id, code, label)")
    .eq("menu_id", menu.id);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold mb-2 text-gray-900">{restaurant.name}</h1>
      <p className="text-gray-500 mb-10">Interactive allergen-friendly menu</p>

      <div className="space-y-6">
        {dishes?.map((dish) => (
          <div key={dish.id} className="p-5 bg-white rounded-xl shadow">
            <h2 className="text-xl font-semibold">{dish.name}</h2>
            {dish.description && (
              <p className="text-gray-600 mt-1">{dish.description}</p>
            )}

            {/* Allergen badges */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {dish.allergens?.map((a) => (
                <span
                  key={a.id}
                  className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 font-medium"
                >
                  {a.code}
                </span>
              ))}

              {dish.allergens?.length === 0 && (
                <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 font-medium">
                  Allergen-free
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

