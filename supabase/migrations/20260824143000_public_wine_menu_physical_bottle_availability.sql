create or replace function public.get_public_wine_menu_availability(p_menu_id uuid)
returns table (wine_id uuid, quantity numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    inventory.wine_id,
    sum(
      case
        when abs(coalesce(inventory.quantity, 0)) < 0.001 then 0
        else greatest(coalesce(inventory.quantity, 0), 0)
      end
    )::numeric as quantity
  from public.wine_inventory as inventory
  join public.wine_locations as location on location.id = inventory.location_id
  where location.wine_menu_id = p_menu_id
    and location.is_active = true
  group by inventory.wine_id;
$$;

revoke all on function public.get_public_wine_menu_availability(uuid) from public;
grant execute on function public.get_public_wine_menu_availability(uuid) to anon, authenticated;

comment on function public.get_public_wine_menu_availability(uuid) is
  'Returns physical bottle/container availability for a public wine menu. Positive balances are summed; negative Compucash exceptions never cancel physical stock.';
