-- Tenant-safe lifecycle contract for wine locations and CompuCash mappings.
--
-- These RPCs deliberately derive organization/property ownership from the
-- selected restaurant or existing location. Browser-supplied tenant ids are
-- never trusted. Structural changes are restricted to customer owners and
-- administrators; read-only platform support sessions cannot use them.

create or replace function public.assert_wine_location_administrator(
  target_organization_id uuid,
  target_property_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return;
  end if;

  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not public.is_organization_administrator(target_organization_id)
    or not public.is_property_member(target_property_id) then
    raise exception 'Workspace administrator access is required.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.assert_wine_location_administrator(uuid, uuid) from public, anon, authenticated;
grant execute on function public.assert_wine_location_administrator(uuid, uuid) to service_role;

create or replace function public.create_wine_location(
  p_location_type text,
  p_name text,
  p_parent_location_id uuid,
  p_restaurant_id uuid,
  p_slug text,
  p_wine_menu_id uuid
)
returns public.wine_locations
language plpgsql
security definer
set search_path = public
as $$
declare
  target_restaurant public.restaurants%rowtype;
  parent_location public.wine_locations%rowtype;
  target_menu public.wine_menus%rowtype;
  created_location public.wine_locations%rowtype;
  clean_name text := nullif(btrim(p_name), '');
  clean_slug text := nullif(btrim(p_slug), '');
begin
  if clean_name is null then
    raise exception 'Location name is required.' using errcode = '22023';
  end if;

  if p_location_type not in (
    'master_cellar', 'venue_cellar', 'bar_storage', 'service_station',
    'private_collection', 'transit', 'storage'
  ) then
    raise exception 'Unsupported wine location type.' using errcode = '22023';
  end if;

  select * into target_restaurant
  from public.restaurants
  where id = p_restaurant_id;

  if not found then
    raise exception 'Restaurant does not exist.' using errcode = '22023';
  end if;

  perform public.assert_wine_location_administrator(
    target_restaurant.organization_id,
    target_restaurant.property_id
  );

  if p_parent_location_id is not null then
    select * into parent_location
    from public.wine_locations
    where id = p_parent_location_id;

    if not found
      or parent_location.organization_id is distinct from target_restaurant.organization_id
      or parent_location.property_id is distinct from target_restaurant.property_id then
      raise exception 'Parent location must belong to the current workspace.' using errcode = '42501';
    end if;
  end if;

  if p_wine_menu_id is not null then
    select * into target_menu
    from public.wine_menus
    where id = p_wine_menu_id;

    if not found
      or target_menu.organization_id is distinct from target_restaurant.organization_id
      or target_menu.property_id is distinct from target_restaurant.property_id
      or (
        target_menu.restaurant_id is not null
        and target_menu.restaurant_id is distinct from target_restaurant.id
      ) then
      raise exception 'Wine menu must belong to the selected venue and workspace.' using errcode = '42501';
    end if;
  end if;

  insert into public.wine_locations (
    restaurant_id,
    name,
    location_type,
    parent_location_id,
    wine_menu_id,
    slug,
    is_active,
    organization_id,
    property_id
  ) values (
    target_restaurant.id,
    clean_name,
    p_location_type,
    p_parent_location_id,
    p_wine_menu_id,
    clean_slug,
    true,
    target_restaurant.organization_id,
    target_restaurant.property_id
  )
  returning * into created_location;

  return created_location;
end;
$$;

create or replace function public.update_wine_location(
  p_location_id uuid,
  p_location_type text,
  p_name text,
  p_parent_location_id uuid,
  p_slug text,
  p_wine_menu_id uuid
)
returns public.wine_locations
language plpgsql
security definer
set search_path = public
as $$
declare
  target_location public.wine_locations%rowtype;
  parent_location public.wine_locations%rowtype;
  target_menu public.wine_menus%rowtype;
  updated_location public.wine_locations%rowtype;
  clean_name text := nullif(btrim(p_name), '');
  clean_slug text := nullif(btrim(p_slug), '');
begin
  select * into target_location
  from public.wine_locations
  where id = p_location_id;

  if not found then
    raise exception 'Wine location does not exist.' using errcode = '22023';
  end if;

  perform public.assert_wine_location_administrator(
    target_location.organization_id,
    target_location.property_id
  );

  if clean_name is null then
    raise exception 'Location name is required.' using errcode = '22023';
  end if;

  if p_location_type not in (
    'master_cellar', 'venue_cellar', 'bar_storage', 'service_station',
    'private_collection', 'transit', 'storage'
  ) then
    raise exception 'Unsupported wine location type.' using errcode = '22023';
  end if;

  if p_parent_location_id = p_location_id then
    raise exception 'A location cannot be its own parent.' using errcode = '22023';
  end if;

  if p_parent_location_id is not null then
    select * into parent_location
    from public.wine_locations
    where id = p_parent_location_id;

    if not found
      or parent_location.organization_id is distinct from target_location.organization_id
      or parent_location.property_id is distinct from target_location.property_id then
      raise exception 'Parent location must belong to the current workspace.' using errcode = '42501';
    end if;

    if exists (
      with recursive ancestors as (
        select id, parent_location_id
        from public.wine_locations
        where id = p_parent_location_id
        union all
        select location.id, location.parent_location_id
        from public.wine_locations as location
        join ancestors on ancestors.parent_location_id = location.id
      )
      select 1 from ancestors where id = p_location_id
    ) then
      raise exception 'Location hierarchy cannot contain a cycle.' using errcode = '22023';
    end if;
  end if;

  if p_wine_menu_id is not null then
    select * into target_menu
    from public.wine_menus
    where id = p_wine_menu_id;

    if not found
      or target_menu.organization_id is distinct from target_location.organization_id
      or target_menu.property_id is distinct from target_location.property_id
      or (
        target_menu.restaurant_id is not null
        and target_menu.restaurant_id is distinct from target_location.restaurant_id
      ) then
      raise exception 'Wine menu must belong to this venue and workspace.' using errcode = '42501';
    end if;
  end if;

  update public.wine_locations
  set name = clean_name,
      location_type = p_location_type,
      parent_location_id = p_parent_location_id,
      wine_menu_id = p_wine_menu_id,
      slug = clean_slug
  where id = target_location.id
  returning * into updated_location;

  return updated_location;
end;
$$;

create or replace function public.archive_wine_location(p_location_id uuid)
returns public.wine_locations
language plpgsql
security definer
set search_path = public
as $$
declare
  target_location public.wine_locations%rowtype;
begin
  select * into target_location
  from public.wine_locations
  where id = p_location_id;

  if not found then
    raise exception 'Wine location does not exist.' using errcode = '22023';
  end if;

  perform public.assert_wine_location_administrator(
    target_location.organization_id,
    target_location.property_id
  );

  update public.wine_locations
  set is_active = false
  where id = target_location.id
  returning * into target_location;

  return target_location;
end;
$$;

create or replace function public.restore_wine_location(p_location_id uuid)
returns public.wine_locations
language plpgsql
security definer
set search_path = public
as $$
declare
  target_location public.wine_locations%rowtype;
begin
  select * into target_location
  from public.wine_locations
  where id = p_location_id;

  if not found then
    raise exception 'Wine location does not exist.' using errcode = '22023';
  end if;

  perform public.assert_wine_location_administrator(
    target_location.organization_id,
    target_location.property_id
  );

  if target_location.parent_location_id is not null
    and not exists (
      select 1
      from public.wine_locations as parent
      where parent.id = target_location.parent_location_id
        and parent.is_active = true
        and parent.organization_id = target_location.organization_id
        and parent.property_id = target_location.property_id
    ) then
    raise exception 'Restore the parent location first.' using errcode = '22023';
  end if;

  update public.wine_locations
  set is_active = true
  where id = target_location.id
  returning * into target_location;

  return target_location;
end;
$$;

create or replace function public.add_wine_location_store_mapping(
  p_business_store_name text,
  p_location_id uuid
)
returns public.wine_location_store_mappings
language plpgsql
security definer
set search_path = public
as $$
declare
  target_location public.wine_locations%rowtype;
  created_mapping public.wine_location_store_mappings%rowtype;
  clean_store_name text := nullif(btrim(p_business_store_name), '');
begin
  if clean_store_name is null then
    raise exception 'CompuCash store name is required.' using errcode = '22023';
  end if;

  select * into target_location
  from public.wine_locations
  where id = p_location_id;

  if not found then
    raise exception 'Wine location does not exist.' using errcode = '22023';
  end if;

  perform public.assert_wine_location_administrator(
    target_location.organization_id,
    target_location.property_id
  );

  if exists (
    select 1
    from public.wine_location_store_mappings as mapping
    where mapping.organization_id = target_location.organization_id
      and mapping.property_id = target_location.property_id
      and lower(btrim(mapping.business_store_name)) = lower(clean_store_name)
  ) then
    raise exception 'This CompuCash store is already mapped in the workspace.' using errcode = '23505';
  end if;

  insert into public.wine_location_store_mappings (
    location_id,
    business_store_name,
    organization_id,
    property_id
  ) values (
    target_location.id,
    clean_store_name,
    target_location.organization_id,
    target_location.property_id
  )
  returning * into created_mapping;

  return created_mapping;
end;
$$;

create or replace function public.remove_wine_location_store_mapping(p_mapping_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_mapping public.wine_location_store_mappings%rowtype;
begin
  select * into target_mapping
  from public.wine_location_store_mappings
  where id = p_mapping_id;

  if not found then
    raise exception 'CompuCash store mapping does not exist.' using errcode = '22023';
  end if;

  perform public.assert_wine_location_administrator(
    target_mapping.organization_id,
    target_mapping.property_id
  );

  delete from public.wine_location_store_mappings
  where id = target_mapping.id;

  return true;
end;
$$;

revoke all on function public.create_wine_location(text, text, uuid, uuid, text, uuid) from public, anon;
revoke all on function public.update_wine_location(uuid, text, text, uuid, text, uuid) from public, anon;
revoke all on function public.archive_wine_location(uuid) from public, anon;
revoke all on function public.restore_wine_location(uuid) from public, anon;
revoke all on function public.add_wine_location_store_mapping(text, uuid) from public, anon;
revoke all on function public.remove_wine_location_store_mapping(uuid) from public, anon;

grant execute on function public.create_wine_location(text, text, uuid, uuid, text, uuid) to authenticated, service_role;
grant execute on function public.update_wine_location(uuid, text, text, uuid, text, uuid) to authenticated, service_role;
grant execute on function public.archive_wine_location(uuid) to authenticated, service_role;
grant execute on function public.restore_wine_location(uuid) to authenticated, service_role;
grant execute on function public.add_wine_location_store_mapping(text, uuid) to authenticated, service_role;
grant execute on function public.remove_wine_location_store_mapping(uuid) to authenticated, service_role;

-- Direct browser writes must follow the same structural-administrator rule as
-- the RPCs. The service-role policies installed by tenant enforcement remain.
drop policy if exists tenant_insert on public.wine_locations;
drop policy if exists tenant_update on public.wine_locations;
drop policy if exists tenant_delete on public.wine_locations;
drop policy if exists wine_locations_admin_insert on public.wine_locations;
drop policy if exists wine_locations_admin_update on public.wine_locations;
drop policy if exists wine_locations_admin_delete on public.wine_locations;
create policy wine_locations_admin_insert
  on public.wine_locations for insert to authenticated
  with check (
    public.is_organization_administrator(organization_id)
    and public.is_property_member(property_id)
  );
create policy wine_locations_admin_update
  on public.wine_locations for update to authenticated
  using (
    public.is_organization_administrator(organization_id)
    and public.is_property_member(property_id)
  )
  with check (
    public.is_organization_administrator(organization_id)
    and public.is_property_member(property_id)
  );
create policy wine_locations_admin_delete
  on public.wine_locations for delete to authenticated
  using (
    public.is_organization_administrator(organization_id)
    and public.is_property_member(property_id)
  );

drop policy if exists tenant_insert on public.wine_location_store_mappings;
drop policy if exists tenant_update on public.wine_location_store_mappings;
drop policy if exists tenant_delete on public.wine_location_store_mappings;
drop policy if exists wine_location_mappings_admin_insert on public.wine_location_store_mappings;
drop policy if exists wine_location_mappings_admin_update on public.wine_location_store_mappings;
drop policy if exists wine_location_mappings_admin_delete on public.wine_location_store_mappings;
create policy wine_location_mappings_admin_insert
  on public.wine_location_store_mappings for insert to authenticated
  with check (
    public.is_organization_administrator(organization_id)
    and public.is_property_member(property_id)
  );
create policy wine_location_mappings_admin_update
  on public.wine_location_store_mappings for update to authenticated
  using (
    public.is_organization_administrator(organization_id)
    and public.is_property_member(property_id)
  )
  with check (
    public.is_organization_administrator(organization_id)
    and public.is_property_member(property_id)
  );
create policy wine_location_mappings_admin_delete
  on public.wine_location_store_mappings for delete to authenticated
  using (
    public.is_organization_administrator(organization_id)
    and public.is_property_member(property_id)
  );
