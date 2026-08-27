-- Tenant-safe purchasing workflow. Compucash remains the stock source of truth.

-- Keep this migration self-contained. Earlier deployments may not yet have the
-- generic tenant-write helper, so ordering uses its own narrowly scoped checks.
create or replace function public.can_read_wine_order_tenant(
  target_organization_id uuid,
  target_property_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships as organization_membership
    join public.property_memberships as property_membership
      on property_membership.user_id = organization_membership.user_id
     and property_membership.property_id = target_property_id
    join public.properties as property
      on property.id = property_membership.property_id
     and property.organization_id = organization_membership.organization_id
    where organization_membership.organization_id = target_organization_id
      and organization_membership.user_id = auth.uid()
      and organization_membership.status = 'active'
  );
$$;

create or replace function public.can_manage_wine_order_tenant(
  target_organization_id uuid,
  target_property_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships as organization_membership
    join public.property_memberships as property_membership
      on property_membership.user_id = organization_membership.user_id
     and property_membership.property_id = target_property_id
    join public.properties as property
      on property.id = property_membership.property_id
     and property.organization_id = organization_membership.organization_id
    where organization_membership.organization_id = target_organization_id
      and organization_membership.user_id = auth.uid()
      and organization_membership.status = 'active'
      and (
        organization_membership.role in ('owner', 'administrator')
        or property_membership.role in ('administrator', 'manager', 'operator')
      )
  );
$$;

revoke all on function public.can_read_wine_order_tenant(uuid, uuid) from public;
revoke all on function public.can_manage_wine_order_tenant(uuid, uuid) from public;
grant execute on function public.can_read_wine_order_tenant(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_manage_wine_order_tenant(uuid, uuid) to authenticated, service_role;

create table if not exists public.wine_reorder_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  wine_id uuid not null references public.wines(id) on delete cascade,
  location_id uuid not null references public.wine_locations(id) on delete cascade,
  reorder_point numeric not null default 2 check (reorder_point >= 0),
  target_quantity numeric not null default 6 check (target_quantity > 0),
  supplier_name text,
  supplier_email text,
  notes text,
  enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, property_id, wine_id, location_id),
  check (target_quantity > reorder_point)
);

create table if not exists public.wine_order_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  wine_id uuid not null references public.wines(id) on delete restrict,
  location_id uuid not null references public.wine_locations(id) on delete restrict,
  status text not null default 'approved'
    check (status in ('approved', 'ordered', 'received', 'dismissed', 'cancelled')),
  quantity_on_hand numeric not null default 0,
  reorder_point numeric not null default 2 check (reorder_point >= 0),
  target_quantity numeric not null default 6 check (target_quantity > 0),
  requested_quantity numeric not null check (requested_quantity > 0),
  unit_cost numeric check (unit_cost is null or unit_cost >= 0),
  currency_code text not null default 'EUR' check (currency_code ~ '^[A-Z]{3}$'),
  supplier_name text,
  supplier_email text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default now(),
  ordered_at timestamptz,
  received_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists wine_order_requests_one_active_idx
  on public.wine_order_requests(organization_id, property_id, wine_id, location_id)
  where status in ('approved', 'ordered');
create index if not exists wine_order_requests_status_idx
  on public.wine_order_requests(organization_id, property_id, status, updated_at desc);
create index if not exists wine_reorder_rules_location_idx
  on public.wine_reorder_rules(organization_id, property_id, location_id);

alter table public.wine_reorder_rules enable row level security;
alter table public.wine_order_requests enable row level security;

drop policy if exists tenant_select on public.wine_reorder_rules;
drop policy if exists tenant_insert on public.wine_reorder_rules;
drop policy if exists tenant_update on public.wine_reorder_rules;
drop policy if exists tenant_delete on public.wine_reorder_rules;
drop policy if exists service_role_all on public.wine_reorder_rules;
create policy tenant_select on public.wine_reorder_rules for select to authenticated
  using (public.can_read_wine_order_tenant(organization_id, property_id));
