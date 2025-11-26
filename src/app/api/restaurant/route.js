import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check if restaurant exists
  const { data: existing, error: selectError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (selectError) {
    return Response.json({ error: selectError.message }, { status: 500 });
  }

  if (existing) {
    return Response.json(existing);
  }

  // If not, create a default one
  const { data: created, error: insertError } = await supabase
    .from('restaurants')
    .insert({
      owner_id: user.id,
      name: 'My Restaurant',
      created_at: new Date().toISOString(),
      onboarding_complete: false,
    })
    .select()
    .single();

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  return Response.json(created);
}

// PATCH: update restaurant info from onboarding
export async function PATCH(request) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { name, location, cuisine } = body || {};

  if (!name || !name.trim()) {
    return Response.json({ error: 'Restaurant name is required' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from('restaurants')
    .update({
      name: name.trim(),
      location: location?.trim() || null,
      cuisine: cuisine?.trim() || null,
      onboarding_complete: true,
    })
    .eq('owner_id', user.id)
    .select()
    .maybeSingle();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  if (!updated) {
    return Response.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  return Response.json(updated);
}
