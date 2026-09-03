import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { parseCatalogueCorrection } from '../src/lib/wineCatalogueCorrection.js';
const require = createRequire(import.meta.url);
const swc = require('next/dist/build/swc'); await swc.loadBindings();
const { code } = await swc.transform(await readFile(new URL('../src/app/api/wines/[wineId]/route.js', import.meta.url), 'utf8'), { filename: 'route.js', jsc: { parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } });
function harness(responses, accessError, rpcError = null) {
  const queries = [];
  const calls = [];
  const admin = { from(table) {
    const record = { table, filters: [] }; queries.push(record);
    const query = { select() { return query; }, eq(k,v) { record.filters.push([k,v]); return query; }, neq() { return query; }, limit() { return query; }, update(value) { record.update=value; return query; }, maybeSingle() { assert.ok(responses.length); return Promise.resolve(responses.shift()); } }; return query;
  }, async rpc(name, args) { calls.push({name, args}); return {error: rpcError}; } };
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require(name) {
    if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
    if (name.includes('requireAdministrator')) return { requireAdministrator: async () => ({ admin, tenant: {organization:{id:'tenant-a'},property:{id:'property-a'}}, error: accessError }) };
    if (name.includes('tenantContext')) return { scopeTenantQuery: q => q.eq('organization_id','tenant-a').eq('property_id','property-a') };
    if (name.includes('wineCatalogueCorrection')) return { parseCatalogueCorrection };
    return {};
  } });
  return { queries, calls, retire: body => module.exports.DELETE({json:async()=>body},{params:Promise.resolve({wineId:'wine-a'})}), run: body => module.exports.PATCH({ json: async () => body }, { params: Promise.resolve({ wineId: 'wine-a' }) }) };
}
test('corrections require administrator access before database lookup', async () => {
  const h = harness([], { status:403, message:'Administrator required' });
  assert.equal((await h.run({producer:'Estate'})).status,403); assert.equal(h.queries.length,0);
});
test('foreign or missing wine cannot be edited', async () => {
  const h = harness([{data:null}]); assert.equal((await h.run({producer:'Estate'})).status,404); assert.equal(h.queries.length,1);
});
test('successful metadata correction scopes both lookup and write', async () => {
  const h = harness([{data:{id:'wine-a',sku:'W1'}},{data:{id:'wine-a'}}]); assert.equal((await h.run({producer:' Estate '})).status,200);
  assert.equal(h.queries[1].update.producer,'Estate');
  for (const q of h.queries) { assert.ok(q.filters.some(([k,v])=>k==='organization_id' && v==='tenant-a')); assert.ok(q.filters.some(([k,v])=>k==='property_id' && v==='property-a')); }
});
test('stock mutations and existing identifier reassignment are blocked', async () => {
  for (const body of [{quantity:'5'},{sku:'DIFFERENT'}]) { const h=harness([{data:{id:'wine-a',sku:'W1'}}]); assert.equal((await h.run(body)).status,400); assert.equal(h.queries.length,1); }
});
test('duplicate SKU is rejected without writing', async () => {
  const h=harness([{data:{id:'wine-a',sku:null}},{data:{id:'wine-b'}}]); assert.equal((await h.run({sku:'TAKEN'})).status,409); assert.equal(h.queries.some(q=>q.update),false);
});
test('retirement uses server tenant context, not client ownership claims', async () => {
  const h=harness([]); assert.equal((await h.retire({keepWineId:'wine-b',organization_id:'foreign'})).status,200);
  assert.equal(h.calls[0].args.p_organization_id,'tenant-a'); assert.equal(h.calls[0].args.p_property_id,'property-a'); assert.equal(h.queries.length,0);
});
test('retirement fails closed if migration is unavailable or stock guard rejects it', async () => {
  for(const [code,status] of [['PGRST202',503],['P0001',409]]) {const h=harness([],null,{code,message:'Stock exists'}); assert.equal((await h.retire({keepWineId:'wine-b'})).status,status); assert.equal(h.queries.length,0);}
});
test('retirement rejects self-selection and unauthorised requests', async () => {
  const h=harness([]); assert.equal((await h.retire({keepWineId:'wine-a'})).status,400);assert.equal(h.calls.length,0);
  const denied=harness([],{status:403,message:'Denied'});assert.equal((await denied.retire({keepWineId:'wine-b'})).status,403);assert.equal(denied.calls.length,0);
});
