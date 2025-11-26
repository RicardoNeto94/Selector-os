'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        const res = await fetch('/api/restaurant');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load restaurant');
        }

        // If onboarding already done, skip straight to dashboard
        if (data.onboarding_complete) {
          router.replace('/dashboard');
          return;
        }

        // Pre-fill form with existing data if any
        setName(data.name || '');
        setLocation(data.location || '');
        setCuisine(data.cuisine || '');
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadRestaurant();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);

    try {
      const res = await fetch('/api/restaurant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location, cuisine }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save restaurant info');
      }

      // After onboarding → go to dashboard
      router.replace('/dashboard');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">SelectorOS Onboarding</h1>
        <p>Loading your restaurant profile…</p>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">SelectorOS Onboarding</h1>
        <p className="text-red-600 mb-4">Error: {errorMsg}</p>
        <button
          className="button-inverse"
          type="button"
          onClick={() => router.replace('/dashboard')}
        >
          Go to dashboard
        </button>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center">Welcome to SelectorOS</h1>
      <p className="text-gray-600 text-center mb-6">
        Tell us a bit about your restaurant. This helps us set up your dashboard correctly.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1 font-medium">
            Restaurant name <span className="text-red-500">*</span>
          </label>
          <input
            className="input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Shang Shi"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1 font-medium">Location</label>
          <input
            className="input w-full"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Tallinn, Estonia"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 font-medium">Cuisine / Concept</label>
          <input
            className="input w-full"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder="e.g. Cantonese Fine Dining"
          />
        </div>

        <button
          type="submit"
          className="button-inverse w-full mt-4"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save and go to dashboard'}
        </button>

        <p className="text-xs text-gray-500 text-center mt-2">
          You can change this information later in your settings.
        </p>
      </form>
    </main>
  );
}
