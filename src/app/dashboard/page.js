'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1) Load /api/restaurant (creates one if missing)
        const restRes = await fetch('/api/restaurant');
        const restData = await restRes.json();
        if (!restRes.ok) throw new Error(restData.error || 'Failed to load restaurant');

        setRestaurant(restData);

        // 2) Load /api/menu (creates "Main Menu" if missing)
        const menuRes = await fetch('/api/menu');
        const menuData = await menuRes.json();
        if (!menuRes.ok) throw new Error(menuData.error || 'Failed to load menu');

        setMenu(menuData);
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">SelectorOS Dashboard</h1>
        <p>Loading your restaurant and menu...</p>
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

      {menu && (
        <div className="mx-auto max-w-md border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Menu</h2>
          <p className="text-sm text-gray-500 mb-1">
            Name: <strong>{menu.name}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Menu ID: <code>{menu.id}</code>
          </p>
        </div>
      )}
    </main>
  );
}
