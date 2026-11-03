import fs from 'node:fs';import path from 'node:path';
const out='dist-cloudflare';
for(const [name,source] of Object.entries({'apps.js':'exam-apps.js','portal.js':'exam-portal.js','nuris-launcher.js':'exam-launcher.js','nuris-appearance.js':'baseline-nuris-appearance.js','nuris-appearance.css':'baseline-nuris-appearance.css'}))fs.copyFileSync('ecosystem/cloudflare/'+source,path.join(out,name));
const file=path.join(out,'mutabaah/index.html');let html=fs.readFileSync(file,'utf8');if(!html.includes('/ujian-tahfidz/mutabaah-link.js'))html=html.replace('</body>','<script defer src="/ujian-tahfidz/mutabaah-link.js"></script></body>');fs.writeFileSync(file,html);
fs.copyFileSync('ecosystem/tahfidz-exam/ui/mutabaah-link.js',path.join(out,'ujian-tahfidz/mutabaah-link.js'));
const headers=path.join(out,'_headers');let h=fs.readFileSync(headers,'utf8');if(!h.includes('/ujian-tahfidz/*'))h+='\n/ujian-tahfidz/*\n  Cache-Control: no-cache\n/ujian-tahfidz/chunks/*\n  Cache-Control: public, max-age=31536000, immutable\n';fs.writeFileSync(headers,h);
console.log('Cloudflare exam navigation enabled; Netlify output was not changed.');
