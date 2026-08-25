create table if not exists public.wine_inventory_valuations (
  wine_id uuid not null references public.wines(id) on delete cascade,
  location_id uuid not null references public.wine_locations(id) on delete cascade,
  source text not null default 'compucash',
  external_product_id text,
  external_store_ids text[] not null default '{}',
  quantity_snapshot numeric not null default 0,
  cost_covered_quantity numeric not null default 0,
  unit_inventory_cost numeric,
  inventory_cost_value numeric,
  unit_sale_price_gross numeric,
  unit_sale_price_net numeric,
  vat_percent numeric,
  sale_price_group_id text,
  currency_code text not null default 'EUR',
  cost_basis text not null default 'compucash_storage_price',
  source_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (wine_id, location_id, source),
  constraint wine_inventory_valuations_quantity_check check (quantity_snapshot >= 0),
  constraint wine_inventory_valuations_cost_coverage_check check (cost_covered_quantity >= 0),
  constraint wine_inventory_valuations_cost_check check (unit_inventory_cost is null or unit_inventory_cost >= 0),
  constraint wine_inventory_valuations_cost_value_check check (inventory_cost_value is null or inventory_cost_value >= 0),
  constraint wine_inventory_valuations_sale_gross_check check (unit_sale_price_gross is null or unit_sale_price_gross >= 0),
  constraint wine_inventory_valuations_sale_net_check check (unit_sale_price_net is null or unit_sale_price_net >= 0),
  constraint wine_inventory_valuations_vat_check check (vat_percent is null or vat_percent >= 0),
  constraint wine_inventory_valuations_currency_check check (currency_code ~ '^[A-Z]{3}$')
);

comment on table public.wine_inventory_valuations is
  'Protected store-level inventory cost and default sale-price snapshots received from business systems.';
comment on column public.wine_inventory_valuations.unit_inventory_cost is
  'Compucash StoreQuantity.storagePrice. Its accounting basis is retained explicitly in cost_basis.';

create index if not exists wine_inventory_valuations_location_idx
  on public.wine_inventory_valuations(location_id);
create index if not exists wine_inventory_valuations_updated_idx
  on public.wine_inventory_valuations(updated_at desc);

alter table public.wine_inventory_valuations enable row level security;

drop policy if exists "Administrators read inventory valuations"
  on public.wine_inventory_valuations;
create policy "Administrators read inventory valuations"
  on public.wine_inventory_valuations for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Service role manages inventory valuations"
  on public.wine_inventory_valuations;
create policy "Service role manages inventory valuations"
  on public.wine_inventory_valuations for all to service_role
  using (true) with check (true);

create or replace function public.apply_compucash_inventory_valuations(p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_count integer;
begin
  with source_rows as (
    select *
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as source_row(
      wine_id uuid,
      location_id uuid,
      external_product_id text,
      external_store_ids text[],
      quantity_snapshot numeric,
      cost_covered_quantity numeric,
      unit_inventory_cost numeric,
      inventory_cost_value numeric,
      unit_sale_price_gross numeric,
      unit_sale_price_net numeric,
      vat_percent numeric,
      sale_price_group_id text,
      currency_code text,
      source_updated_at timestamptz
    )
  ), upserted as (
    insert into public.wine_inventory_valuations (
      wine_id,
      location_id,
      source,
      external_product_id,
      external_store_ids,
      quantity_snapshot,
      cost_covered_quantity,
      unit_inventory_cost,
      inventory_cost_value,
      unit_sale_price_gross,
      unit_sale_price_net,
      vat_percent,
      sale_price_group_id,
      currency_code,
      cost_basis,
      source_updated_at,
      updated_at
    )
    select
      source.wine_id,
      source.location_id,
      'compucash',
      source.external_product_id,
      coalesce(source.external_store_ids, '{}'),
      greatest(coalesce(source.quantity_snapshot, 0), 0),
      greatest(coalesce(source.cost_covered_quantity, 0), 0),
      source.unit_inventory_cost,
      source.inventory_cost_value,
      source.unit_sale_price_gross,
      source.unit_sale_price_net,
      source.vat_percent,
      source.sale_price_group_id,
      coalesce(nullif(upper(source.currency_code), ''), 'EUR'),
      'compucash_storage_price',
      coalesce(source.source_updated_at, now()),
      now()
    from source_rows as source
    on conflict (wine_id, location_id, source) do update set
      external_product_id = excluded.external_product_id,
      external_store_ids = excluded.external_store_ids,
      quantity_snapshot = excluded.quantity_snapshot,
      cost_covered_quantity = excluded.cost_covered_quantity,
      unit_inventory_cost = excluded.unit_inventory_cost,
      inventory_cost_value = excluded.inventory_cost_value,
      unit_sale_price_gross = excluded.unit_sale_price_gross,
      unit_sale_price_net = excluded.unit_sale_price_net,
      vat_percent = excluded.vat_percent,
      sale_price_group_id = excluded.sale_price_group_id,
      currency_code = excluded.currency_code,
      cost_basis = excluded.cost_basis,
      source_updated_at = excluded.source_updated_at,
      updated_at = now()
    returning 1
  )
  select count(*) into updated_count from upserted;

  return updated_count;
end;
$$;

revoke all on function public.apply_compucash_inventory_valuations(jsonb) from public;
revoke all on function public.apply_compucash_inventory_valuations(jsonb) from anon;
revoke all on function public.apply_compucash_inventory_valuations(jsonb) from authenticated;
grant execute on function public.apply_compucash_inventory_valuations(jsonb) to service_role;
