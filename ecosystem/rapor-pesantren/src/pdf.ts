// PDF tanpa pustaka luar: tiap halaman rapor (HTML) digambar ke kanvas lewat SVG foreignObject, lalu disusun sebagai JPEG dalam PDF.
import { RAPOR_CSS, pageSize } from './rapor';

let fontCss: Promise<string> | null = null;
const toDataURL = (blob: Blob) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = no; r.readAsDataURL(blob); });
function fonts() {
  return fontCss ??= fetch('/simka/fonts/nuris-jakarta.woff2').then((r) => (r.ok ? r.blob() : Promise.reject())).then(toDataURL)
    .then((u) => `@font-face{font-family:NurisJakarta;src:url(${u}) format("woff2");font-weight:100 900}`).catch(() => '');
}

async function pageToJpeg(el: HTMLElement, paper: 'A4' | 'F4', scale = 2.2): Promise<{ bytes: Uint8Array; w: number; h: number }> {
  const { w, h } = pageSize(paper);
  const pxW = Math.round((w / 25.4) * 96), pxH = Math.round((h / 25.4) * 96);
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[data-edit]').forEach((n) => n.removeAttribute('data-edit'));
  clone.querySelectorAll('.rp-kosong').forEach((n) => n.remove());
  clone.classList.remove('rp-auto');
  const xhtml = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${await fonts()}${RAPOR_CSS}</style>${xhtml}</div></foreignObject></svg>`;
  const img = new Image();
  img.decoding = 'sync';
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await new Promise<void>((ok, no) => { img.onload = () => ok(); img.onerror = () => no(new Error('Gagal menggambar halaman.')); img.src = url; });
  await new Promise((r) => setTimeout(r, 30));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(pxW * scale); canvas.height = Math.round(pxH * scale);
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height);
  g.scale(scale, scale); g.drawImage(img, 0, 0, pxW, pxH);
  const blob: Blob = await new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error('Kanvas kosong'))), 'image/jpeg', 0.9));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), w: canvas.width, h: canvas.height };
}

function buildPdf(pages: { bytes: Uint8Array; w: number; h: number }[], paper: 'A4' | 'F4') {
  const { w, h } = pageSize(paper);
  const W = (w / 25.4) * 72, H = (h / 25.4) * 72;
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = []; const offsets: number[] = []; let len = 0;
  const push = (b: Uint8Array | string) => { const u = typeof b === 'string' ? enc.encode(b) : b; chunks.push(u); len += u.length; };
  const obj = (n: number, body: (string | Uint8Array)[]) => { offsets[n] = len; push(`${n} 0 obj\n`); body.forEach(push); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const n = pages.length, kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  obj(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
  obj(2, [`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`]);
  pages.forEach((p, i) => {
    const pg = 3 + i * 3, im = pg + 1, ct = pg + 2;
    const content = `q ${W.toFixed(2)} 0 0 ${H.toFixed(2)} 0 0 cm /Im0 Do Q`;
    obj(pg, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>`]);
    obj(im, [`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`, p.bytes, '\nendstream']);
    obj(ct, [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]);
  });
  const total = 3 + n * 3; const xref = len;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) push(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

export async function unduhPdf(els: HTMLElement[], paper: 'A4' | 'F4', nama: string, progress?: (i: number, n: number) => void) {
  const pages = [];
  for (let i = 0; i < els.length; i++) { progress?.(i, els.length); pages.push(await pageToJpeg(els[i], paper)); }
  const blob = buildPdf(pages, paper);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nama.replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.pdf';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
