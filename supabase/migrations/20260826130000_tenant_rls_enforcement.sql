-- Phase 3: enforce organization/property isolation.
-- Apply only after 20260823180000 and 20260826120000.

create or replace function public.can_write_tenant(
  target_organization_id uuid,
  target_property_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.organization_memberships as membership
      where membership.organization_id = target_organization_id
        and membership.user_id = auth.uid()
        and membership.status = 'active'
        and membership.role in ('owner', 'administrator')
    )
    or (
      target_property_id is not null
      and exists (
        select 1
        from public.organization_memberships as organization_membership
        join public.property_memberships as property_membership
          on property_membership.user_id = organization_membership.user_id
        join public.properties as property
          on property.id = property_membership.property_id
        where organization_membership.organization_id = target_organization_id
          and organization_membership.user_id = auth.uid()
          and organization_membership.status = 'active'
          and property.id = target_property_id
          and property.organization_id = target_organization_id
          and property_membership.role in ('administrator', 'manager', 'operator')
      )
    );
$$;

revoke all on function public.can_write_tenant(uuid, uuid) from public;
grant execute on function public.can_write_tenant(uuid, uuid)
  to authenticated, service_role;

-- Authenticated browser inserts do not need to know or trust tenant UUIDs.
-- The database derives them from active memberships. Explicit tenant values
-- are preserved and then checked by RLS.
create or replace function public.stamp_current_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return new;
  end if;

  if new.organization_id is null then
    select membership.organization_id
      into new.organization_id
    from public.organization_memberships as membership
    where membership.user_id = current_user_id
      and membership.status = 'active'
    order by
      case membership.role
        when 'owner' then 1
        when 'administrator' then 2
        else 3
      end,
      membership.created_at
    limit 1;
  end if;

  if new.property_id is null and new.organization_id is not null then
    select property_membership.property_id
      into new.property_id
    from public.property_memberships as property_membership
    join public.properties as property
      on property.id = property_membership.property_id
    where property_membership.user_id = current_user_id
      and property.organization_id = new.organization_id
      and property.status = 'active'
    order by property_membership.created_at
    limit 1;
  end if;

  return new;
end;
$$;

revoke all on function public.stamp_current_tenant() from public;

do $$
declare
  tenant_table text;
  policy_record record;
  tenant_tables constant text[] := array[
    'restaurants',
    'venues',
    'locations',
    'cellar_locations',
    'menus',
    'menu_categories',
    'menu_items',
    'menu_item_prices',
    'dishes',
    'dish_allergens',
    'experiences',
    'experience_sections',
    'experience_items',
    'experience_media',
    'experience_prices',
    'spa_categories',
    'spa_products',
    'spa_product_variants',
    'merchandise_categories',
    'merchandise_products',
    'wine_locations',
    'wines',
    'wine_inventory',
    'wine_stock',
    'wine_menus',
    'wine_menu_items',
    'wine_menu_servings',
    'wine_transfers',
    'wine_movements',
    'wine_business_aliases',
    'wine_btg_suggestions',
    'sake_pairings',
    'sake_pairing_stages',
    'wine_location_store_mappings',
    'wine_inventory_imports',
    'wine_inventory_import_rows',
    'wine_inventory_valuations',
    'compucash_sync_runs',
    'operation_days',
    'daily_bookings',
    'daily_labour',
    'daily_occupancy',
    'daily_sales',
    'operation_summary',
    'operations_insights',
    'employee_costs',
    'sales_days',
    'sales_categories',
    'sales_payment_methods',
    'sales_products',
    'sales_venues',
    'import_batches',
    'import_jobs',
    'import_sources',
    'raw_import_rows',
    'restaurant_domains',
    'pwa_refresh_signals',
    'user_roles',
    'user_venue_access'
  ];
