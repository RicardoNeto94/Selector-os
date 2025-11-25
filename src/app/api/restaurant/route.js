import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  // 1) Get the logged-in user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 2) Check if this user already has a restaurant
  const { data: existing } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (existing) {
    // Already exists → just return it
    return Response.json(existing);
  }

  // 3) If not, create a new restaurant for this user
  const { data: created, error } = await supabase
    .from('restaurants')
    .insert({
      owner_id: user.id,
      name: 'My Restaurant',
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(created);
}
