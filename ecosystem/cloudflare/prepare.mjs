import fs from 'node:fs';import path from 'node:path';
const raw=process.env.NURIS_PUBLIC_ORIGIN;if(!raw)throw Error('Set NURIS_PUBLIC_ORIGIN to the approved Cloudflare origin.');
const u=new URL(raw);if(u.protocol!=='https:'||u.origin!==raw)throw Error('Use an HTTPS origin without trailing slash, query or path.');
const out='dist-cloudflare';fs.rmSync(out,{recursive:true,force:true});fs.cpSync('dist-ekosistem',out,{recursive:true});
// Netlify's wildcard rewrites would intercept JS/CSS on Cloudflare. The Worker handles deep routes.
fs.rmSync(path.join(out,'_redirects'),{force:true});
const launcher=path.join(out,'nuris-launcher.js');let s=fs.readFileSync(launcher,'utf8');s=s.replace("const PORTAL = 'https://kepesantrenannuris.netlify.app/';",`const PORTAL = ${JSON.stringify(u.origin+'/')};`);s=s.replace("location.hostname === 'kepesantrenannuris.netlify.app'",`location.origin === ${JSON.stringify(u.origin)}`);fs.writeFileSync(launcher,s);
// The legacy Netlify package is deliberately untouched until the new app is verified.
fs.writeFileSync(path.join(out,'_headers'),fs.readFileSync(path.join(out,'_headers'),'utf8')+'\n/simka-putri/*\n  Cache-Control: no-cache\n/yaumiyyah/*\n  Cache-Control: no-cache\n/nuris-appearance.js\n  Cache-Control: no-cache\n');
fs.appendFileSync(path.join(out,'_headers'),'\n/nuris-appearance.css\n  Cache-Control: no-cache\n/simka/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/simka-putri/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/_next/static/*\n  Cache-Control: public, max-age=31536000, immutable\n/fonts/*\n  Cache-Control: public, max-age=604800\n');
console.log('Cloudflare assets prepared; production publication still requires account approval, CORS and backup verification.');