begin
  foreach tenant_table in array tenant_tables loop
    if to_regclass(format('public.%I', tenant_table)) is null then
      continue;
    end if;

    execute format(
      'alter table public.%I alter column organization_id set not null, alter column property_id set not null',
      tenant_table
    );
    execute format('alter table public.%I enable row level security', tenant_table);

    -- Policies are permissive by default and combine with OR. Remove every
    -- legacy policy before installing the tenant boundary.
    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = tenant_table
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_record.policyname,
        tenant_table
      );
    end loop;

    execute format(
      'drop trigger if exists stamp_current_tenant on public.%I',
      tenant_table
    );
    execute format(
      'create trigger stamp_current_tenant before insert on public.%I for each row execute function public.stamp_current_tenant()',
      tenant_table
    );

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_organization_member(organization_id) and (property_id is null or public.is_property_member(property_id)))',
      'tenant_select',
      tenant_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_write_tenant(organization_id, property_id))',
      'tenant_insert',
      tenant_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.can_write_tenant(organization_id, property_id)) with check (public.can_write_tenant(organization_id, property_id))',
      'tenant_update',
      tenant_table
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.can_write_tenant(organization_id, property_id))',
      'tenant_delete',
      tenant_table
    );
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true)',
      'service_role_all',
      tenant_table
    );
  end loop;
end
$$;

-- RLS protects rows, while this trigger protects relationships between rows.
-- A tenant-owned child cannot point at a menu, wine, location or category that
-- belongs to another tenant.
create or replace function public.enforce_same_tenant_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  foreign_id_text text;
  parent_organization_id uuid;
  parent_property_id uuid;
begin
  foreign_id_text := to_jsonb(new) ->> tg_argv[0];
  if foreign_id_text is null or foreign_id_text = '' then
    return new;
  end if;

  execute format(
    'select organization_id, property_id from public.%I where id = $1',
    tg_argv[1]
  )
  into parent_organization_id, parent_property_id
  using foreign_id_text::uuid;

  if not found then
    raise exception 'Referenced % record does not exist.', tg_argv[1];
  end if;
  if new.organization_id is distinct from parent_organization_id
    or (
      parent_property_id is not null
      and new.property_id is distinct from parent_property_id
    ) then
    raise exception 'Cross-tenant relationship is not allowed.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_same_tenant_parent() from public;

do $$
declare
  relation_record record;
