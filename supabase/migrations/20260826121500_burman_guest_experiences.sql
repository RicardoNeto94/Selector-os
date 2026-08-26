-- Register the current public PWAs under the Burman tenant. These records are
-- the control-plane source for future hostname provisioning; the existing
-- URLs and renderers remain unchanged.

insert into public.guest_experiences (
  id,
  organization_id,
  property_id,
  venue_location_id,
  name,
  slug,
  hostname,
  renderer_key,
  availability_rules,
  is_published
)
values
  (
    'c1111111-1111-4111-8111-111111111111',
    'a1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    null,
    'The Burman In-Room Experience',
    'burman',
    'burman.vaxeron.com',
    'hotel',
    '{"public":true,"show_exact_stock":false}'::jsonb,
    true
  ),
  (
    'c2222222-2222-4222-8222-222222222222',
    'a1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    null,
    'The Burman Spa',
    'burman-spa',
    'spa.vaxeron.com',
    'spa',
    '{"public":true,"show_exact_stock":false}'::jsonb,
    true
  ),
  (
    'c3333333-3333-4333-8333-333333333333',
    'a1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    'd7ec429b-39e3-41b7-b39f-3e324b2a4a0d',
    'Shang Shi Wine Experience',
    'shang-shi-wine',
    'shangshi.vaxeron.com',
    'wine',
    '{"public":true,"minimum_stock":0,"show_exact_stock":false}'::jsonb,
    true
  ),
  (
    'c4444444-4444-4444-8444-444444444444',
    'a1111111-1111-4111-8111-111111111111',
    'b2222222-2222-4222-8222-222222222222',
    '8686f110-ef73-4d28-802e-c0944e0dea24',
    'Koyo Wine Experience',
    'koyo-wine',
    'koyo.vaxeron.com',
    'wine',
    '{"public":true,"minimum_stock":0,"show_exact_stock":false}'::jsonb,
    true
  )
on conflict (id) do update
set organization_id = excluded.organization_id,
    property_id = excluded.property_id,
    venue_location_id = excluded.venue_location_id,
    name = excluded.name,
    slug = excluded.slug,
    hostname = excluded.hostname,
    renderer_key = excluded.renderer_key,
    availability_rules = excluded.availability_rules,
    is_published = excluded.is_published,
    updated_at = now();
