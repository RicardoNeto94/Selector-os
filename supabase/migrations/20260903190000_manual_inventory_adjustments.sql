-- Tenant-safe manual inventory counting.
-- API-only workspaces remain read-only; manual and hybrid workspaces can set
-- a current location balance and receive an auditable movement entry.

create or replace function public.set_manual_wine_inventory(
  p_wine_id uuid,
  p_location_id uuid,
  p_quantity numeric,
  p_reason text default 'count',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  wine_row public.wines%rowtype;
  location_row public.wine_locations%rowtype;
  inventory_row public.wine_inventory%rowtype;
  previous_quantity numeric := 0;
  quantity_delta numeric;
  normalized_reason text := lower(trim(coalesce(p_reason, 'count')));
  movement_kind text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_wine_id is null or p_location_id is null then
    raise exception 'Wine and location are required.' using errcode = '22023';
  end if;

  if p_quantity is null or p_quantity < 0 or p_quantity > 1000000 then
    raise exception 'Quantity must be between 0 and 1,000,000.' using errcode = '22023';
  end if;

  if normalized_reason not in ('count', 'opening', 'received', 'return', 'breakage', 'write_off') then
    raise exception 'Invalid stock adjustment reason.' using errcode = '22023';
  end if;

  select * into wine_row
  from public.wines
  where id = p_wine_id;

  select * into location_row
  from public.wine_locations
  where id = p_location_id;

  if wine_row.id is null or location_row.id is null then
    raise exception 'Wine or location was not found.' using errcode = 'P0002';
  end if;

  if wine_row.organization_id is distinct from location_row.organization_id
    or wine_row.property_id is distinct from location_row.property_id then
    raise exception 'Wine and location must belong to the same workspace.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_memberships as membership
    where membership.organization_id = wine_row.organization_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role in ('owner', 'administrator')
  ) and not exists (
    select 1
    from public.property_memberships as membership
    where membership.property_id = wine_row.property_id
      and membership.user_id = auth.uid()
      and membership.role in ('administrator', 'manager')
  ) then
    raise exception 'You do not have permission to adjust this inventory.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organization_platform_settings as settings
    where settings.organization_id = wine_row.organization_id
      and settings.inventory_mode in ('manual', 'hybrid')
  ) then
    raise exception 'Manual stock adjustments are disabled for this workspace.' using errcode = '42501';
  end if;

  -- Serialize counts for the same wine/location pair without requiring a new
  -- uniqueness constraint on legacy inventory data.
  perform pg_advisory_xact_lock(hashtext(p_wine_id::text || ':' || p_location_id::text));

  select * into inventory_row
  from public.wine_inventory
  where wine_id = p_wine_id
    and location_id = p_location_id
  order by created_at, id
  limit 1
  for update;

  if inventory_row.id is not null then
    previous_quantity := coalesce(inventory_row.quantity, 0);
  end if;

  quantity_delta := p_quantity - previous_quantity;

  if quantity_delta = 0 then
    return jsonb_build_object(
      'changed', false,
      'wineId', p_wine_id,
      'locationId', p_location_id,
      'previousQuantity', previous_quantity,
      'quantity', p_quantity,
      'delta', 0
    );
  end if;

  if inventory_row.id is null then
    insert into public.wine_inventory (
      wine_id,
      location_id,
      quantity,
      organization_id,
      property_id
    ) values (
      p_wine_id,
      p_location_id,
      p_quantity,
      wine_row.organization_id,
      wine_row.property_id
    )
    returning * into inventory_row;
  else
    update public.wine_inventory
    set quantity = p_quantity
    where id = inventory_row.id
    returning * into inventory_row;
  end if;

  movement_kind := case normalized_reason
    when 'opening' then 'opening'
    when 'received' then 'take_in'
    when 'return' then 'return'
    when 'breakage' then 'breakage'
    when 'write_off' then 'write_off'
    else 'adjustment'
  end;

  insert into public.wine_movements (
    wine_id,
    from_location,
    to_location,
    quantity,
    movement_type,
    created_by,
    notes,
    organization_id,
    property_id
  ) values (
    p_wine_id,
    case when quantity_delta < 0 then p_location_id else null end,
    case when quantity_delta > 0 then p_location_id else null end,
    quantity_delta,
    movement_kind,
    current_user_id,
    concat_ws(' | ',
      nullif(trim(coalesce(p_notes, '')), ''),
      format('Manual stock count: %s -> %s', previous_quantity, p_quantity)
    ),
    wine_row.organization_id,
    wine_row.property_id
  );

  return jsonb_build_object(
    'changed', true,
    'wineId', p_wine_id,
    'locationId', p_location_id,
    'previousQuantity', previous_quantity,
    'quantity', p_quantity,
    'delta', quantity_delta
  );
end;
$$;

revoke all on function public.set_manual_wine_inventory(uuid, uuid, numeric, text, text) from public;
revoke all on function public.set_manual_wine_inventory(uuid, uuid, numeric, text, text) from anon;
grant execute on function public.set_manual_wine_inventory(uuid, uuid, numeric, text, text) to authenticated;

comment on function public.set_manual_wine_inventory(uuid, uuid, numeric, text, text) is
  'Sets a manual or hybrid workspace stock balance after tenant, role and inventory-mode validation, then records the signed delta in wine_movements.';
