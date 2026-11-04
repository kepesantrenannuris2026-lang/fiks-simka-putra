import fs from 'node:fs';import path from 'node:path';
const out='dist-cloudflare';
for(const [name,source] of Object.entries({'index.html':'baseline-index.html','portal.css':'baseline-portal.css','apps.js':'exam-apps.js','portal.js':'exam-portal.js','nuris-launcher.js':'exam-launcher.js','nuris-appearance.js':'baseline-nuris-appearance.js','nuris-appearance.css':'baseline-nuris-appearance.css'}))fs.copyFileSync('ecosystem/cloudflare/'+source,path.join(out,name));
const headers=path.join(out,'_headers');let h=fs.readFileSync(headers,'utf8');if(!h.includes('/ujian-tahfidz/*'))h+='\n/ujian-tahfidz/*\n  Cache-Control: no-cache\n/ujian-tahfidz/chunks/*\n  Cache-Control: public, max-age=31536000, immutable\n';fs.writeFileSync(headers,h);
console.log('Cloudflare exam navigation enabled; Netlify output was not changed.');

await import('./route-semester-exam.mjs');
await import('../semester-report/build.mjs');
await import('./route-semester-report.mjs');
