'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

export default function OnboardingPage() {
  const supabase = createClientComponentClient();
  const [restaurant, setRestaurant] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOnboarding();
  }, []);

  const loadOnboarding = async () => {
    try {
      // Ensure restaurant exists
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

  return (
    <main className="p-12 text-center">
      <h1 className="text-4xl font-bold mb-8">
        Selector<span className="text-green-500">OS</span> Onboarding
      </h1>

      {/* ERROR STATE */}
      {error && (
        <div className="text-red-600 text-xl">
          Error: {error}
        </div>
      )}

      {/* SUCCESS STATE */}
      {restaurant && (
        <>
          <p className="text-lg mb-6">
            Welcome! Your restaurant is ready:
          </p>

          <h2 className="text-2xl font-semibold mb-10">
            {restaurant.name}
          </h2>

          <Link
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
              text-green-600
              hover:bg-green-50
              transition
            "
          >
            Continue to dashboard
          </Link>
        </>
      )}
    </main>
  );
}
