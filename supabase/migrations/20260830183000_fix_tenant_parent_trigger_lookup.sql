-- Dynamic EXECUTE does not update PL/pgSQL's FOUND flag. The previous
-- implementation checked FOUND after EXECUTE, which could reject valid
-- parent rows and stop server-side integrations such as Compucash.
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
  parent_row_count bigint;
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

  get diagnostics parent_row_count = row_count;
  if parent_row_count = 0 then
    raise exception 'Referenced % record does not exist.', tg_argv[1];
  end if;

  -- Server-side integrations do not have auth.uid(). Derive missing tenant
  -- ownership from the referenced parent, then reject cross-tenant links.
  if new.organization_id is null then
    new.organization_id := parent_organization_id;
  end if;
  if new.property_id is null and parent_property_id is not null then
    new.property_id := parent_property_id;
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
grant execute on function public.enforce_same_tenant_parent() to authenticated;
grant execute on function public.enforce_same_tenant_parent() to service_role;
