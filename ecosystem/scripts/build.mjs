import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {Resvg} from '@resvg/resvg-js';
await import('./snapshot.mjs');
const root=process.cwd(),out=path.join(root,'dist-ekosistem');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const build=spawnSync('npm',['run','build'],{stdio:'inherit',env:{...process.env,VITE_KEPESANTRENAN_PORTAL:'true'}});if(build.status!==0)process.exit(build.status||1);
fs.cpSync('dist',path.join(out,'simka'),{recursive:true});fs.cpSync('public',out,{recursive:true});
fs.cpSync('ecosystem/mutabaah',out,{recursive:true});fs.cpSync('ecosystem/portal',out,{recursive:true});fs.mkdirSync(path.join(out,'mutabaah'),{recursive:true});
fs.copyFileSync('ecosystem/mutabaah/index.html',path.join(out,'mutabaah/index.html'));fs.copyFileSync('ecosystem/portal/index.html',path.join(out,'index.html'));
// Only the API address changes in the preserved Mutabaah bundle. Its forms, calculations and data flow stay intact.
const oldApi='https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/api';const newApi='https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/kepesantrenan/mutabaah';
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.js')){const s=fs.readFileSync(p,'utf8');if(s.includes(oldApi))fs.writeFileSync(p,s.replaceAll(oldApi,newApi));}}}walk(path.join(out,'_next'));
const logo=fs.readFileSync('ecosystem/portal/logo.svg');for(const size of [192,512])fs.writeFileSync(path.join(out,`icon-${size}.png`),new Resvg(logo,{fitTo:{mode:'width',value:size}}).render().asPng());
const legacy=path.join(root,'dist-mutabaah');fs.rmSync(legacy,{recursive:true,force:true});fs.cpSync('ecosystem/mutabaah',legacy,{recursive:true});
let html=fs.readFileSync(path.join(legacy,'index.html'),'utf8');html=html.replace('</body>','<script src="/nuris-launcher.js" defer></script></body>');fs.writeFileSync(path.join(legacy,'index.html'),html);fs.copyFileSync('ecosystem/nuris-launcher.js',path.join(legacy,'nuris-launcher.js'));
console.log('Portal, Mutabaah dan SIMKA siap di dist-ekosistem; navigasi situs lama di dist-mutabaah');
