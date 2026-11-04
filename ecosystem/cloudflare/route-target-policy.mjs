import fs from 'node:fs';import crypto from 'node:crypto';
const root='dist-cloudflare',path=root+'/mutabaah/index.html';let html=fs.readFileSync(path,'utf8');const old=html.match(/\/_next\/static\/chunks\/app\/(page-[^"?]+\.js)/)?.[1];if(!old)throw Error('Mutabaah bundle missing');let code=fs.readFileSync(root+'/_next/static/chunks/app/'+old,'utf8');
if(!code.includes('function NurisTargetRules(){')){
 const helper='function NurisTargetRules(){return(0,s.jsxs)("aside",{className:"rounded-2xl border border-line bg-white p-4 text-sm",children:[(0,s.jsx)("b",{children:"Target semester dan tahunan"}),(0,s.jsx)("p",{className:"mt-1 text-muted",children:window.NurisTargets.TARGET_RULES})]})}';
 const start=code.indexOf('function ei(){');if(start<0)throw Error('Dashboard component changed');code=code.slice(0,start)+helper+code.slice(start);
 for(const name of ['ei','tp']){
  const start=code.indexOf('function '+name+'(){');const needle='return(0,s.jsxs)("div",{className:"space-y-'+(name==='ei'?5:4)+'",children:[';const at=code.indexOf(needle,start);
  if(at<0||at-start>14000)throw Error('Inspect '+name+' before changing target rules');
  code=code.slice(0,at)+code.slice(at).replace(needle,needle+'(0,s.jsx)(NurisTargetRules,{}),');
 }
 code=code.replace('Semester 1–5: 1 juz (20 halaman) per semester untuk reguler, 2 juz (40 halaman) untuk program khusus (PK).','Reguler: 1 juz per semester dan 2 juz per tahun. Semester pertama kelas 7/10 baru wajib lulus Iqro/Tahsin dan menuntaskan Juz 30. Tahfidz/PK: semester pertama lulus Iqro/Tahsin dan 2 juz; target tahunan 4 juz.');
}
if(!html.includes('/mutabaah/target-policy.js'))html=html.replace('</head>','<script src="/mutabaah/target-policy.js"></script></head>');
const file='page-nuris-targets-'+crypto.createHash('sha256').update(code).digest('hex').slice(0,12)+'.js';fs.writeFileSync(root+'/_next/static/chunks/app/'+file,code);fs.writeFileSync(path,html.replaceAll(old,file));
const hp=root+'/_headers';let h=fs.readFileSync(hp,'utf8');if(!h.includes('/mutabaah/target-policy.js'))fs.writeFileSync(hp,h+'\n/mutabaah/target-policy.js\n  Cache-Control: no-cache\n');console.log(file);
