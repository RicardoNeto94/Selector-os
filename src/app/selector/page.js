'use client';

import { useEffect, useState } from 'react';

// 🔥 THEME INJECTION FUNCTION — added at top
function applyTheme(theme) {
  if (!theme) return;

  const root = document.documentElement;

  if (theme.theme_primary_color)
    root.style.setProperty("--primary", theme.theme_primary_color);

  if (theme.theme_secondary_color)
    root.style.setProperty("--secondary", theme.theme_secondary_color);

  if (theme.theme_accent_color)
    root.style.setProperty("--accent", theme.theme_accent_color);

  if (theme.theme_font)
    root.style.setProperty("--font", theme.theme_font);

  if (theme.theme_card_style)
    root.style.setProperty("--card-style", theme.theme_card_style);

  // Background image
  if (theme.theme_background_url) {
    document.body.style.backgroundImage = `url(${theme.theme_background_url})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
  }

  // Optional logo element
  const logoEl = document.getElementById("restaurant-logo");
  if (logoEl && theme.theme_logo_url) {
    logoEl.src = theme.theme_logo_url;
  }
}

export default function SelectorPage() {
  const [restaurant, setRestaurant] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [dishAllergens, setDishAllergens] = useState({});
  const [allergenCatalog, setAllergenCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Guest's selected allergies (codes like ['GA','GL'])
  const [activeAllergies, setActiveAllergies] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1) Load restaurant (header + theme)
        const restRes = await fetch('/api/restaurant');
        const restData = await restRes.json();
        if (!restRes.ok) throw new Error(restData.error || 'Failed to load restaurant');

        setRestaurant(restData);

        // 🔥 APPLY THEME HERE
        applyTheme(restData);

        // 2) Dishes
        const dishesRes = await fetch('/api/dishes');
        const dishesData = await dishesRes.json();
        if (!dishesRes.ok) throw new Error(dishesData.error || 'Failed to load dishes');

        const loadedDishes = dishesData.dishes || [];
        setDishes(loadedDishes);

        // 3) Allergen catalog
        const catalogRes = await fetch('/api/allergens');
        const catalogData = await catalogRes.json();
        if (!catalogRes.ok)
          throw new Error(catalogData.error || 'Failed to load allergen catalog');

        setAllergenCatalog(catalogData.allergens || []);

        // 4) Per-dish allergens
        const allergenMap = {};
        await Promise.all(
          loadedDishes.map(async (dish) => {
            const res = await fetch(`/api/allergens?dish_id=${dish.id}`);
            const data = await res.json();
            if (res.ok) {
              allergenMap[dish.id] = data.allergens || [];
            }
          })
        );

        setDishAllergens(allergenMap);
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Toggle allergy
  const toggleAllergy = (code) => {
    setActiveAllergies((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const clearAllergies = () => setActiveAllergies([]);

  if (loading) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-2">SelectorOS</h1>
        <p>Loading selector…</p>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-2">SelectorOS</h1>
        <p className="text-red-600">Error: {errorMsg}</p>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-8 max-w-5xl mx-auto">
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-1">
          {restaurant?.name || 'SelectorOS'}
        </h1>
        <p className="text-gray-500">Allergen selector (staff view)</p>
      </header>

      {/* Allergen picker */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-center">Guest allergies</h2>

        <div className="flex flex-wrap gap-2 justify-center mb-3">
          {allergenCatalog.map((a) => {
            const isActive = activeAllergies.includes(a.code);
            return (
              <button
                key={a.code}
                type="button"
                onClick={() => toggleAllergy(a.code)}
                className="px-3 py-1 rounded-full text-sm border transition"
                style={{
                  backgroundColor: isActive ? 'var(--primary)' : 'white',
                  color: isActive ? 'var(--secondary)' : 'black',
                  borderColor: isActive ? 'var(--primary)' : '#ccc'
                }}
              >
                {a.code}
                {a.name ? ` – ${a.name}` : ''}
              </button>
            );
          })}
        </div>

        <div className="text-center text-sm text-gray-500">
          {activeAllergies.length === 0 ? (
            <span>No allergies selected. Showing all dishes.</span>
          ) : (
            <>
              <span className="mr-2">
                Active: {activeAllergies.join(', ')}
              </span>
              <button
                type="button"
                onClick={clearAllergies}
                className="underline text-gray-600"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </section>

      {/* Dish list */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-center">Dishes</h2>

        {dishes.length === 0 ? (
          <p className="text-center text-gray-500">
            No dishes found. Add dishes in your dashboard first.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dishes.map((dish) => {
              const allergens = dishAllergens[dish.id] || [];
              const codesForDish = allergens.map((a) => a.code);

              const conflicts = activeAllergies.filter((code) =>
                codesForDish.includes(code)
              );

              const isSafe =
                activeAllergies.length === 0 ? true : conflicts.length === 0;

              return (
                <div
                  key={dish.id}
                  className={`border rounded-lg p-4 flex flex-col justify-between ${
                    isSafe
                      ? 'bg-white'
                      : 'bg-red-50 border-red-300'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-semibold">{dish.name}</h3>

                      {dish.price != null && (
                        <span className="text-sm text-gray-600">
                          €{Number(dish.price).toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 mb-2">
                      <span className="text-xs text-gray-500 mr-1">
                        Allergens:
                      </span>

                      {allergens.length === 0 ? (
                        <span className="text-xs text-gray-400">none set</span>
                      ) : (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {allergens.map((a) => (
                            <span
                              key={a.id}
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                                activeAllergies.includes(a.code)
                                  ? 'bg-red-600 text-white border-red-600'
                                  : 'border-gray-300'
                              }`}
                            >
                              {a.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-xs font-medium">
                    {activeAllergies.length === 0 ? (
                      <span className="text-gray-500">
                        No allergies selected.
                      </span>
                    ) : isSafe ? (
                      <span className="text-green-700">Safe for this guest.</span>
                    ) : (
                      <span className="text-red-700">
                        Contains: {conflicts.join(', ')}.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
