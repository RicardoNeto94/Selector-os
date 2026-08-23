create table if not exists public.compucash_sync_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_source text not null,
  status text not null check (status in ('succeeded', 'failed')),
  checksum text,
  products_received integer not null default 0,
  products_matched integer not null default 0,
  unmatched_products integer not null default 0,
  changed_rows integer not null default 0,
  result jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.compucash_sync_runs enable row level security;
drop policy if exists "Administrators read Compucash sync runs"
  on public.compucash_sync_runs;
create policy "Administrators read Compucash sync runs"
  on public.compucash_sync_runs for select to authenticated
  using ((select public.is_admin()));
drop policy if exists "Service role manages Compucash sync runs"
  on public.compucash_sync_runs;
create policy "Service role manages Compucash sync runs"
  on public.compucash_sync_runs for all to service_role
  using (true) with check (true);
create index if not exists compucash_sync_runs_created_idx
  on public.compucash_sync_runs(created_at desc);