begin
  for relation_record in
    select * from (values
      ('menus', 'restaurant_id', 'restaurants'),
      ('menu_categories', 'menu_id', 'menus'),
      ('menu_items', 'menu_id', 'menus'),
      ('menu_items', 'category_id', 'menu_categories'),
      ('dishes', 'restaurant_id', 'restaurants'),
      ('dish_allergens', 'dish_id', 'dishes'),
      ('experience_sections', 'experience_id', 'experiences'),
      ('experience_items', 'experience_id', 'experiences'),
      ('experience_media', 'experience_id', 'experiences'),
      ('experience_prices', 'experience_id', 'experiences'),
      ('spa_products', 'category_id', 'spa_categories'),
      ('spa_product_variants', 'product_id', 'spa_products'),
      ('merchandise_products', 'category_id', 'merchandise_categories'),
      ('wine_locations', 'wine_menu_id', 'wine_menus'),
      ('wine_locations', 'restaurant_id', 'restaurants'),
      ('wine_locations', 'parent_location_id', 'wine_locations'),
      ('wine_inventory', 'wine_id', 'wines'),
      ('wine_inventory', 'location_id', 'wine_locations'),
      ('wine_stock', 'wine_id', 'wines'),
      ('wine_stock', 'location_id', 'wine_locations'),
      ('wine_menus', 'restaurant_id', 'restaurants'),
      ('wine_menus', 'venue_id', 'venues'),
      ('wine_menus', 'location_id', 'wine_locations'),
      ('wine_menu_items', 'wine_menu_id', 'wine_menus'),
      ('wine_menu_items', 'wine_id', 'wines'),
      ('wine_menu_servings', 'wine_menu_item_id', 'wine_menu_items'),
      ('wine_transfers', 'wine_id', 'wines'),
      ('wine_transfers', 'from_location_id', 'wine_locations'),
      ('wine_transfers', 'to_location_id', 'wine_locations'),
      ('wine_movements', 'wine_id', 'wines'),
      ('wine_movements', 'from_location', 'wine_locations'),
      ('wine_movements', 'to_location', 'wine_locations'),
      ('wine_movements', 'inventory_import_id', 'wine_inventory_imports'),
      ('wine_business_aliases', 'wine_id', 'wines'),
      ('wine_btg_suggestions', 'wine_id', 'wines'),
      ('wine_btg_suggestions', 'location_id', 'wine_locations'),
      ('sake_pairings', 'wine_menu_id', 'wine_menus'),
      ('sake_pairing_stages', 'pairing_id', 'sake_pairings'),
      ('sake_pairing_stages', 'sake_wine_id', 'wines'),
      ('wine_location_store_mappings', 'location_id', 'wine_locations'),
      ('wine_inventory_import_rows', 'import_id', 'wine_inventory_imports'),
      ('wine_inventory_import_rows', 'wine_id', 'wines'),
      ('wine_inventory_import_rows', 'location_id', 'wine_locations'),
      ('wine_inventory_valuations', 'wine_id', 'wines'),
      ('wine_inventory_valuations', 'location_id', 'wine_locations'),
      ('import_jobs', 'batch_id', 'import_batches'),
      ('raw_import_rows', 'batch_id', 'import_batches'),
      ('user_venue_access', 'location_id', 'wine_locations')
    ) as relationships(child_table, foreign_key_column, parent_table)
  loop
    if to_regclass(format('public.%I', relation_record.child_table)) is null
      or to_regclass(format('public.%I', relation_record.parent_table)) is null
      or not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = relation_record.child_table
          and column_name = relation_record.foreign_key_column
      ) then
      continue;
    end if;

    execute format(
      'drop trigger if exists %I on public.%I',
      'zz_tenant_parent_' || relation_record.foreign_key_column,
      relation_record.child_table
    );
    execute format(
      'create trigger %I before insert or update of %I, organization_id, property_id on public.%I for each row execute function public.enforce_same_tenant_parent(%L, %L)',
      'zz_tenant_parent_' || relation_record.foreign_key_column,
      relation_record.foreign_key_column,
      relation_record.child_table,
      relation_record.foreign_key_column,
      relation_record.parent_table
    );
  end loop;
end
$$;

-- Identity and reference tables need policies of their own because they are
-- not owned by a single property row. Profiles are visible only to the same
-- organization (or to their owner); shared role/allergen definitions are
-- read-only to application users.
create or replace function public.can_read_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    or exists (
      select 1
      from public.organization_memberships as current_membership
      join public.organization_memberships as target_membership
        on target_membership.organization_id = current_membership.organization_id
      where current_membership.user_id = auth.uid()
        and current_membership.status = 'active'
        and target_membership.user_id = target_user_id
        and target_membership.status in ('active', 'invited')
    );
$$;

revoke all on function public.can_read_profile(uuid) from public;
grant execute on function public.can_read_profile(uuid) to authenticated, service_role;

do $$
declare
  protected_table text;
  policy_record record;
