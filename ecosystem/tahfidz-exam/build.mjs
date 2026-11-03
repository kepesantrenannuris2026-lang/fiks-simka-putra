import fs from 'node:fs';import {build} from 'esbuild';
const out=process.env.NURIS_EXAM_OUT||'dist-cloudflare/ujian-tahfidz';fs.mkdirSync(out,{recursive:true});
await build({entryPoints:['ecosystem/tahfidz-exam/ui/app.ts'],bundle:true,format:'esm',splitting:true,outdir:out,minify:true,target:'es2022',chunkNames:'chunks/[name]-[hash]'});
for(const file of ['index.html','style.css'])fs.copyFileSync('ecosystem/tahfidz-exam/ui/'+file,out+'/'+file);
for(const file of ['engine.ts','quran-metadata.json'])fs.copyFileSync('ecosystem/tahfidz-exam/core/'+file,'ecosystem/functions/ujian-tahfidz/'+file);
console.log('Ujian Tahfidz built:',out);
