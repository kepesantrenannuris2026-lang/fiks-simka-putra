import fs from 'node:fs';import crypto from 'node:crypto';
// Adapt the preserved legacy navigation only in the Cloudflare package.
const root='dist-cloudflare';const htmlPath=root+'/mutabaah/index.html';let html=fs.readFileSync(htmlPath,'utf8');
const matched=html.match(/\/_next\/static\/chunks\/app\/(page-[^"?]+\.js)/);if(!matched)throw Error('Mutabaah page bundle not found');
const original=matched[1];let code=fs.readFileSync(root+'/_next/static/chunks/app/'+original,'utf8');
const needle='let M=a=>{("setor"!==c';
const replacement='let M=a=>{if(a==="ujian"){if(window.parent!==window)window.parent.postMessage({type:"nuris:navigate",app:"ujian-tahfidz"},location.origin);else location.assign("/ujian-tahfidz/");return;}("setor"!==c';
if(!code.includes('app:"ujian-tahfidz"')){if(code.split(needle).length!==2)throw Error('Legacy navigation changed; inspect before patching');code=code.replace(needle,replacement);}
const file='page-nuris-exam-'+crypto.createHash('sha256').update(code).digest('hex').slice(0,12)+'.js';fs.writeFileSync(root+'/_next/static/chunks/app/'+file,code);html=html.replaceAll(original,file);fs.writeFileSync(htmlPath,html);console.log(file);
