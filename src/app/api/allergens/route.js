import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET:
// - /api/allergens              -> full allergen catalog
// - /api/allergens?dish_id=xxx  -> allergens for that dish
export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { searchParams } = new URL(request.url);
  const dishId = searchParams.get('dish_id');

  // 1) No dish_id -> return catalog
  if (!dishId) {
    const { data, error } = await supabase
      .from('allergens')
      .select('*')
      .order('code', { ascending: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ allergens: data || [] });
  }

  // 2) dish_id present -> return allergens for that dish (requires auth)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: links, error: linksError } = await supabase
    .from('dish_allergens')
    .select('*')
    .eq('dish_id', dishId)
    .order('allergen_code', { ascending: true });

  if (linksError) {
    return Response.json({ error: linksError.message }, { status: 500 });
  }

  if (!links || links.length === 0) {
    return Response.json({ allergens: [] });
  }

  const codes = [...new Set(links.map((l) => l.allergen_code))];

  const { data: defs, error: defsError } = await supabase
    .from('allergens')
    .select('*')
    .in('code', codes);

  if (defsError) {
    return Response.json({ error: defsError.message }, { status: 500 });
  }

  const byCode = Object.fromEntries((defs || []).map((d) => [d.code, d]));

  const combined = links.map((l) => ({
    id: l.id,
    dish_id: l.dish_id,
    code: l.allergen_code,
    name: byCode[l.allergen_code]?.name || null,
    description: byCode[l.allergen_code]?.description || null,
  }));

  return Response.json({ allergens: combined });
}

// POST: { dish_id, allergen_code }
export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { dish_id, allergen_code } = body || {};

  if (!dish_id || !allergen_code) {
    return Response.json(
      { error: 'dish_id and allergen_code are required' },
      { status: 400 }
    );
  }

  const { data: link, error: linkError } = await supabase
    .from('dish_allergens')
    .insert({
      dish_id,
      allergen_code,
    })
    .select()
    .single();

  if (linkError) {
    return Response.json({ error: linkError.message }, { status: 500 });
  }

  const { data: def, error: defError } = await supabase
    .from('allergens')
    .select('*')
    .eq('code', allergen_code)
    .maybeSingle();

  if (defError) {
    return Response.json({ error: defError.message }, { status: 500 });
  }

  const result = {
    id: link.id,
    dish_id: link.dish_id,
    code: allergen_code,
    name: def?.name || null,
    description: def?.description || null,
  };

  return Response.json(result, { status: 201 });
}
