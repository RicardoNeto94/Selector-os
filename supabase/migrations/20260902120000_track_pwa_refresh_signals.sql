-- Keep room-PWA refresh signals inside the same tenant boundary as the menu
-- they refresh. The application uses a service-role route only after checking
-- the caller's active organization administrator membership.
create table if not exists public.pwa_refresh_signals (
  channel text primary key,
  version bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade
);

create index if not exists pwa_refresh_signals_tenant_idx
  on public.pwa_refresh_signals (organization_id, property_id, updated_at desc);

alter table public.pwa_refresh_signals enable row level security;

drop policy if exists tenant_select on public.pwa_refresh_signals;
create policy tenant_select
  on public.pwa_refresh_signals
  for select
  to authenticated
  using (
    public.is_organization_member(organization_id)
    and public.is_property_member(property_id)
  );

drop policy if exists tenant_insert on public.pwa_refresh_signals;
create policy tenant_insert
  on public.pwa_refresh_signals
  for insert
  to authenticated
  with check (public.can_write_tenant(organization_id, property_id));

drop policy if exists tenant_update on public.pwa_refresh_signals;
create policy tenant_update
  on public.pwa_refresh_signals
  for update
  to authenticated
  using (public.can_write_tenant(organization_id, property_id))
  with check (public.can_write_tenant(organization_id, property_id));

drop policy if exists tenant_delete on public.pwa_refresh_signals;
create policy tenant_delete
  on public.pwa_refresh_signals
  for delete
  to authenticated
  using (public.can_write_tenant(organization_id, property_id));

drop policy if exists service_role_all on public.pwa_refresh_signals;
create policy service_role_all
  on public.pwa_refresh_signals
  for all
  to service_role
  using (true)
  with check (true);
