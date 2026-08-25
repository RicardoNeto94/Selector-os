alter table public.wines
  add column if not exists compucash_product_group_id text;

comment on column public.wines.compucash_product_group_id is
  'Authoritative physical product group from the matched Compucash bottle product.';

create or replace function public.apply_compucash_wine_source_groups(p_rows jsonb)
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
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
      as source_row(wine_id uuid, product_group_id text)
  )
  update public.wines as wine
  set compucash_product_group_id = source.product_group_id
  from source_rows as source
  where wine.id = source.wine_id
    and wine.compucash_product_group_id is distinct from source.product_group_id;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.apply_compucash_wine_source_groups(jsonb) from public;
revoke all on function public.apply_compucash_wine_source_groups(jsonb) from anon;
revoke all on function public.apply_compucash_wine_source_groups(jsonb) from authenticated;
grant execute on function public.apply_compucash_wine_source_groups(jsonb) to service_role;
