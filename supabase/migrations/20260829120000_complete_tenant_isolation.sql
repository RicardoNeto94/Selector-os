-- Final isolation hardening before onboarding a second Vaxeron customer.
--
-- 1. Repair legacy rows using their tenant-owned parent records.
-- 2. Reject future rows without tenant ownership.
-- 3. Make `/wine/:slug` globally unambiguous.
-- 4. Expose inventory to anonymous guest pages only for a published,
--    same-tenant wine experience.

begin;

update public.wine_inventory as child
set organization_id = parent.organization_id,
    property_id = parent.property_id
from public.wine_locations as parent
where child.location_id = parent.id
  and (child.organization_id is null or child.property_id is null);

update public.wine_inventory_valuations as child
set organization_id = parent.organization_id,
    property_id = parent.property_id
from public.wine_locations as parent
where child.location_id = parent.id
  and (child.organization_id is null or child.property_id is null);

update public.wine_movements as child
set organization_id = parent.organization_id,
    property_id = parent.property_id
from public.wines as parent
where child.wine_id = parent.id
  and (child.organization_id is null or child.property_id is null);

-- A user role is organization-owned. Derive its property only where that user
-- has exactly one active property membership inside the same organization.
with resolved_memberships as (
  select
    organization_membership.user_id,
    organization_membership.organization_id,
    min(property_membership.property_id::text)::uuid as property_id
  from public.organization_memberships as organization_membership
  join public.property_memberships as property_membership
    on property_membership.user_id = organization_membership.user_id
  join public.properties as property
    on property.id = property_membership.property_id
   and property.organization_id = organization_membership.organization_id
  where organization_membership.status = 'active'
  group by organization_membership.user_id, organization_membership.organization_id
  having count(distinct property_membership.property_id) = 1
)
update public.user_roles as child
set organization_id = resolved.organization_id,
    property_id = resolved.property_id
from resolved_memberships as resolved
where child.user_id = resolved.user_id
  and (child.organization_id is null or child.property_id is null);

do $$
declare
  tenant_table text;
  unresolved bigint;
begin
  foreach tenant_table in array array[
    'wine_inventory',
    'wine_inventory_valuations',
    'wine_movements',
    'user_roles'
  ] loop
    execute format(
      'select count(*) from public.%I where organization_id is null or property_id is null',
      tenant_table
    ) into unresolved;
    if unresolved > 0 then
      raise exception '% still has % rows without tenant ownership; migration aborted.', tenant_table, unresolved;
    end if;
    execute format(
      'alter table public.%I alter column organization_id set not null, alter column property_id set not null',
      tenant_table
    );
  end loop;
end
$$;

-- The public route is `/wine/:slug`, not `/wine/:organization/:slug`, so the
-- slug must be unique across all customers. Lower-case expression indexes also
-- protect against case-only collisions from legacy/manual data.
create unique index if not exists wine_menus_public_slug_unique
  on public.wine_menus (lower(slug));

create unique index if not exists guest_experiences_public_slug_unique
  on public.guest_experiences (lower(slug));

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
  from public.wine_menus as menu
  join public.wine_locations as location
    on location.wine_menu_id = menu.id
   and location.organization_id = menu.organization_id
   and location.property_id = menu.property_id
  join public.wine_inventory as inventory
    on inventory.location_id = location.id
   and inventory.organization_id = menu.organization_id
   and inventory.property_id = menu.property_id
  where menu.id = p_menu_id
    and location.is_active = true
    and exists (
      select 1
      from public.guest_experiences as experience
      where experience.venue_location_id = location.id
        and experience.organization_id = menu.organization_id
        and experience.property_id = menu.property_id
        and experience.is_published = true
    )
  group by inventory.wine_id;
$$;

revoke all on function public.get_public_wine_menu_availability(uuid) from public;
grant execute on function public.get_public_wine_menu_availability(uuid) to anon, authenticated;

comment on function public.get_public_wine_menu_availability(uuid) is
  'Returns positive physical availability only for a published wine experience whose menu, location and inventory share the same tenant.';

commit;
