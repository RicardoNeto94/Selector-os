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

      <p>Logged in as <strong>{user.email}</strong></p>

      <div className="mt-6 border rounded-lg p-4">
        <p>Your dashboard is ready.</p>
        <p className="mt-2">Next step: restaurant + menu database.</p>
      </div>

      <Link href="/sign-out">
        <button className="button-inverse w-full mt-6">Sign Out</button>
      </Link>
    </main>
  );
}
