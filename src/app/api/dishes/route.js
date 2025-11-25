import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET: return all dishes for the current user's main menu
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  // 1) Get logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 2) Get this user's restaurant
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

  // 3) Get this restaurant's menu (we assume one main menu for now)
  const { data: menu, error: menuError } = await supabase
    .from('menus')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .maybeSingle();

  if (menuError || !menu) {
    return Response.json(
      { error: menuError?.message || 'No menu found for this restaurant' },
      { status: 400 }
    );
  }

  // 4) Get all dishes for this menu
  const { data: dishes, error: dishesError } = await supabase
    .from('dishes')
    .select('*')
    .eq('menu_id', menu.id)
    .order('created_at', { ascending: true });

  if (dishesError) {
    return Response.json({ error: dishesError.message }, { status: 500 });
  }

  return Response.json({ menuId: menu.id, dishes: dishes || [] });
}

// POST: create a new dish in the current user's main menu
export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies });

  // 1) Get logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 2) Get this user's restaurant
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

  // 3) Get this restaurant's menu
  const { data: menu, error: menuError } = await supabase
    .from('menus')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .maybeSingle();

  if (menuError || !menu) {
    return Response.json(
      { error: menuError?.message || 'No menu found for this restaurant' },
      { status: 400 }
    );
  }

  // 4) Read body (dish name, description, price)
  const body = await request.json();
  const { name, description, price } = body;

  if (!name || !name.trim()) {
    return Response.json({ error: 'Dish name is required' }, { status: 400 });
  }

  const { data: created, error: createError } = await supabase
    .from('dishes')
    .insert({
      menu_id: menu.id,
      name: name.trim(),
      description: description?.trim() || null,
      price: price !== undefined && price !== null ? Number(price) : null,
    })
    .select()
    .single();

  if (createError) {
    return Response.json({ error: createError.message }, { status: 500 });
  }

  return Response.json(created, { status: 201 });
}
