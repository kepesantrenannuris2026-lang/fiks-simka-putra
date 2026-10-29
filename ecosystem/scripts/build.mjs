import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {Resvg} from '@resvg/resvg-js';
await import('./snapshot.mjs');
const root=process.cwd(),out=path.join(root,'dist-ekosistem');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const build=spawnSync('npm',['run','build'],{stdio:'inherit',env:{...process.env,VITE_KEPESANTRENAN_PORTAL:'true',VITE_APP_ENVIRONMENT:'PUTRA'}});if(build.status!==0)process.exit(build.status||1);
fs.cpSync('dist',path.join(out,'simka'),{recursive:true});
const putriBuild=spawnSync('npm',['run','build'],{stdio:'inherit',env:{...process.env,VITE_KEPESANTRENAN_PORTAL:'true',VITE_APP_ENVIRONMENT:'PUTRI'}});if(putriBuild.status!==0)process.exit(putriBuild.status||1);fs.cpSync('dist',path.join(out,'simka-putri'),{recursive:true});
fs.cpSync('public',out,{recursive:true});
fs.cpSync('ecosystem/mutabaah',out,{recursive:true});fs.cpSync('ecosystem/portal',out,{recursive:true});fs.mkdirSync(path.join(out,'mutabaah'),{recursive:true});
let mutHtml=fs.readFileSync('ecosystem/mutabaah/index.html','utf8').replace('</body>','<script src="/nuris-launcher.js" defer></script></body>');
fs.writeFileSync(path.join(out,'mutabaah/index.html'),mutHtml);fs.copyFileSync('ecosystem/nuris-launcher.js',path.join(out,'nuris-launcher.js'));fs.copyFileSync('ecosystem/portal/index.html',path.join(out,'index.html'));
// Only the API address changes in the preserved Mutabaah bundle. Its forms, calculations and data flow stay intact.
const oldApi='https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/api';const newApi='https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/kepesantrenan/mutabaah';
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.js')){const s=fs.readFileSync(p,'utf8');if(s.includes(oldApi))fs.writeFileSync(p,s.replaceAll(oldApi,newApi));}}}walk(path.join(out,'_next'));
const logo=fs.readFileSync('ecosystem/portal/logo.svg');for(const size of [192,512])fs.writeFileSync(path.join(out,`icon-${size}.png`),new Resvg(logo,{fitTo:{mode:'width',value:size}}).render().asPng());
const legacy=path.join(root,'dist-mutabaah');fs.rmSync(legacy,{recursive:true,force:true});fs.cpSync('ecosystem/mutabaah',legacy,{recursive:true});
let html=fs.readFileSync(path.join(legacy,'index.html'),'utf8');html=html.replace('</body>','<script src="/nuris-launcher.js" defer></script></body>');fs.writeFileSync(path.join(legacy,'index.html'),html);fs.copyFileSync('ecosystem/nuris-launcher.js',path.join(legacy,'nuris-launcher.js'));
console.log('Portal, Mutabaah dan SIMKA siap di dist-ekosistem; navigasi situs lama di dist-mutabaah');

// Shared Nuris identity, preserving the original transparent 1080px master and crisp SVG.
for(const target of [out,legacy]){
 fs.copyFileSync('public/logo-nuris.svg',path.join(target,'nuris-mark.svg'));
 fs.copyFileSync('public/logo-nuris.png',path.join(target,'logo-mark.png'));
}
for(const target of [out,path.join(out,'simka'),path.join(out,'simka-putri')]){
 fs.copyFileSync('public/logo-nuris.svg',path.join(target,'favicon-simka.svg'));
 fs.copyFileSync('public/logo-nuris.svg',path.join(target,'favicon.svg'));
 for(const [size,file] of [[16,'favicon-simka-16x16.png'],[32,'favicon-simka-32x32.png'],[180,'apple-touch-icon.png']])fs.writeFileSync(path.join(target,file),new Resvg(logo,{fitTo:{mode:'width',value:size}}).render().asPng());
}

fs.mkdirSync(path.join(out,'yaumiyyah'),{recursive:true});fs.copyFileSync(path.join(out,'simka/index.html'),path.join(out,'yaumiyyah/index.html'));

// One glass navigation implementation across all applications, including the preserved Mutabaah bundle.
for(const target of [out,legacy])fs.copyFileSync('ecosystem/liquid-glass.js',path.join(target,'liquid-glass.js'));
for(const file of [path.join(out,'index.html'),path.join(out,'mutabaah/index.html'),path.join(out,'simka/index.html'),path.join(out,'simka-putri/index.html'),path.join(out,'yaumiyyah/index.html'),path.join(legacy,'index.html')]){
 let source=fs.readFileSync(file,'utf8');source=source.replace('</body>','<script src="/liquid-glass.js" defer></script></body>');fs.writeFileSync(file,source);
}
