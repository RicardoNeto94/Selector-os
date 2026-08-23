-- Phase 1: additive multi-tenant foundation.
-- This migration deliberately does not modify or backfill existing Burman data.
-- Existing application queries and guest experiences remain unchanged.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  timezone text not null default 'Europe/Tallinn',
  currency_code text not null default 'EUR',
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'administrator', 'manager', 'operator', 'viewer')),
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.property_memberships (
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('administrator', 'manager', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (property_id, user_id)
);

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  provider text not null,
  external_account_id text,
  display_name text not null,
  status text not null default 'inactive' check (status in ('inactive', 'active', 'error', 'disabled')),
  credentials_secret_ref text,
  configuration jsonb not null default '{}'::jsonb,
  last_successful_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, external_account_id)
);

create table if not exists public.guest_experiences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  venue_location_id uuid references public.wine_locations(id) on delete set null,
  name text not null,
  slug text not null,
  hostname text,
  renderer_key text not null default 'default',
  theme jsonb not null default '{}'::jsonb,
  availability_rules jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug),
  unique (hostname)
);

create index if not exists properties_organization_idx on public.properties(organization_id);
create index if not exists organization_memberships_user_idx on public.organization_memberships(user_id);
create index if not exists property_memberships_user_idx on public.property_memberships(user_id);
create index if not exists integration_connections_tenant_idx on public.integration_connections(organization_id, property_id);
create index if not exists guest_experiences_property_idx on public.guest_experiences(organization_id, property_id);

alter table public.organizations enable row level security;
alter table public.properties enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.property_memberships enable row level security;
alter table public.integration_connections enable row level security;
alter table public.guest_experiences enable row level security;

-- During Phase 1, these tables are server-only. Authenticated policies are added
-- only after tenant resolution and isolation tests are complete.
drop policy if exists "Service role manages organizations" on public.organizations;
create policy "Service role manages organizations" on public.organizations for all to service_role using (true) with check (true);
drop policy if exists "Service role manages properties" on public.properties;
create policy "Service role manages properties" on public.properties for all to service_role using (true) with check (true);
drop policy if exists "Service role manages organization memberships" on public.organization_memberships;
create policy "Service role manages organization memberships" on public.organization_memberships for all to service_role using (true) with check (true);
drop policy if exists "Service role manages property memberships" on public.property_memberships;
create policy "Service role manages property memberships" on public.property_memberships for all to service_role using (true) with check (true);
drop policy if exists "Service role manages integration connections" on public.integration_connections;
create policy "Service role manages integration connections" on public.integration_connections for all to service_role using (true) with check (true);
drop policy if exists "Service role manages guest experiences" on public.guest_experiences;
create policy "Service role manages guest experiences" on public.guest_experiences for all to service_role using (true) with check (true);
