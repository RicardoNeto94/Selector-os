create table if not exists public.wine_menu_servings (
  id uuid primary key default gen_random_uuid(),
  wine_menu_item_id uuid not null references public.wine_menu_items(id) on delete cascade,
  compucash_product_id text not null,
  serving_cl numeric not null check (serving_cl in (6, 12, 15)),
  price numeric,
  is_active boolean not null default true,
  source text not null default 'manual',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wine_menu_item_id, compucash_product_id)
);

create index if not exists wine_menu_servings_menu_item_idx
  on public.wine_menu_servings (wine_menu_item_id);

alter table public.wine_menu_servings enable row level security;

drop policy if exists "Public reads active wine menu servings" on public.wine_menu_servings;
create policy "Public reads active wine menu servings"
  on public.wine_menu_servings
  for select
  to anon, authenticated
  using (is_active = true);
