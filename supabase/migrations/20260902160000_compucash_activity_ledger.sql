-- Tenant-isolated, read-only activity imported from CompuCash.
-- Inventory remains authoritative in wine_inventory; these rows are an audit
-- and sales ledger only and must never adjust stock themselves.

begin;

create table if not exists public.compucash_activity_rows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  event_type text not null check (event_type in (
    'sale', 'take_in', 'write_out', 'transfer', 'write_off',
    'produce', 'credit', 'take_in_order'
  )),
  external_document_id text not null,
  external_row_id text not null,
  external_product_id text,
  external_product_number text,
  external_barcode text,
  product_name text not null,
  wine_id uuid references public.wines(id) on delete set null,
  event_at timestamptz not null,
  business_date date not null,
  quantity numeric not null default 0,
  bottle_equivalent numeric,
  unit_price numeric,
  gross_amount numeric,
  vat_percent numeric,
  sale_point_id text,
  sale_point_name text,
  from_external_store_id text,
  from_store_name text,
  to_external_store_id text,
  to_store_name text,
  from_location_id uuid references public.wine_locations(id) on delete set null,
  to_location_id uuid references public.wine_locations(id) on delete set null,
  document_status text,
  is_cancelled boolean not null default false,
  source_metadata jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, property_id, event_type, external_document_id, external_row_id)
);

create index if not exists compucash_activity_tenant_date_idx
  on public.compucash_activity_rows (organization_id, property_id, business_date desc);
create index if not exists compucash_activity_wine_date_idx
  on public.compucash_activity_rows (wine_id, event_at desc)
  where wine_id is not null;
create index if not exists compucash_activity_type_date_idx
  on public.compucash_activity_rows (organization_id, property_id, event_type, event_at desc);

create or replace function public.enforce_compucash_activity_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.properties property
    where property.id = new.property_id
      and property.organization_id = new.organization_id
  ) then
    raise exception 'CompuCash activity property does not belong to its organization.';
  end if;

  if new.wine_id is not null and not exists (
    select 1 from public.wines wine
    where wine.id = new.wine_id
      and wine.organization_id = new.organization_id
      and wine.property_id = new.property_id
  ) then
    raise exception 'CompuCash activity wine belongs to another tenant.';
  end if;

  if new.from_location_id is not null and not exists (
    select 1 from public.wine_locations location
    where location.id = new.from_location_id
      and location.organization_id = new.organization_id
      and location.property_id = new.property_id
  ) then
    raise exception 'CompuCash source location belongs to another tenant.';
  end if;

  if new.to_location_id is not null and not exists (
    select 1 from public.wine_locations location
    where location.id = new.to_location_id
      and location.organization_id = new.organization_id
      and location.property_id = new.property_id
  ) then
    raise exception 'CompuCash destination location belongs to another tenant.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.enforce_compucash_activity_tenant() from public;

drop trigger if exists enforce_compucash_activity_tenant on public.compucash_activity_rows;
create trigger enforce_compucash_activity_tenant
  before insert or update on public.compucash_activity_rows
  for each row execute function public.enforce_compucash_activity_tenant();

alter table public.compucash_activity_rows enable row level security;

drop policy if exists compucash_activity_select on public.compucash_activity_rows;
create policy compucash_activity_select
  on public.compucash_activity_rows for select to authenticated
  using (
    public.is_organization_member(organization_id)
    and public.is_property_member(property_id)
  );

-- Imported activity is immutable to workspace users. Only the server-side
-- integration can insert, correct or remove imported source rows.
drop policy if exists compucash_activity_service_all on public.compucash_activity_rows;
create policy compucash_activity_service_all
  on public.compucash_activity_rows for all to service_role
  using (true) with check (true);

grant select on public.compucash_activity_rows to authenticated;
grant all on public.compucash_activity_rows to service_role;
grant execute on function public.enforce_compucash_activity_tenant() to service_role;

comment on table public.compucash_activity_rows is
  'Tenant-owned read-only CompuCash sales and stock-document activity. Never mutates wine_inventory.';

commit;
