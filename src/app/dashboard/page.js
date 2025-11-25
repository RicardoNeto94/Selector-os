'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        const res = await fetch('/api/restaurant');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load restaurant');
        }

        setRestaurant(data);
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadRestaurant();
  }, []);

  if (loading) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">SelectorOS Dashboard</h1>
        <p>Loading your restaurant...</p>
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

    <div className="mx-auto max-w-md border rounded-lg p-6">
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
  </main>
);