begin
  foreach protected_table in array array[
    'profiles', 'users', 'roles', 'permissions', 'role_permissions',
    'allergen', 'allergens'
  ] loop
    if to_regclass(format('public.%I', protected_table)) is null then
      continue;
    end if;
    execute format('alter table public.%I enable row level security', protected_table);
    for policy_record in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = protected_table
    loop
      execute format('drop policy if exists %I on public.%I', policy_record.policyname, protected_table);
    end loop;
  end loop;

  if to_regclass('public.profiles') is not null then
    create policy profile_org_read on public.profiles for select to authenticated
      using (public.can_read_profile(id));
    create policy profile_self_update on public.profiles for update to authenticated
      using (id = auth.uid()) with check (id = auth.uid());
    create policy profile_service_all on public.profiles for all to service_role
      using (true) with check (true);
  end if;

  if to_regclass('public.users') is not null then
    create policy users_self_read on public.users for select to authenticated
      using (id = auth.uid());
    create policy users_service_all on public.users for all to service_role
      using (true) with check (true);
  end if;

  if to_regclass('public.roles') is not null then
    create policy roles_authenticated_read on public.roles for select to authenticated using (true);
    create policy roles_service_all on public.roles for all to service_role using (true) with check (true);
  end if;
  if to_regclass('public.permissions') is not null then
    create policy permissions_authenticated_read on public.permissions for select to authenticated using (true);
    create policy permissions_service_all on public.permissions for all to service_role using (true) with check (true);
  end if;
  if to_regclass('public.role_permissions') is not null then
    create policy role_permissions_authenticated_read on public.role_permissions for select to authenticated using (true);
    create policy role_permissions_service_all on public.role_permissions for all to service_role using (true) with check (true);
  end if;

  if to_regclass('public.allergen') is not null then
    create policy allergen_public_read on public.allergen for select to anon, authenticated using (true);
    create policy allergen_service_all on public.allergen for all to service_role using (true) with check (true);
  end if;
  if to_regclass('public.allergens') is not null then
    create policy allergens_public_read on public.allergens for select to anon, authenticated using (true);
    create policy allergens_service_all on public.allergens for all to service_role using (true) with check (true);
  end if;
end
$$;

-- Views must execute with the caller's RLS privileges rather than their
-- creator's privileges.
do $$
begin
  if to_regclass('public.wine_inventory_resolved') is not null then
    alter view public.wine_inventory_resolved set (security_invoker = true);
  end if;
  if to_regclass('public.wine_compucash_location_targets') is not null then
    alter view public.wine_compucash_location_targets set (security_invoker = true);
  end if;
end
$$;

-- Resolve the Security Advisor warning and keep the RPC unavailable to anon.
do $$
begin
  if to_regprocedure('public.transfer_wine(uuid,uuid,uuid,numeric,uuid,text)') is not null then
    alter function public.transfer_wine(uuid, uuid, uuid, numeric, uuid, text)
      set search_path = public;
    revoke all on function public.transfer_wine(uuid, uuid, uuid, numeric, uuid, text) from anon;
    grant execute on function public.transfer_wine(uuid, uuid, uuid, numeric, uuid, text)
      to authenticated, service_role;
  end if;
end
$$;

-- Foundation-table policies are intentionally narrower than operational data.
do $$
declare
  foundation_table text;
  policy_record record;
begin
  foreach foundation_table in array array[
    'organizations',
    'properties',
    'organization_memberships',
    'property_memberships',
    'integration_connections',
    'guest_experiences'
  ] loop
    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = foundation_table
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_record.policyname,
        foundation_table
      );
    end loop;
  end loop;
end
$$;

create policy "Members read organizations"
  on public.organizations for select to authenticated
  using (public.is_organization_member(id));
create policy "Administrators update organizations"
  on public.organizations for update to authenticated
  using (public.is_organization_administrator(id))
  with check (public.is_organization_administrator(id));

create policy "Members read properties"
  on public.properties for select to authenticated
  using (
    public.is_organization_member(organization_id)
    and public.is_property_member(id)
  );
create policy "Administrators update properties"
  on public.properties for update to authenticated
  using (public.is_organization_administrator(organization_id))
  with check (public.is_organization_administrator(organization_id));

create policy "Members read relevant organization memberships"
  on public.organization_memberships for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_organization_administrator(organization_id)
  );

create policy "Members read relevant property memberships"
  on public.property_memberships for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.properties as property
      where property.id = property_id
        and public.is_organization_administrator(property.organization_id)
    )
  );

create policy "Administrators read integration connections"
  on public.integration_connections for select to authenticated
  using (public.is_organization_administrator(organization_id));

create policy "Members read guest experiences"
  on public.guest_experiences for select to authenticated
  using (
    public.is_organization_member(organization_id)
    and public.is_property_member(property_id)
  );
