'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [dishAllergens, setDishAllergens] = useState({});
  const [allergenCatalog, setAllergenCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // New dish form
  const [newDishName, setNewDishName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');

  // Add allergen form
  const [selectedDishForAllergen, setSelectedDishForAllergen] = useState('');
  const [selectedAllergenCode, setSelectedAllergenCode] = useState('');
  const [addingAllergen, setAddingAllergen] = useState(false);

  // Load restaurant, menu, dishes, allergens
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1) Restaurant
        const restRes = await fetch('/api/restaurant');
        const restData = await restRes.json();
        if (!restRes.ok) throw new Error(restData.error || 'Failed to load restaurant');
        setRestaurant(restData);

        // 2) Menu
        const menuRes = await fetch('/api/menu');
        const menuData = await menuRes.json();
        if (!menuRes.ok) throw new Error(menuData.error || 'Failed to load menu');
        setMenu(menuData);

        // 3) Dishes
        const dishesRes = await fetch('/api/dishes');
        const dishesData = await dishesRes.json();
        if (!dishesRes.ok) throw new Error(dishesData.error || 'Failed to load dishes');
        const loadedDishes = dishesData.dishes || [];
        setDishes(loadedDishes);

        // 4) Allergen catalog
        const catalogRes = await fetch('/api/allergens');
        const catalogData = await catalogRes.json();
        if (!catalogRes.ok)
          throw new Error(catalogData.error || 'Failed to load allergen catalog');
        setAllergenCatalog(catalogData.allergens || []);

        // 5) Per-dish allergens
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

  // Add new dish
  const handleAddDish = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newDishName.trim()) {
      setErrorMsg('Dish name is required');
      return;
    }

    try {
      const res = await fetch('/api/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDishName,
          price: newDishPrice ? Number(newDishPrice) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add dish');
      }

      setDishes((prev) => [...prev, data]);
      setNewDishName('');
      setNewDishPrice('');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    }
  };

  // Add allergen to a dish
  const handleAddAllergen = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedDishForAllergen) {
      setErrorMsg('Please choose a dish');
      return;
    }
    if (!selectedAllergenCode) {
      setErrorMsg('Please choose an allergen code');
      return;
    }

    try {
      setAddingAllergen(true);

      const res = await fetch('/api/allergens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dish_id: selectedDishForAllergen,
          allergen_code: selectedAllergenCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add allergen');
      }

      setDishAllergens((prev) => {
        const existing = prev[selectedDishForAllergen] || [];
        return {
          ...prev,
          [selectedDishForAllergen]: [...existing, data],
        };
      });

      setSelectedAllergenCode('');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setAddingAllergen(false);
    }
  };

  if (loading) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">SelectorOS Dashboard</h1>
        <p>Loading your restaurant, menu, dishes and allergens...</p>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">SelectorOS Dashboard</h1>
        <p className="text-red-600">Error: {errorMsg}</p>
      </main>
    );
  }

  return (
    <main className="p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">SelectorOS Dashboard</h1>

      {/* Restaurant card */}
      <div className="mx-auto max-w-md border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">{restaurant.name}</h2>
        <p className="text-sm text-gray-500 mb-2">
          Restaurant ID: <code>{restaurant.id}</code>
        </p>
        <p className="text-sm text-gray-500">
          Created at:{' '}
          {restaurant.created_at
            ? new Date(restaurant.created_at).toLocaleString()
            : 'Unknown'}
        </p>
      </div>

      {/* Menu card */}
      {menu && (
        <div className="mx-auto max-w-md border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Menu</h2>
          <p className="text-sm text-gray-500 mb-1">
            Name: <strong>{menu.name}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Menu ID: <code>{menu.id}</code>
          </p>
        </div>
      )}

      {/* Dishes & allergens */}
      <div className="mx-auto max-w-md border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Dishes</h2>

        {dishes.length === 0 ? (
          <p className="text-sm text-gray-500 mb-4">
            No dishes yet. Add your first dish below.
          </p>
        ) : (
          <ul className="text-left mb-6">
            {dishes.map((dish) => {
              const allergens = dishAllergens[dish.id] || [];
              return (
                <li key={dish.id} className="mb-4 border-b pb-3 last:border-b-0">
                  <div className="flex justify-between">
                    <div>
                      <strong>{dish.name}</strong>
                      {dish.price != null && (
                        <span className="text-sm text-gray-500">
                          {' '}
                          — €{Number(dish.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-xs text-gray-500 mr-1">Allergens:</span>
                    {allergens.length === 0 ? (
                      <span className="text-xs text-gray-400">none set</span>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {allergens.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
                          >
                            {a.code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Add dish form */}
        <form onSubmit={handleAddDish} className="space-y-3 text-left mb-6">
          <h3 className="font-semibold text-sm">Add new dish</h3>
          <div>
            <label className="block text-sm mb-1">Dish name</label>
            <input
              className="input w-full"
              value={newDishName}
              onChange={(e) => setNewDishName(e.target.value)}
              placeholder="e.g. Peking Duck"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Price (optional)</label>
            <input
              className="input w-full"
              type="number"
              step="0.01"
              value={newDishPrice}
              onChange={(e) => setNewDishPrice(e.target.value)}
              placeholder="e.g. 45.00"
            />
          </div>

          <button type="submit" className="button-inverse w-full">
            Add Dish
          </button>
        </form>

        {/* Add allergen form */}
        {dishes.length > 0 && (
          <form onSubmit={handleAddAllergen} className="space-y-3 text-left">
            <h3 className="font-semibold text-sm">Add allergen to dish</h3>

            <div>
              <label className="block text-sm mb-1">Dish</label>
              <select
                className="input w-full"
                value={selectedDishForAllergen}
                onChange={(e) => setSelectedDishForAllergen(e.target.value)}
              >
                <option value="">Select dish…</option>
                {dishes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Allergen</label>
              <select
                className="input w-full"
                value={selectedAllergenCode}
                onChange={(e) => setSelectedAllergenCode(e.target.value)}
              >
                <option value="">Select allergen…</option>
                {allergenCatalog.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="button-secondary w-full"
              disabled={addingAllergen}
            >
              {addingAllergen ? 'Adding…' : 'Add Allergen'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
