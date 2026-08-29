-- Register the existing Bombay Club workspace in the platform control plane.
-- New customers receive this row atomically through platform_provision_customer.

insert into public.organization_platform_settings (
  organization_id,
  plan,
  inventory_mode,
  enabled_modules,
  onboarding_status,
  internal_notes,
  updated_at
)
select
  organization.id,
  'professional',
  'api',
  '{"wine":true,"dining":true,"spa":true,"guest_experience":true}'::jsonb,
  'live',
  'Existing Bombay Club deployment backfilled when the Vaxeron Control Centre was introduced.',
  now()
from public.organizations as organization
where organization.slug = 'bombay-club'
on conflict (organization_id) do update
set plan = excluded.plan,
    inventory_mode = excluded.inventory_mode,
    enabled_modules = excluded.enabled_modules,
    onboarding_status = excluded.onboarding_status,
    internal_notes = excluded.internal_notes,
    updated_at = now();
