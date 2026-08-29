-- Vaxeron internal control plane.
-- Customer workspace roles remain tenant-scoped and never grant access here.

create table if not exists public.platform_administrators (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role text not null default 'platform_administrator'
    check (role in ('root_owner', 'platform_administrator', 'support_viewer')),
  status text not null default 'active'
    check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_log_created_idx
  on public.platform_audit_log(created_at desc);
create index if not exists platform_audit_log_actor_idx
  on public.platform_audit_log(actor_user_id, created_at desc);

create table if not exists public.organization_platform_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan text not null default 'pilot'
    check (plan in ('pilot', 'starter', 'professional', 'enterprise')),
  inventory_mode text not null default 'manual'
    check (inventory_mode in ('manual', 'csv', 'api', 'hybrid')),
  enabled_modules jsonb not null default '{"wine":true,"dining":false,"spa":false,"guest_experience":false}'::jsonb,
  onboarding_status text not null default 'invited'
    check (onboarding_status in ('invited', 'in_progress', 'ready', 'live', 'paused')),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_administrators enable row level security;
alter table public.platform_audit_log enable row level security;
alter table public.organization_platform_settings enable row level security;

drop policy if exists "Service role manages platform administrators" on public.platform_administrators;
create policy "Service role manages platform administrators"
  on public.platform_administrators for all to service_role using (true) with check (true);
drop policy if exists "Service role manages platform audit log" on public.platform_audit_log;
create policy "Service role manages platform audit log"
  on public.platform_audit_log for all to service_role using (true) with check (true);
drop policy if exists "Service role manages organization platform settings" on public.organization_platform_settings;
create policy "Service role manages organization platform settings"
  on public.organization_platform_settings for all to service_role using (true) with check (true);

-- Bootstrap the Vaxeron root owner from the verified auth identity. Runtime
-- authorization uses user_id from this table, never an email comparison.
insert into public.platform_administrators (user_id, role, status)
select id, 'root_owner', 'active'
from auth.users
where lower(email) = 'ricardoneto8@gmail.com'
on conflict (user_id) do update
set role = 'root_owner', status = 'active', updated_at = now();

-- Never complete this migration with an inaccessible control plane. If the
-- configured identity is missing, the transaction rolls back and leaves the
-- existing customer application untouched.
do $$
begin
  if not exists (
    select 1
    from public.platform_administrators
    where role = 'root_owner' and status = 'active'
  ) then
    raise exception using
      message = 'Vaxeron root owner was not found in auth.users.',
      hint = 'Create or confirm the auth user ricardoneto8@gmail.com, then run this migration again.';
  end if;
end;
$$;

create or replace function public.platform_provision_customer(
  p_actor_user_id uuid,
  p_owner_user_id uuid,
  p_organization_name text,
  p_property_name text,
  p_slug text,
  p_timezone text default 'Europe/Tallinn',
  p_currency_code text default 'EUR',
  p_plan text default 'pilot',
  p_inventory_mode text default 'manual',
  p_enabled_modules jsonb default '{"wine":true,"dining":false,"spa":false,"guest_experience":false}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_row public.organizations;
  property_row public.properties;
  restaurant_row public.restaurants;
  safe_slug text;
begin
  if not exists (
    select 1 from public.platform_administrators
    where user_id = p_actor_user_id and status = 'active'
      and role in ('root_owner', 'platform_administrator')
  ) then
    raise exception 'Active Vaxeron platform administrator access is required.';
  end if;
  if not exists (select 1 from auth.users where id = p_owner_user_id) then
    raise exception 'The invited owner identity does not exist.';
  end if;
  if nullif(btrim(p_organization_name), '') is null then
    raise exception 'Organization name is required.';
  end if;
  if nullif(btrim(p_property_name), '') is null then
    raise exception 'Property name is required.';
  end if;
  if exists (
    select 1 from public.organization_memberships
    where user_id = p_owner_user_id and status in ('active', 'invited')
  ) then
    raise exception 'This owner already belongs to a Vaxeron organization.';
  end if;

  safe_slug := regexp_replace(
    lower(coalesce(nullif(btrim(p_slug), ''), p_organization_name)),
    '[^a-z0-9]+', '-', 'g'
  );
  safe_slug := trim(both '-' from safe_slug);
  if safe_slug = '' then safe_slug := 'hospitality'; end if;
  while exists (select 1 from public.organizations where slug = safe_slug) loop
    safe_slug := left(safe_slug, 48) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end loop;

  insert into public.organizations (name, slug, status)
  values (btrim(p_organization_name), safe_slug, 'active')
  returning * into organization_row;

  insert into public.organization_memberships (organization_id, user_id, role, status)
  values (organization_row.id, p_owner_user_id, 'owner', 'invited');

  insert into public.properties (
    organization_id, name, slug, timezone, currency_code, status
  ) values (
    organization_row.id,
    btrim(p_property_name),
    safe_slug,
    coalesce(nullif(btrim(p_timezone), ''), 'Europe/Tallinn'),
    upper(coalesce(nullif(btrim(p_currency_code), ''), 'EUR')),
    'active'
  ) returning * into property_row;

  insert into public.property_memberships (property_id, user_id, role)
  values (property_row.id, p_owner_user_id, 'administrator');

  insert into public.restaurants (
    owner_id, name, slug, subscription_plan, plan, organization_id, property_id
  ) values (
    p_owner_user_id,
    btrim(p_property_name),
    safe_slug,
    case when p_plan in ('pilot', 'starter') then 'starter' else 'pro' end,
    case when p_plan in ('pilot', 'starter') then 'starter' else 'pro' end,
    organization_row.id,
    property_row.id
  ) returning * into restaurant_row;

  update public.properties
  set restaurant_id = restaurant_row.id, updated_at = now()
  where id = property_row.id;

  insert into public.user_roles (user_id, role_id, organization_id, property_id)
  select p_owner_user_id, role.id, organization_row.id, property_row.id
  from public.roles as role
  where role.slug = 'administrator'
  on conflict (user_id, role_id) do update
  set organization_id = excluded.organization_id,
      property_id = excluded.property_id;

  insert into public.organization_platform_settings (
    organization_id, plan, inventory_mode, enabled_modules, onboarding_status
  ) values (
    organization_row.id, p_plan, p_inventory_mode, p_enabled_modules, 'invited'
  );

  insert into public.platform_audit_log (
    actor_user_id, action, target_type, target_id, metadata
  ) values (
    p_actor_user_id,
    'customer.created',
    'organization',
    organization_row.id::text,
    jsonb_build_object(
      'organization_name', organization_row.name,
      'property_id', property_row.id,
      'property_name', property_row.name,
      'owner_user_id', p_owner_user_id,
      'plan', p_plan,
      'inventory_mode', p_inventory_mode
    )
  );

  return jsonb_build_object(
    'organization', to_jsonb(organization_row),
    'property', to_jsonb(property_row),
    'restaurant', to_jsonb(restaurant_row)
  );
end;
$$;

revoke all on function public.platform_provision_customer(
  uuid, uuid, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.platform_provision_customer(
  uuid, uuid, text, text, text, text, text, text, text, jsonb
) to service_role;
