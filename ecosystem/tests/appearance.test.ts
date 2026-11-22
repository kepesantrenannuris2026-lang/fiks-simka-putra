import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
// Fitur siang/malam dihapus: skrip selalu memaksa mode terang dan menimpa pilihan gelap lama.
function harness(stored: Record<string, string> = {}) {
  const values = new Map(Object.entries(stored)), classes = new Set(['dark']);
  const root: any = { dataset: {}, style: {}, classList: { remove: (k: string) => classes.delete(k), add: (k: string) => classes.add(k) } };
  const document: any = { documentElement: root, body: { classList: root.classList }, getElementById: () => null, addEventListener() {} };
  const context: any = { document, localStorage: { getItem: (k: string) => values.get(k), setItem: (k: string, v: string) => values.set(k, v) }, addEventListener() {}, dispatchEvent() {}, CustomEvent: class {} };
  context.window = context;
  vm.runInNewContext(readFileSync('ecosystem/nuris-appearance.js', 'utf8'), context);
  return { context, root, values, classes };
}
test('selalu terang, kelas dark dihapus', () => { const h = harness(); assert.equal(h.root.dataset.nurisTheme, 'light'); assert.equal(h.classes.has('dark'), false); assert.equal(h.context.NurisAppearance.mode, 'light'); });
test('pilihan gelap lama ditimpa menjadi terang', () => { const h = harness({ 'nuris-appearance': 'dark', simka_theme: 'dark' }); assert.equal(h.values.get('nuris-appearance'), 'light'); assert.equal(h.values.get('simka_theme'), 'light'); });
test('change() tidak bisa mengaktifkan gelap', () => { const h = harness(); h.context.NurisAppearance.change('dark'); assert.equal(h.root.dataset.nurisTheme, 'light'); });
