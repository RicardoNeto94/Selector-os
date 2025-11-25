'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [newDishName, setNewDishName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1) Load restaurant
        const restRes = await fetch('/api/restaurant');
        const restData = await restRes.json();
        if (!restRes.ok) throw new Error(restData.error || 'Failed to load restaurant');
        setRestaurant(restData);

        // 2) Load menu
        const menuRes = await fetch('/api/menu');
        const menuData = await menuRes.json();
        if (!menuRes.ok) throw new Error(menuData.error || 'Failed to load menu');
        setMenu(menuData);

        // 3) Load dishes
        const dishesRes = await fetch('/api/dishes');
        const dishesData = await dishesRes.json();
        if (!dishesRes.ok) throw new Error(dishesData.error || 'Failed to load dishes');
        setDishes(dishesData.dishes || []);
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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

  if (loading) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">SelectorOS Dashboard</h1>
        <p>Loading your restaurant, menu and dishes...</p>
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

      {/* Dishes card */}
      <div className="mx-auto max-w-md border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Dishes</h2>

        {dishes.length === 0 ? (
          <p className="text-sm text-gray-500 mb-4">No dishes yet. Add your first dish below.</p>
        ) : (
          <ul className="text-left mb-4">
            {dishes.map((dish) => (
              <li key={dish.id} className="mb-2">
                <strong>{dish.name}</strong>
                {dish.price != null && (
                  <span className="text-sm text-gray-500"> — €{Number(dish.price).toFixed(2)}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddDish} className="space-y-3 text-left">
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
      </div>
    </main>
  );
}
