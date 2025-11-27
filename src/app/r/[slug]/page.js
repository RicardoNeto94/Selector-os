import Link from "next/link";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function RestaurantLanding({ params }) {
  const supabase = createServerComponentClient({ cookies });

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("public_slug", params.slug)
    .maybeSingle();

  if (!restaurant) {
    return <p className="text-center text-red-600">Restaurant not found.</p>;
  }

  return (
    <div className="space-y-10">
      <div className="text-center">
        {restaurant.theme_logo_url && (
          <img
            src={restaurant.theme_logo_url}
            className="mx-auto w-32 mb-6"
            alt="Restaurant Logo"
          />
        )}

        <h1 className="text-4xl font-bold accent-text">{restaurant.name}</h1>
        <p className="text-gray-600 mt-2">{restaurant.cuisine}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Link href={`/r/${params.slug}/menu`} className="card text-center">
          <h2 className="text-xl font-semibold">Allergen Tool</h2>
        </Link>

        <Link href={`/r/${params.slug}/dishes`} className="card text-center">
          <h2 className="text-xl font-semibold">Dish List</h2>
        </Link>

        <Link href={`/r/${params.slug}/allergens`} className="card text-center">
          <h2 className="text-xl font-semibold">Allergens</h2>
        </Link>
      </div>
    </div>
  );
}

