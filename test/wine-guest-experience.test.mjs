import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
const source = await readFile(new URL('../src/components/menus/wine-views/StandardWineView.jsx', import.meta.url), 'utf8');
const { code } = await transform(source, { filename: 'StandardWineView.jsx', jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } });

function harness(theme = {}) {
  let cursor = 0;
  const states = [];
  const react = { useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], (value) => { states[index] = value; }]; }, useMemo(fn) { return fn(); }, useRef() { return { current: { scrollTo() {} } }; } };
  const module = { exports: {} };
  vm.runInNewContext(code, { exports: module.exports, module, require(name) {
    if (name === 'react') return react;
    if (name.endsWith('.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : key });
    if (name.includes('heroicons')) return { MagnifyingGlassIcon: 'icon', XMarkIcon: 'icon' };
    return require(name);
  } });
  return () => { cursor = 0; return module.exports.default({ menu: { name: 'Test cellar' }, experience: { theme }, previewMode: true, items: [
    { id: 'red', service_type: 'bottle', wines: { name: 'Red selection', wine_type: 'Red', price: 50 } },
    { id: 'white', service_type: 'glass', glass_price: 12, wines: { name: 'White selection', wine_type: 'White', price: 40 } },
  ] }); };
}
function nodes(root) { if (!root || typeof root !== 'object') return []; return [root, ...[root.props?.children].flat(Infinity).flatMap(nodes)]; }
function text(node) { if (typeof node === 'string' || typeof node === 'number') return String(node); if (!node || typeof node !== 'object') return ''; return [node?.props?.children].flat(Infinity).map(text).join(''); }
function button(tree, label) { return nodes(tree).find(n => n.type === 'button' && text(n).includes(label)); }

test('introduction filters carry through to the separate selection and back', () => {
  const render = harness();
  let tree = render();
  assert.equal(nodes(tree).some(n => n.type === 'main'), false);
  button(tree, 'Red').props.onClick();
  tree = render();
  assert.ok(text(tree).includes('1 wines in your selection'));
  button(tree, 'Show selection').props.onClick();
  tree = render();
  assert.ok(button(tree, 'Red selection'));
  assert.equal(button(tree, 'White selection'), undefined);
  button(tree, 'Introduction & filters').props.onClick();
  assert.ok(button(render(), 'Show selection'));
});
test('preview buttons never submit the surrounding studio form', () => {
  const render = harness();
  button(render(), 'Show selection').props.onClick();
  button(render(), 'Red selection').props.onClick();
  for (const node of nodes(render()).filter(n => n.type === 'button')) assert.equal(node.props.type, 'button');
});
test('custom typography, background and placement reach the guest renderer', () => {
  const tree = harness({ fontPairing: 'humanist', headerPlacement: 'right', backgroundStyle: 'gradient', backgroundColor: '#abcdef' })();
  assert.match(tree.props.style['--wine-font'], /Optima/);
  assert.equal(tree.props.style['--wine-bg'], '#abcdef');
  assert.match(tree.props.style.backgroundImage, /radial-gradient/);
  assert.match(tree.props.className, /right/);
});

const apiSource = await readFile(new URL('../src/app/api/wine-experiences/route.js', import.meta.url), 'utf8');
const apiCode = (await transform(apiSource, { filename: 'route.js', jsc: { parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } })).code;
function apiHarness(responses, accessError) {
  const queries = [];
  const admin = { from(table) {
    const record = { table, filters: [] }; queries.push(record);
    const result = () => { assert.ok(responses.length, 'unexpected database operation'); return Promise.resolve(responses.shift()); };
    const query = { select() { return query; }, eq(key, value) { record.filters.push([key, value]); return query; }, update(value) { record.update = value; return query; }, maybeSingle: result, then(resolve, reject) { return result().then(resolve, reject); } };
    return query;
  } };
  const module = { exports: {} };
  vm.runInNewContext(apiCode, { module, exports: module.exports, require(name) {
    if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
    if (name.includes('requireAdministrator')) return { requireAdministrator: async () => ({ admin, tenant: {}, error: accessError }) };
    if (name.includes('tenantContext')) return { scopeTenantQuery: (query) => query.eq('organization_id', 'tenant-a').eq('property_id', 'property-a') };
    if (name.includes('fetchAllRows')) return {};
    throw new Error(name);
  } });
  return { api: module.exports, queries };
}
const request = (body = {}) => ({ json: async () => body });
test('deletion rejects unauthenticated requests without querying customer data', async () => {
  const { api, queries } = apiHarness([], { status: 401, message: 'Authentication required' });
  assert.equal((await api.DELETE(request())).status, 401);
  assert.equal(queries.length, 0);
});
test('deletion fails closed when menu is outside the workspace or venue does not match', async () => {
  const first = apiHarness([{ data: null }]);
  assert.equal((await first.api.DELETE(request({ menuId: 'foreign' }))).status, 404);
  const second = apiHarness([{ data: { id: 'menu', slug: 'test' } }, { data: null }]);
  assert.equal((await second.api.DELETE(request({ menuId: 'menu', locationId: 'wrong' }))).status, 400);
  assert.ok(second.queries.every(q => !q.update));
});
test('deletion archives only the scoped experience, never inventory or curation', async () => {
  const { api, queries } = apiHarness([{ data: { id: 'menu', slug: 'test' } }, { data: { id: 'venue' } }, { data: { id: 'experience', theme: { fontPairing: 'modern' } } }, { error: null }]);
  assert.equal((await api.DELETE(request({ menuId: 'menu', locationId: 'venue' }))).status, 200);
  const writes = queries.filter(q => q.update);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].table, 'guest_experiences');
  assert.equal(writes[0].update.is_published, false);
  assert.equal(writes[0].update.theme.archived, true);
  assert.equal(writes[0].update.theme.fontPairing, 'modern');
  for (const q of queries) assert.ok(q.filters.some(([key, value]) => key === 'organization_id' && value === 'tenant-a'));
});
test('saving restores an archived design and persists new visual controls', async () => {
  const { api, queries } = apiHarness([{ data: { id: 'menu', slug: 'test' } }, { data: { id: 'venue' } }, { error: null }, { data: { id: 'experience' } }, { error: null }]);
  const response = await api.PATCH(request({ menuId: 'menu', locationId: 'venue', name: 'Test', theme: { archived: true, fontPairing: 'literary', headerPlacement: 'right', backgroundStyle: 'image', backgroundImage: 'https://example.com/bg.jpg' } }));
  assert.equal(response.status, 200);
  const theme = queries.find(q => q.table === 'guest_experiences' && q.update).update.theme;
  assert.equal(theme.archived, undefined);
  assert.equal(theme.fontPairing, 'literary');
  assert.equal(theme.headerPlacement, 'right');
  assert.equal(theme.backgroundImage, 'https://example.com/bg.jpg');
});
