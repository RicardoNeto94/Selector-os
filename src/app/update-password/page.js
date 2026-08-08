import { createClient } from "@/lib/supabase/server";
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import UpdatePassword from 'src/components/Auth/UpdatePassword';

export default async function UpdatePasswordPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/sign-in');
  }

  return <UpdatePassword />;
}
