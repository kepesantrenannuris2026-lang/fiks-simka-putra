import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {gunzipSync} from 'node:zlib';
// Public, verified application assets only. No runtime data or credentials.
// Builds no longer need Netlify to remain available.
const manifest=JSON.parse(fs.readFileSync('ecosystem/mutabaah-snapshot.json','utf8'));
let archive;
for(const f of manifest.files){
 const target=path.join('ecosystem/mutabaah',f.path);
 const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 if(fs.existsSync(target)&&hash(fs.readFileSync(target))===f.sha256)continue;
 archive??=JSON.parse(gunzipSync(fs.readFileSync('ecosystem/mutabaah-public-snapshot.json.gz')).toString('utf8'));
 if(path.isAbsolute(f.path)||f.path.split('/').includes('..'))throw Error('Invalid snapshot path');
 const bytes=Buffer.from(archive[f.path]||'','base64');
 if(hash(bytes)!==f.sha256)throw Error('Snapshot integrity failure: '+f.path);
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
}
