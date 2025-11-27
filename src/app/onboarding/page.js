'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // SLUGIFY FUNCTION
  const slugify = (str) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-') // replace spaces + symbols
      .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens

  // If user already has a restaurant → skip onboarding
  useEffect(() => {
    checkExistingRestaurant();
  }, []);

  async function checkExistingRestaurant() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('restaurants')
      .select('slug')
      .eq('owner_id', user.id)
      .single();

    if (data?.slug) {
      router.push(`/r/${data.slug}`);
    }
  }

  async function createRestaurant() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert('You must be signed in.');
      return;
    }

    const slug = slugify(name);

    // Insert restaurant
    const { data, error } = await supabase
      .from('restaurants')
      .insert([
        {
          owner_id: user.id,
          name,
          slug,
        },
      ])
      .select()
      .single();

    if (error) {
      alert('Error: ' + error.message);
      setLoading(false);
      return;
    }

    // Redirect to /r/[slug]
    router.push(`/r/${slug}`);
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-20">
      <h1 className="text-4xl font-bold mb-10">
        Welcome to Selector<span className="text-green-500">OS</span>
      </h1>

      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8 space-y-6">
        <label className="block text-left text-gray-700 font-semibold">
          Your Restaurant Name
        </label>

        <input
          type="text"
          placeholder="Ex: Koyo"
          className="w-full border rounded-xl px-4 py-3 text-lg"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          onClick={createRestaurant}
          disabled={loading || name.length < 2}
          className="w-full py-3 rounded-xl bg-green-500 text-white text-lg font-semibold hover:bg-green-600 disabled:opacity-40"
        >
          {loading ? 'Creating...' : 'Create & Continue'}
        </button>
      </div>
    </main>
  );
}
