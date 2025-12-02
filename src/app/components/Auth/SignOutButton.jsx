'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function SignOut() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('ERROR:', error);
      return;
    }

    // ✅ After logging out, send the user to the new sign-in page
    router.push('/sign-in');
  }

  return (
    <button
      type="button"
      className="auth-primary-btn" // or any new-style class you prefer
      onClick={handleSignOut}
    >
      Sign out
    </button>
  );
}
