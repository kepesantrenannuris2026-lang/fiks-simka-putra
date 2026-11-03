import fs from 'node:fs';import {build} from 'esbuild';
const out=process.env.NURIS_EXAM_OUT||'dist-cloudflare/ujian-tahfidz';fs.mkdirSync(out,{recursive:true});
await build({entryPoints:['ecosystem/tahfidz-exam/ui/app.ts'],bundle:true,format:'esm',splitting:true,outdir:out,minify:true,target:'es2022',chunkNames:'chunks/[name]-[hash]'});
for(const file of ['index.html','style.css'])fs.copyFileSync('ecosystem/tahfidz-exam/ui/'+file,out+'/'+file);
for(const file of ['engine.ts','quran-metadata.json'])fs.copyFileSync('ecosystem/tahfidz-exam/core/'+file,'ecosystem/functions/ujian-tahfidz/'+file);
console.log('Ujian Tahfidz built:',out);

const embedded='dist-cloudflare/mutabaah/ujian';fs.mkdirSync(embedded,{recursive:true});
let html=fs.readFileSync('ecosystem/tahfidz-exam/ui/index.html','utf8').replace('<script src="/nuris-appearance.js"></script>','').replace('<html lang="id">','<html lang="id" class="mutabaah-exam-embedded">').replace('<body>','<body class="mutabaah-exam-view">');
fs.writeFileSync(embedded+'/index.html',html);
fs.writeFileSync(out+'/index.html','<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Ujian semester · Mutabaah Tahfidz</title><script>location.replace("/mutabaah/ujian/"+location.search+location.hash)</script></head><body><a href="/mutabaah/?tool=ujian">Buka ujian semester di Mutabaah Tahfidz</a></body></html>');

const headersPath='dist-cloudflare/_headers';let headers=fs.readFileSync(headersPath,'utf8');if(!headers.includes('/mutabaah/ujian/*'))fs.writeFileSync(headersPath,headers+'\n/mutabaah/ujian/*\n  Cache-Control: no-cache\n');
