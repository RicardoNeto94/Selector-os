'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LogoutPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const doLogout = async () => {
      await supabase.auth.signOut();
      router.push('/sign-in');
    };

    doLogout();
  }, []);  // ← EMPTY array, no looping

  return (
    <div style={{ padding: '20px', color: '#fff' }}>
      Logging out…
    </div>
  );
}
