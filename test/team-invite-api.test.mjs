import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const swc = require('next/dist/build/swc');
await swc.loadBindings();
const { code } = await swc.transform(await readFile(new URL('../src/app/api/team/invite/route.js', import.meta.url), 'utf8'), { filename: 'route.js', jsc: { parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } });
function harness(tenant, error = null, foreignVenue = false) {
  const writes = []; let invitations = 0;
  const admin = {
    auth: { admin: { async inviteUserByEmail() { invitations++; return { data: { user: { id: 'new-user' } } }; } } },
    from(table) {
      const q = {
        select() { return q; }, eq() { return q; }, in() { return q; },
        async maybeSingle() { return { data: table === 'roles' ? { id: 'role', slug: 'administrator', name: 'Administrator' } : { first_name: 'Owner' } }; },
        async upsert(row) { writes.push({ table, row }); return { error: null }; },
        then(resolve, reject) { return Promise.resolve({ data: foreignVenue ? [] : [{ id: 'venue' }] }).then(resolve, reject); },
      }; return q;
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, process: { env: {} }, console, require(name) {
    if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
    if (name.includes('requireAdministrator')) return { requireAdministrator: async () => ({ admin, tenant, error, user: { id: 'owner' } }) };
    if (name.includes('roleDefinitions')) return { getTenantRoleForAccessRole: () => 'administrator' };
    if (name.includes('tenantContext')) return { scopeTenantQuery: q => q, tenantWriteFields: t => ({ organization_id: t.organization.id, property_id: t.property.id }) };
    throw new Error(name);
  } });
  return { writes, get invitations() { return invitations; }, run: () => module.exports.POST({ json: async () => ({ email: 'test@example.com', firstName: 'Test', lastName: 'User', roleId: 'role', locationIds: ['venue'], organization_id: 'attacker-org', property_id: 'attacker-property' }) }) };
}
const tenant = { source: 'membership', organization: { id: 'org-a' }, property: { id: 'property-a' } };
test('invitation role and venue writes carry authenticated tenant IDs, not request IDs', async () => {
  const h = harness(tenant); assert.equal((await h.run()).status, 200);
  const role = h.writes.find(w => w.table === 'user_roles').row;
  assert.equal(role.organization_id, 'org-a'); assert.equal(role.property_id, 'property-a');
  assert.equal(role.user_id, 'new-user');
  const venue = h.writes.find(w => w.table === 'user_venue_access').row[0];
  assert.equal(venue.organization_id, 'org-a'); assert.equal(venue.property_id, 'property-a');
});
test('missing workspace or administrator access rejects before sending an invitation', async () => {
  for (const [context, error] of [[null, null], [{ ...tenant, property: null }, null], [{ ...tenant, source: 'legacy' }, null], [tenant, { status: 403, message: 'Denied' }]]) {
    const h = harness(context, error); assert.equal((await h.run()).status, 403); assert.equal(h.invitations, 0); assert.equal(h.writes.length, 0);
  }
});
test('foreign venue rejects before email or writes', async () => {
  const h = harness(tenant, null, true); assert.equal((await h.run()).status, 400); assert.equal(h.invitations, 0); assert.equal(h.writes.length, 0);
});
