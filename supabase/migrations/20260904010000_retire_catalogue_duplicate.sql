-- Called only by the authenticated, tenant-scoped administrator API.
-- Serialize against inventory/source writes while validating and retiring.
create or replace function public.retire_catalogue_duplicate(
  p_wine_id uuid, p_keep_wine_id uuid, p_organization_id uuid, p_property_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare target public.wines%rowtype; keeper public.wines%rowtype;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'Administrator API required.' using errcode='42501';
  end if;
  if p_wine_id = p_keep_wine_id then raise exception 'Choose a different record to keep.'; end if;
  lock table public.wines, public.wine_inventory, public.wine_inventory_valuations in share row exclusive mode;
  select * into target from public.wines where id=p_wine_id and organization_id=p_organization_id and property_id is not distinct from p_property_id;
  if not found then raise exception 'Target wine not found in this workspace.'; end if;
  select * into keeper from public.wines where id=p_keep_wine_id and organization_id=p_organization_id and property_id is not distinct from p_property_id and is_active is distinct from false;
  if not found then raise exception 'Record to keep not found in this workspace.'; end if;
  if lower(btrim(target.name)) is distinct from lower(btrim(keeper.name)) or lower(btrim(target.producer)) is distinct from lower(btrim(keeper.producer)) then
    raise exception 'These records do not have matching names and producers. Review them manually.';
  end if;
  if exists(select 1 from public.wine_inventory where wine_id=p_wine_id and (quantity is null or quantity<>0)) then
    raise exception 'This record has stock or an unresolved stock balance. Reconcile it first; no stock has been moved.';
  end if;
  if nullif(btrim(target.sku::text),'') is not null or nullif(btrim(target.business_product_number::text),'') is not null or nullif(btrim(target.business_barcode::text),'') is not null
     or exists(select 1 from public.wine_inventory_valuations where wine_id=p_wine_id and external_product_id is not null) then
    raise exception 'This record has a source identifier or valuation link. Keep it active and review the integration first.';
  end if;
  update public.wines set is_active=false where id=p_wine_id;
  -- Keep all historical references. Guest queries exclude inactive wines.
end;
$$;
revoke all on function public.retire_catalogue_duplicate(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.retire_catalogue_duplicate(uuid,uuid,uuid,uuid) to service_role;
notify pgrst, 'reload schema';
