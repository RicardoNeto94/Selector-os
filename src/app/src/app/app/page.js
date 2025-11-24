'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function Dashboard() {
  const supabase = createClientComponentClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);

  if (!user) {
    return (
      <main className="p-8 text-center">
        <h1 className="text-xl">Loading your dashboard...</h1>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Welcome to SelectorOS 👋</h1>
      <p>Your email: <strong>{user.email}</strong></p>

      <div className="mt-8 p-4 border rounded-lg">
        <p>This is where your client dashboard will appear.</p>
        <p>Here we will add:</p>
        <ul className="list-disc pl-6 mt-2">
          <li>Your restaurant</li>
          <li>Your menu</li>
          <li>Allergen tool editor</li>
          <li>Subscription status</li>
        </ul>
      </div>
    </main>
  );
}
