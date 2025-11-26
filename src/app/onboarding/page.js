'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function OnboardingPage() {
  const supabase = createClientComponentClient();
  const [restaurant, setRestaurant] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOnboarding();
  }, []);

  const loadOnboarding = async () => {
    try {
      // 1) Ensure restaurant exists (creates one if missing)
      const restaurantRes = await fetch('/api/restaurant');
      const restaurantData = await restaurantRes.json();

      if (!restaurantData || restaurantData.error) {
        setError('Restaurant not found');
        return;
      }

      setRestaurant(restaurantData);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-3xl font-bold">SelectorOS Onboarding</h1>
        <p className="text-red-600 mt-4">Error: {error}</p>
        <a href="/dashboard" className="button mt-6">
          Go to dashboard
        </a>
      </main>
    );
  }

  if (!restaurant) {
    return <main className="p-8 text-center">Loading…</main>;
  }

  return (
    <main className="p-8 text-center">
      <h1 className="text-3xl font-bold">SelectorOS Onboarding</h1>
      <p className="mt-4">Welcome! Your restaurant is ready:</p>
      <p className="mt-2 font-semibold">{restaurant.name}</p>

      <a href="/dashboard" className="button mt-8">
        Continue to dashboard
      </a>
    </main>
  );
}
