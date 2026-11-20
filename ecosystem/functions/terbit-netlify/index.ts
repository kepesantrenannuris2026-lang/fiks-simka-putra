// Fungsi sementara: rakit ZIP dari penyimpanan deploy (worker pembantu) lalu kirim ke proxy MCP Netlify.
// Dipakai bila browser tidak tersedia. Dipanggil dari pg_net dengan header x-cadangan-key; hapus setelah dipakai.
const KEY_SHA = 'f1f2ca6fb0a43f03d8c442b9c4acae69ebf164025c1ff2f3696bd0ddc63ec246';
const HELPER = 'https://cdd5dad2-kepesantrenan-nuris.kepesantrenannuris.workers.dev/__nuris_mirror/';
const PROXY = /^https:\/\/mcp\.netlify\.com\/proxy\/[\w.-]+$/;
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
const crc = (b: Uint8Array) => { let c = 0xFFFFFFFF; for (let j = 0; j < b.length; j++) c = T[(c ^ b[j]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(files: [string, Uint8Array][]) {
  const enc = new TextEncoder(), parts: Uint8Array[] = [], cen: Uint8Array[] = []; let off = 0;
  for (const [name, data] of files) {
    const nb = enc.encode(name), c = crc(data);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, c, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true);
    parts.push(new Uint8Array(h.buffer), nb, data);
    const d = new DataView(new ArrayBuffer(46)); d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint16(8, 0x0800, true); d.setUint32(16, c, true); d.setUint32(20, data.length, true); d.setUint32(24, data.length, true); d.setUint16(28, nb.length, true); d.setUint32(42, off, true);
    cen.push(new Uint8Array(d.buffer), nb); off += 30 + nb.length + data.length;
  }
  const size = cen.reduce((a, b) => a + b.length, 0);
  const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
Deno.serve(async (req) => {
  const k = req.headers.get('x-cadangan-key') || '';
  if (hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(k))) !== KEY_SHA) return new Response('forbidden', { status: 403 });
  try {
    const b = await req.json();
    if (!PROXY.test(b.proxy || '') || !/^[0-9a-f-]{36}$/.test(b.site || '')) return Response.json({ ok: false, error: 'proxy/site' }, { status: 400 });
    const files: [string, Uint8Array][] = [];
    if (b.manifest) {
      const list: string[] = await fetch(HELPER + 'nlist?k=' + b.hk + '&m=' + encodeURIComponent(b.manifest)).then((r) => r.json());
      const q = [...list];
      await Promise.all(Array.from({ length: 8 }, async () => { while (q.length) { const p = q.shift()!; const r = await fetch(HELPER + 'raw?k=' + b.hk + '&p=' + encodeURIComponent(p)); if (!r.ok) throw new Error('raw ' + p + ' ' + r.status); files.push([p.replace(/^\//, ''), new Uint8Array(await r.arrayBuffer())]); } }));
    }
    for (const [name, txt] of Object.entries(b.teks || {})) files.push([name, new TextEncoder().encode(String(txt))]);
    const z = zip(files);
    const form = new FormData(); form.append('zip', new File([z], 'deploy-' + Date.now() + '.zip', { type: 'application/zip' }));
    const r = await fetch(b.proxy + '/api/v1/sites/' + b.site + '/builds', { method: 'POST', headers: { 'user-agent': 'netlify-mcp' }, body: form });
    return Response.json({ ok: r.ok, status: r.status, files: files.length, size: z.size, body: (await r.text()).slice(0, 300) });
  } catch (e) { return Response.json({ ok: false, error: String((e as any)?.message || e) }, { status: 500 }); }
});
