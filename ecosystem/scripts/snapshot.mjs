import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const manifest=JSON.parse(fs.readFileSync('ecosystem/mutabaah-snapshot.json','utf8'));
function original(bytes,file){let data=bytes;if(file==='index.html')data=Buffer.from(bytes.toString().replace('<script src="/nuris-launcher.js" defer></script>',''));return data;}
for(let i=0;i<manifest.files.length;i+=5)await Promise.all(manifest.files.slice(i,i+5).map(async f=>{
 const target=path.join('ecosystem/mutabaah',f.path);if(fs.existsSync(target)&&crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')===f.sha256)return;
 for(const origin of [manifest.deploy,manifest.source]){
  try{const res=await fetch(origin+'/'+f.path,{signal:AbortSignal.timeout(25000)});if(!res.ok)continue;const data=original(Buffer.from(await res.arrayBuffer()),f.path);if(crypto.createHash('sha256').update(data).digest('hex')!==f.sha256)continue;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);return;}catch{}
 }
 throw new Error('Snapshot Mutabaah berubah atau tidak tersedia: '+f.path+'. Perbarui manifest setelah meninjau versi Mutabaah.');
}));
