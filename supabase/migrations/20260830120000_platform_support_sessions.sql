-- Time-limited, audited Vaxeron support access.
--
-- Platform administrators never become customer members. An active support
-- session only extends tenant SELECT policies; all customer writes continue to
-- require an owner/administrator membership through can_write_tenant().

create table if not exists public.platform_support_sessions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  access_level text not null default 'read_only'
    check (access_level in ('read_only')),
  reason text not null check (char_length(btrim(reason)) between 8 and 500),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  ended_by_user_id uuid references auth.users(id) on delete set null,
  client_context jsonb not null default '{}'::jsonb,
  constraint platform_support_session_expiry_check
    check (expires_at > started_at and expires_at <= started_at + interval '1 hour')
);

create index if not exists platform_support_sessions_actor_active_idx
  on public.platform_support_sessions(actor_user_id, expires_at desc)
  where ended_at is null;
create index if not exists platform_support_sessions_customer_idx
  on public.platform_support_sessions(organization_id, property_id, started_at desc);

alter table public.platform_support_sessions enable row level security;

drop policy if exists "Service role manages platform support sessions"
  on public.platform_support_sessions;
create policy "Service role manages platform support sessions"
  on public.platform_support_sessions for all to service_role
  using (true) with check (true);

create or replace function public.has_active_platform_support_access(
  target_organization_id uuid,
  target_property_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_support_sessions as support_session
    join public.platform_administrators as platform_admin
      on platform_admin.user_id = support_session.actor_user_id
     and platform_admin.status = 'active'
    where support_session.actor_user_id = auth.uid()
      and support_session.organization_id = target_organization_id
      and (target_property_id is null or support_session.property_id = target_property_id)
      and support_session.access_level = 'read_only'
      and support_session.ended_at is null
      and support_session.expires_at > now()
  );
$$;

revoke all on function public.has_active_platform_support_access(uuid, uuid) from public;
grant execute on function public.has_active_platform_support_access(uuid, uuid)
  to authenticated, service_role;

-- SELECT policies already call these helpers. Extending them here gives an
-- active support session visibility into exactly one customer property without
-- granting a tenant membership or any write permission.
create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.organization_memberships
      where organization_id = target_organization_id
        and user_id = auth.uid()
        and status = 'active'
    )
    or public.has_active_platform_support_access(target_organization_id, null);
$$;

create or replace function public.is_property_member(target_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.property_memberships
      where property_id = target_property_id
        and user_id = auth.uid()
    )
    or exists (
      select 1
      from public.properties as property
      where property.id = target_property_id
        and public.has_active_platform_support_access(
          property.organization_id,
          property.id
        )
    );
$$;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.is_property_member(uuid) from public;
grant execute on function public.is_organization_member(uuid)
  to authenticated, service_role;
grant execute on function public.is_property_member(uuid)
  to authenticated, service_role;

-- Foundation records have narrower policies than operational tables. Extend
-- their SELECT policies explicitly so support can understand configuration,
-- while leaving every insert/update/delete policy unchanged.
drop policy if exists "Members read relevant organization memberships"
  on public.organization_memberships;
create policy "Members read relevant organization memberships"
  on public.organization_memberships for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_organization_administrator(organization_id)
    or public.has_active_platform_support_access(organization_id, null)
  );

drop policy if exists "Members read relevant property memberships"
  on public.property_memberships;
create policy "Members read relevant property memberships"
  on public.property_memberships for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.properties as property
      where property.id = property_id
        and (
          public.is_organization_administrator(property.organization_id)
          or public.has_active_platform_support_access(
            property.organization_id,
            property.id
          )
        )
    )
  );

drop policy if exists "Administrators read integration connections"
  on public.integration_connections;
create policy "Administrators and active support read integration connections"
  on public.integration_connections for select to authenticated
  using (
    public.is_organization_administrator(organization_id)
    or public.has_active_platform_support_access(organization_id, property_id)
  );

comment on table public.platform_support_sessions is
  'Audited, expiring, read-only support access. Rows never replace customer memberships.';