create policy "Administrators manage guest experiences"
  on public.guest_experiences for all to authenticated
  using (public.is_organization_administrator(organization_id))
  with check (public.is_organization_administrator(organization_id));

create policy "Service role manages organizations"
  on public.organizations for all to service_role using (true) with check (true);
create policy "Service role manages properties"
  on public.properties for all to service_role using (true) with check (true);
create policy "Service role manages organization memberships"
  on public.organization_memberships for all to service_role using (true) with check (true);
create policy "Service role manages property memberships"
  on public.property_memberships for all to service_role using (true) with check (true);
create policy "Service role manages integration connections"
  on public.integration_connections for all to service_role using (true) with check (true);
create policy "Service role manages guest experiences"
  on public.guest_experiences for all to service_role using (true) with check (true);

-- New customers are provisioned atomically. No client can choose another
-- tenant's IDs or create a partially-owned workspace.
create or replace function public.provision_hospitality_workspace(
  p_name text,
  p_slug text,
  p_location text default null,
  p_cuisine text default null,
  p_plan text default 'starter'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  organization_row public.organizations;
  property_row public.properties;
  restaurant_row public.restaurants;
  safe_slug text;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = current_user_id and status = 'active'
  ) then
    raise exception 'An approved active Vaxeron account is required.';
  end if;
  if exists (
    select 1 from public.organization_memberships
    where user_id = current_user_id and status = 'active'
  ) then
    raise exception 'This account already belongs to an organization.';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception 'Organization name is required.';
  end if;

  safe_slug := regexp_replace(lower(coalesce(nullif(btrim(p_slug), ''), p_name)), '[^a-z0-9]+', '-', 'g');
  safe_slug := trim(both '-' from safe_slug);
  if safe_slug = '' then safe_slug := 'hospitality'; end if;
  safe_slug := safe_slug || '-' || left(replace(current_user_id::text, '-', ''), 8);

  insert into public.organizations (name, slug, status)
  values (btrim(p_name), safe_slug, 'active')
  returning * into organization_row;

  insert into public.organization_memberships (organization_id, user_id, role, status)
  values (organization_row.id, current_user_id, 'owner', 'active');

  insert into public.properties (
    organization_id, name, slug, timezone, currency_code, status
  ) values (
    organization_row.id, btrim(p_name), safe_slug, 'Europe/Tallinn', 'EUR', 'active'
  ) returning * into property_row;

  insert into public.property_memberships (property_id, user_id, role)
  values (property_row.id, current_user_id, 'administrator');

  insert into public.restaurants (
    owner_id,
    name,
    slug,
    location,
    cuisine,
    subscription_plan,
    plan,
    organization_id,
    property_id
  ) values (
    current_user_id,
    btrim(p_name),
    safe_slug,
    nullif(btrim(p_location), ''),
    nullif(btrim(p_cuisine), ''),
    p_plan,
    p_plan,
    organization_row.id,
    property_row.id
  ) returning * into restaurant_row;

  update public.properties
  set restaurant_id = restaurant_row.id,
      updated_at = now()
  where id = property_row.id;

  return jsonb_build_object(
    'organizationId', organization_row.id,
    'propertyId', property_row.id,
    'restaurant', to_jsonb(restaurant_row)
  );
end;
$$;

revoke all on function public.provision_hospitality_workspace(text, text, text, text, text)
  from public;
grant execute on function public.provision_hospitality_workspace(text, text, text, text, text)
  to authenticated;

-- Invitation acceptance is self-service, but it may only activate membership
-- rows already created by an organization administrator.
create or replace function public.activate_current_memberships()
returns void
language sql
security definer
set search_path = public
as $$
  update public.organization_memberships
  set status = 'active', updated_at = now()
  where user_id = auth.uid() and status = 'invited';
$$;

revoke all on function public.activate_current_memberships() from public;
grant execute on function public.activate_current_memberships() to authenticated;
