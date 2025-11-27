export const dynamic = "force-dynamic";

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  // 1) Get logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 2) Get this user's restaurant (for now we assume exactly one)
  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (restError || !restaurant) {
    return Response.json(
      { error: restError?.message || 'No restaurant found for this user' },
      { status: 400 }
    );
  }

  // 3) Check if a menu already exists for this restaurant
  const { data: existingMenu, error: menuError } = await supabase
    .from('menus')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .maybeSingle();

  if (menuError && menuError.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is fine
    return Response.json({ error: menuError.message }, { status: 500 });
  }

  if (existingMenu) {
    return Response.json(existingMenu);
  }

  // 4) If no menu exists, create a default one
  const { data: createdMenu, error: createError } = await supabase
    .from('menus')
    .insert({
      restaurant_id: restaurant.id,
      name: 'Main Menu',
    })
    .select()
    .single();

  if (createError) {
    return Response.json({ error: createError.message }, { status: 500 });
  }

  return Response.json(createdMenu);
}
