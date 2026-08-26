# Vaxeron multi-tenant rollout

This rollout keeps the current Burman installation working while Vaxeron gains
organization, property, integration and guest-experience boundaries.

## Production safety rules

- Apply migrations in filename order. Do not apply the RLS enforcement file
  before the foundation and Burman backfill have been verified.
- Take a Supabase database backup before the backfill and enforcement stages.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, Compucash credentials and `CRON_SECRET`
  server-only. Never prefix them with `NEXT_PUBLIC_`.
- Vercel Preview and Development must use
  `COMPUCASH_SYNC_WRITES_ENABLED=false`. Only Production may enable writes.
- Guest hostnames are public and read-only. Dashboard and operational API paths
  return 404 on guest hosts, and every non-read HTTP method is rejected there.

## Supabase sequence

1. Apply `20260823180000_multi_tenant_foundation.sql`.
2. Confirm the current Burman dashboard, guest PWAs and Compucash cron still
   work. This migration is additive and does not change existing rows.
3. Apply `20260826120000_burman_tenant_backfill.sql`.
4. Apply `20260826121500_burman_guest_experiences.sql`.
5. Run `npm run audit:tenancy`. It must report `success: true` before the next
   step.
6. Verify the two current accounts have the intended organization roles.
7. Apply `20260826123000_integration_secret_access.sql` only after credentials
   have been moved into Supabase Vault and the connection record references the
   Vault secret.
8. Apply `20260826130000_tenant_rls_enforcement.sql`.
9. Run the audit again, sign in as every role, and verify cross-tenant reads and
   writes are denied before onboarding a second customer.

## Vercel configuration

The application middleware is the single hostname-routing boundary. Do not add
catch-all `/(.*)` rewrites for guest domains in Vercel; they can swallow PWA
manifests, static assets and API routes.

Production domains currently registered by the application:

- `burman.vaxeron.com`
- `spa.vaxeron.com`
- `shangshi.vaxeron.com`
- `koyo.vaxeron.com`
- `foxden.vaxeron.com`

Every named domain should point to the same Production Vercel project. A future
wildcard `*.vaxeron.com` may remove the manual DNS step, but a hostname must
still have a published `guest_experiences` record before it can serve customer
content.

Environment scopes:

| Variable | Production | Preview | Development |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production project | Non-production project preferred | Local/non-production preferred |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon key | Matching preview key | Matching local key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production server secret | Matching preview secret | Matching local secret |
| `COMPUCASH_SYNC_WRITES_ENABLED` | `true` after verification | `false` | `false` |
| `COMPUCASH_CLIENT_SECRET` | Server secret | Test credential only | Test credential only |
| `CRON_SECRET` | Server secret | Separate preview value | Separate local value |
| `OPENAI_API_KEY` | Optional server secret | Separate capped key | Separate capped key |

Changing a Vercel environment variable requires a new deployment before the
running application receives it.

## Second-customer acceptance test

- A new owner provisions one organization and one property.
- Their records contain only their organization/property IDs.
- Burman users cannot read or mutate the new customer's records, and vice versa.
- Their Compucash/POS connection reads credentials only from their own
  `integration_connections` record.
- Their public PWA returns only published guest fields and positive availability.
- Their guest hostname returns 404 for `/dashboard` and operational API paths.
- Preview deployments cannot write inventory to production.
