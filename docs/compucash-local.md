# Compucash local preview

The current integration is intentionally read-only. It authenticates to Compucash,
loads mapped stores and physical wine products, matches exact Vaxeron identifiers,
and returns a preview. It never updates `wine_inventory`.

Configure these server-only values in `.env.local` (never prefix them with
`NEXT_PUBLIC_`):

```text
COMPUCASH_CLIENT_ID=...
COMPUCASH_CLIENT_SECRET=...
COMPUCASH_BASE_URL=https://www.compucash5.com/cc5partners
COMPUCASH_TOKEN_URL=https://www.compucash5.com/IdentityServer/connect/token
COMPUCASH_SYNC_WRITES_ENABLED=false
```

Start Vaxeron locally with `npm run dev`, sign in as an administrator, then send a
POST request to `/api/compucash/preview`. The response contains counts, missing or
renamed stores, identifier conflicts, unmatched products, and a bounded accepted
stock sample. `writesPerformed` must remain `false`.

The preview also returns `syncCandidate.checksum`. The protected sync endpoint is
`POST /api/compucash/sync`, but it rejects every request while
`COMPUCASH_SYNC_WRITES_ENABLED` is not exactly `true`. When eventually enabled,
the caller must submit the most recent checksum as `confirmChecksum`. The server
then fetches Compucash again, revalidates every mapped store, minimum product count,
match ratio and identifier conflicts, and rejects the sync if the checksum changed.

Do not enable writes while local Vaxeron points at production Supabase. Use a local
or dedicated development database, verify the generated movements and guest menus,
then take a database backup before the first production synchronization.

## Automatic production sync

Vercel calls `GET /api/cron/compucash` every 30 minutes. The route requires the
Vercel-provided `Authorization: Bearer CRON_SECRET` header and reruns all snapshot
safety checks before writing. Apply the `compucash_sync_runs` migration, then set
these production-only environment variables in Vercel:

```text
CRON_SECRET=<random value of at least 16 characters>
COMPUCASH_SYNC_WRITES_ENABLED=true
COMPUCASH_MAX_CHANGED_ROWS=3000
```

Keep the write flag false in local and preview environments. Vercel registers cron
jobs only from production deployments. Every scheduled attempt is recorded in
`compucash_sync_runs`; the Wine Cellar header displays its latest result.

Run `npm run test:compucash` to verify filtering, fractional quantities, exact
matching, and conflict rejection. Inventory application should only be added after
the preview has been reconciled and a database snapshot/rollback procedure exists.
