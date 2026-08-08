import { createClient } from "@/lib/supabase/server";
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import ResetPassword from 'src/components/Auth/ResetPassword';

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();

  if (data?.session) {
    redirect('/');
  }

  return <ResetPassword />;
}
