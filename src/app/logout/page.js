'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LogoutPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function doLogout() {
      await supabase.auth.signOut();
      router.push('/sign-in');  // redirect after logout
    }

    doLogout();
  }, [router, supabase]);

  return (
    <div style={{ padding: '20px', color: '#fff' }}>
      Logging out…
    </div>
  );
}
