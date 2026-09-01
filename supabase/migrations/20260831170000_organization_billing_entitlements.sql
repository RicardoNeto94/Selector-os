-- Organization-level billing is the canonical commercial control plane.
-- Existing customers remain platform-managed until explicitly switched to Stripe.

alter table public.organization_platform_settings
  add column if not exists billing_mode text not null default 'platform_managed',
  add column if not exists billing_status text not null default 'not_configured',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false;

alter table public.organization_platform_settings
  drop constraint if exists organization_platform_settings_plan_check;
alter table public.organization_platform_settings
  add constraint organization_platform_settings_plan_check
  check (plan in ('pilot', 'starter', 'professional', 'hospitality_suite', 'enterprise'));

alter table public.organization_platform_settings
  drop constraint if exists organization_platform_settings_billing_mode_check;
alter table public.organization_platform_settings
  add constraint organization_platform_settings_billing_mode_check
  check (billing_mode in ('platform_managed', 'stripe'));

alter table public.organization_platform_settings
  drop constraint if exists organization_platform_settings_billing_status_check;
alter table public.organization_platform_settings
  add constraint organization_platform_settings_billing_status_check
  check (billing_status in (
    'not_configured', 'trialing', 'active', 'past_due', 'unpaid',
    'paused', 'canceled', 'incomplete', 'incomplete_expired'
  ));

create unique index if not exists organization_platform_settings_stripe_customer_uidx
  on public.organization_platform_settings(stripe_customer_id)
  where stripe_customer_id is not null;
create unique index if not exists organization_platform_settings_stripe_subscription_uidx
  on public.organization_platform_settings(stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists public.billing_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.billing_webhook_events enable row level security;
drop policy if exists "Service role manages billing webhook events" on public.billing_webhook_events;
create policy "Service role manages billing webhook events"
  on public.billing_webhook_events for all to service_role using (true) with check (true);

-- Bombay Club and all previously provisioned workspaces keep their current
-- plan/module assignment without requiring an immediate Stripe subscription.
update public.organization_platform_settings
set billing_mode = coalesce(billing_mode, 'platform_managed'),
    billing_status = coalesce(billing_status, 'not_configured'),
    updated_at = now();

-- Make the newly added columns immediately visible to PostgREST clients.
notify pgrst, 'reload schema';
