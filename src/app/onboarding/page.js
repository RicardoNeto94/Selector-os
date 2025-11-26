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
    <h1 className="text-3xl font-bold mb-8">SelectorOS Onboarding</h1>

    <p className="text-lg mb-4">Welcome! Your restaurant is ready:</p>

    <p className="text-xl font-semibold mb-8">{restaurant.name}</p>

    <a
      href="/dashboard"
      className="
        inline-block 
        px-10 
        py-4 
        rounded-full 
        text-lg 
        font-semibold 
        border-2 
        border-green-400 
        text-green-500 
        hover:bg-green-50 
        transition
      "
    >
      Continue to dashboard
    </a>
  </main>
);
