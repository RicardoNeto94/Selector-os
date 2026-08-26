-- Phase 2: attach the existing Burman installation to the tenant foundation.
--
-- This migration is intentionally additive. It keeps every existing record ID,
-- guest slug and relationship unchanged. Tenant enforcement is introduced in a
-- later migration, after the application writes and isolation tests are ready.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'restaurant_id'
  ) then
    alter table public.properties
      add column restaurant_id uuid references public.restaurants(id) on delete set null;
  end if;
end
$$;

create unique index if not exists properties_restaurant_unique_idx
  on public.properties(restaurant_id)
  where restaurant_id is not null;

-- Stable IDs make the Burman backfill deterministic across local, preview and
-- production environments.
insert into public.organizations (id, name, slug, status)
values (
  'a1111111-1111-4111-8111-111111111111',
  'Bombay Club',
  'bombay-club',
  'active'
)
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    status = excluded.status,
    updated_at = now();

insert into public.properties (
  id,
  organization_id,
  restaurant_id,
  name,
  slug,
  timezone,
  currency_code,
  status
)
values (
  'b2222222-2222-4222-8222-222222222222',
  'a1111111-1111-4111-8111-111111111111',
  '0a8fb8bb-b4c8-4f05-9874-929637521f58',
  'The Burman',
  'the-burman',
  'Europe/Tallinn',
  'EUR',
  'active'
)
on conflict (id) do update
set organization_id = excluded.organization_id,
    restaurant_id = excluded.restaurant_id,
    name = excluded.name,
    slug = excluded.slug,
    timezone = excluded.timezone,
    currency_code = excluded.currency_code,
    status = excluded.status,
    updated_at = now();

-- Existing users belong to the current Burman installation. Restaurant owners
-- become organization owners; other existing users remain administrators until
-- their access is reviewed from Team & Access.
insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status
)
select
  'a1111111-1111-4111-8111-111111111111'::uuid,
  users.id,
  case
    when exists (
      select 1
      from public.restaurants
      where restaurants.owner_id = users.id
    ) then 'owner'
    else 'administrator'
  end,
  case
    when profiles.status = 'active' then 'active'
    else 'invited'
  end
from auth.users as users
left join public.profiles on profiles.id = users.id
on conflict (organization_id, user_id) do update
set role = excluded.role,
    status = excluded.status,
    updated_at = now();

insert into public.property_memberships (property_id, user_id, role)
select
  'b2222222-2222-4222-8222-222222222222'::uuid,
  memberships.user_id,
  case
    when memberships.role in ('owner', 'administrator') then 'administrator'
    else memberships.role
  end
from public.organization_memberships as memberships
where memberships.organization_id = 'a1111111-1111-4111-8111-111111111111'
on conflict (property_id, user_id) do update
set role = excluded.role;

-- Add nullable ownership columns first. The existing application can continue
-- operating while each write path is made tenant-aware. A later enforcement
-- migration will make these columns NOT NULL and activate tenant RLS policies.
do $$
declare
  table_name text;
  tenant_tables constant text[] := array[
    'restaurants',
    'venues',
    'locations',
    'cellar_locations',
    'menus',
    'menu_categories',
    'menu_items',
    'menu_item_prices',
    'dishes',
    'dish_allergens',
    'experiences',
    'experience_sections',
    'experience_items',
    'experience_media',
    'experience_prices',
    'spa_categories',
    'spa_products',
    'spa_product_variants',
    'merchandise_categories',
    'merchandise_products',
    'wine_locations',
    'wines',
    'wine_inventory',
    'wine_stock',
    'wine_menus',
    'wine_menu_items',
    'wine_menu_servings',
    'wine_transfers',
    'wine_movements',
    'wine_business_aliases',
    'wine_btg_suggestions',
    'sake_pairings',
    'sake_pairing_stages',
    'wine_location_store_mappings',
    'wine_inventory_imports',
    'wine_inventory_import_rows',
    'wine_inventory_valuations',
    'compucash_sync_runs',
    'operation_days',
    'daily_bookings',
    'daily_labour',
    'daily_occupancy',
    'daily_sales',
    'operation_summary',
    'operations_insights',
    'employee_costs',
    'sales_days',
    'sales_categories',
    'sales_payment_methods',
    'sales_products',
    'sales_venues',
    'import_batches',
    'import_jobs',
    'import_sources',
    'raw_import_rows',
    'restaurant_domains',
    'pwa_refresh_signals',
    'user_roles',
    'user_venue_access'
  ];
begin
  foreach table_name in array tenant_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'alter table public.%I add column if not exists organization_id uuid references public.organizations(id) on delete cascade',
        table_name
      );
      execute format(
        'alter table public.%I add column if not exists property_id uuid references public.properties(id) on delete cascade',
        table_name
      );
      execute format(
        'update public.%I set organization_id = $1, property_id = $2 where organization_id is null or property_id is null',
        table_name
      ) using
        'a1111111-1111-4111-8111-111111111111'::uuid,
        'b2222222-2222-4222-8222-222222222222'::uuid;
      execute format(
        'create index if not exists %I on public.%I(organization_id, property_id)',
        table_name || '_tenant_idx',
        table_name
      );
    end if;
  end loop;
end
$$;

-- Membership helpers are used by the later RLS policies and by server routes.
-- SECURITY DEFINER avoids recursive membership-policy evaluation.
create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_organization_administrator(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and status = 'active'
      and role in ('owner', 'administrator')
  );
$$;

create or replace function public.is_property_member(target_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.property_memberships
    where property_id = target_property_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.is_organization_administrator(uuid) from public;
revoke all on function public.is_property_member(uuid) from public;
grant execute on function public.is_organization_member(uuid) to authenticated, service_role;
grant execute on function public.is_organization_administrator(uuid) to authenticated, service_role;
grant execute on function public.is_property_member(uuid) to authenticated, service_role;
