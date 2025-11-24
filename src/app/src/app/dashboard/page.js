'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

export default function DashboardPage() {
  const supabase = createClientComponentClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }
    getUser();
  }, []);

  if (!user) {
    return (
      <main className="p-8">
        <h1 className="text-xl">Loading your dashboard...</h1>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4">SelectorOS Dashboard</h1>

      <p className="mb-4">
        Logged in as: <b>{user.email}</b>
      </p>

      <div className="border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2">Your Restaurant</h2>
        <p>This is where your client data will appear.</p>

        <ul className="list-disc pl-6 mt-4 space-y-2">
          <li>Restaurant profile</li>
          <li>Menu builder</li>
          <li>Allergen tool</li>
          <li>Subscription & billing</li>
        </ul>
      </div>

      <Link href="/sign-out">
        <button className="button-inverse w-full mt-6">Sign Out</button>
      </Link>
    </main>
  );
}