create policy tenant_insert on public.wine_reorder_rules for insert to authenticated
  with check (public.can_manage_wine_order_tenant(organization_id, property_id));
create policy tenant_update on public.wine_reorder_rules for update to authenticated
  using (public.can_manage_wine_order_tenant(organization_id, property_id))
  with check (public.can_manage_wine_order_tenant(organization_id, property_id));
create policy tenant_delete on public.wine_reorder_rules for delete to authenticated
  using (public.can_manage_wine_order_tenant(organization_id, property_id));
create policy service_role_all on public.wine_reorder_rules for all to service_role
  using (true) with check (true);

drop policy if exists tenant_select on public.wine_order_requests;
drop policy if exists tenant_insert on public.wine_order_requests;
drop policy if exists tenant_update on public.wine_order_requests;
drop policy if exists tenant_delete on public.wine_order_requests;
drop policy if exists service_role_all on public.wine_order_requests;
create policy tenant_select on public.wine_order_requests for select to authenticated
  using (public.can_read_wine_order_tenant(organization_id, property_id));
create policy tenant_insert on public.wine_order_requests for insert to authenticated
  with check (public.can_manage_wine_order_tenant(organization_id, property_id));
create policy tenant_update on public.wine_order_requests for update to authenticated
  using (public.can_manage_wine_order_tenant(organization_id, property_id))
  with check (public.can_manage_wine_order_tenant(organization_id, property_id));
create policy tenant_delete on public.wine_order_requests for delete to authenticated
  using (public.can_manage_wine_order_tenant(organization_id, property_id));
create policy service_role_all on public.wine_order_requests for all to service_role
  using (true) with check (true);

-- Prevent an ordering row from ever linking a wine or location owned by a
-- different customer, even if a future API route forgets to validate it.
create or replace function public.enforce_wine_order_parent_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_organization_id uuid;
  parent_property_id uuid;
begin
  if tg_argv[0] = 'wine_id' then
    select organization_id, property_id into parent_organization_id, parent_property_id
    from public.wines where id = new.wine_id;
  elsif tg_argv[0] = 'location_id' then
    select organization_id, property_id into parent_organization_id, parent_property_id
    from public.wine_locations where id = new.location_id;
  else
    raise exception 'Unsupported ordering parent column.';
  end if;

  if not found then
    raise exception 'Referenced ordering parent does not exist.';
  end if;
  if new.organization_id is distinct from parent_organization_id
    or new.property_id is distinct from parent_property_id then
    raise exception 'Cross-tenant ordering relationship is not allowed.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_wine_order_parent_tenant() from public;

drop trigger if exists zz_tenant_parent_wine_id on public.wine_reorder_rules;
create trigger zz_tenant_parent_wine_id
  before insert or update of wine_id, organization_id, property_id on public.wine_reorder_rules
  for each row execute function public.enforce_wine_order_parent_tenant('wine_id');
drop trigger if exists zz_tenant_parent_location_id on public.wine_reorder_rules;
create trigger zz_tenant_parent_location_id
  before insert or update of location_id, organization_id, property_id on public.wine_reorder_rules
  for each row execute function public.enforce_wine_order_parent_tenant('location_id');

drop trigger if exists zz_tenant_parent_wine_id on public.wine_order_requests;
create trigger zz_tenant_parent_wine_id
  before insert or update of wine_id, organization_id, property_id on public.wine_order_requests
  for each row execute function public.enforce_wine_order_parent_tenant('wine_id');
drop trigger if exists zz_tenant_parent_location_id on public.wine_order_requests;
create trigger zz_tenant_parent_location_id
  before insert or update of location_id, organization_id, property_id on public.wine_order_requests
  for each row execute function public.enforce_wine_order_parent_tenant('location_id');

comment on table public.wine_reorder_rules is
  'Per-location reorder thresholds. These settings never modify Compucash stock.';
comment on table public.wine_order_requests is
  'Auditable purchasing workflow created from current Compucash inventory snapshots.';