comment on function public.has_active_platform_support_access(uuid, uuid) is
  'Checks whether the authenticated platform administrator has an unexpired read-only support session for the tenant.';

create or replace function public.platform_start_support_session(
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_property_id uuid,
  p_reason text,
  p_duration_minutes integer default 30,
  p_client_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  support_session public.platform_support_sessions;
  customer_name text;
  property_name text;
begin
  if not exists (
    select 1
    from public.platform_administrators
    where user_id = p_actor_user_id
      and status = 'active'
      and role in ('root_owner', 'platform_administrator', 'support_viewer')
  ) then
    raise exception 'Active Vaxeron platform access is required.';
  end if;
  if p_duration_minutes not in (15, 30, 60) then
    raise exception 'Support sessions may last 15, 30 or 60 minutes.';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 8 and 500 then
    raise exception 'A support reason between 8 and 500 characters is required.';
  end if;

  select organization.name, property.name
    into customer_name, property_name
  from public.organizations as organization
  join public.properties as property
    on property.organization_id = organization.id
  where organization.id = p_organization_id
    and property.id = p_property_id
    and organization.status = 'active'
    and property.status = 'active';
  if customer_name is null then
    raise exception 'The selected active customer property does not exist.';
  end if;

  update public.platform_support_sessions
  set ended_at = now(), ended_by_user_id = p_actor_user_id
  where actor_user_id = p_actor_user_id
    and ended_at is null;

  insert into public.platform_support_sessions (
    actor_user_id,
    organization_id,
    property_id,
    access_level,
    reason,
    expires_at,
    client_context
  ) values (
    p_actor_user_id,
    p_organization_id,
    p_property_id,
    'read_only',
    btrim(p_reason),
    now() + make_interval(mins => p_duration_minutes),
    coalesce(p_client_context, '{}'::jsonb)
  ) returning * into support_session;

  insert into public.platform_audit_log (
    actor_user_id, action, target_type, target_id, metadata
  ) values (
    p_actor_user_id,
    'support_session.started',
    'organization',
    p_organization_id::text,
    jsonb_build_object(
      'support_session_id', support_session.id,
      'organization_name', customer_name,
      'property_id', p_property_id,
      'property_name', property_name,
      'access_level', support_session.access_level,
      'reason', support_session.reason,
      'expires_at', support_session.expires_at,
      'client_context', support_session.client_context
    )
  );

  return jsonb_build_object(
    'id', support_session.id,
    'organization_id', support_session.organization_id,
    'organization_name', customer_name,
    'property_id', support_session.property_id,
    'property_name', property_name,
    'access_level', support_session.access_level,
    'reason', support_session.reason,
    'started_at', support_session.started_at,
    'expires_at', support_session.expires_at
  );
end;
$$;

create or replace function public.platform_end_support_session(
  p_actor_user_id uuid,
  p_session_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ended_sessions uuid[];
begin
  with ended as (
    update public.platform_support_sessions
    set ended_at = now(), ended_by_user_id = p_actor_user_id
    where actor_user_id = p_actor_user_id
      and ended_at is null
      and (p_session_id is null or id = p_session_id)
    returning id
  )
  select array_agg(id) into ended_sessions from ended;

  if coalesce(array_length(ended_sessions, 1), 0) = 0 then
    return false;
  end if;

  insert into public.platform_audit_log (
    actor_user_id, action, target_type, target_id, metadata
  ) values (
    p_actor_user_id,
    'support_session.ended',
    'support_session',
    coalesce(p_session_id::text, 'all-active'),
    jsonb_build_object('session_ids', to_jsonb(ended_sessions))
  );

  return true;
end;
$$;

revoke all on function public.platform_start_support_session(
  uuid, uuid, uuid, text, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.platform_start_support_session(
  uuid, uuid, uuid, text, integer, jsonb
) to service_role;

revoke all on function public.platform_end_support_session(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.platform_end_support_session(uuid, uuid)
  to service_role;
