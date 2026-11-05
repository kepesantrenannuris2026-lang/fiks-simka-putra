import fs from 'node:fs';import {build} from 'esbuild';
const out='dist-cloudflare/mutabaah/rapor';fs.mkdirSync(out,{recursive:true});
await build({entryPoints:['ecosystem/semester-report/app.ts'],outdir:out,bundle:true,splitting:true,format:'esm',minify:true,target:'es2022',chunkNames:'chunks/[name]-[hash]'});
await build({entryPoints:['ecosystem/semester-report/targets.ts'],outfile:'dist-cloudflare/mutabaah/target-policy.js',bundle:true,format:'iife',globalName:'NurisTargets',minify:true,target:'es2022'});
for(const file of ['index.html','style.css'])fs.copyFileSync('ecosystem/semester-report/'+file,out+'/'+file);
const p='dist-cloudflare/_headers';let h=fs.readFileSync(p,'utf8');if(!h.includes('/mutabaah/rapor/*'))fs.writeFileSync(p,h+'\n/mutabaah/rapor/*\n  Cache-Control: no-cache\n');
let hh=fs.readFileSync(p,'utf8');if(!hh.includes('/mutabaah/rapor/chunks/*'))fs.writeFileSync(p,hh+'\n/mutabaah/rapor/chunks/*\n  Cache-Control: public, max-age=31536000, immutable\n');
console.log('Semester report built:',out);

for(const file of ['drive-schema.ts','drive-catalog.json'])fs.copyFileSync('ecosystem/semester-report/'+file,'ecosystem/functions/ujian-tahfidz/'+file);
