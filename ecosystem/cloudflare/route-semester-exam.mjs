import fs from 'node:fs';import crypto from 'node:crypto';
// Adapt the preserved legacy navigation only in the Cloudflare package.
const root='dist-cloudflare';const htmlPath=root+'/mutabaah/index.html';let html=fs.readFileSync(htmlPath,'utf8');
const matched=html.match(/\/_next\/static\/chunks\/app\/(page-[^"?]+\.js)/);if(!matched)throw Error('Mutabaah page bundle not found');
const original=matched[1];let code=fs.readFileSync(root+'/_next/static/chunks/app/'+original,'utf8');
// Keep Ujian Semester in Mutabaah's React navigation rather than switching applications.
const oldRedirect='if(a==="ujian"){if(window.parent!==window)window.parent.postMessage({type:"nuris:navigate",app:"ujian-tahfidz"},location.origin);else location.assign("/ujian-tahfidz/");return;}';
code=code.replace(oldRedirect,'');
if(!code.includes('function NurisSemesterExam(){')){
 const anchor='function t8(a){';if(code.split(anchor).length!==2)throw Error('Mutabaah shell changed');
 const component='function NurisSemesterExam(){let{dirty:a}=t2(),e=n.useRef(null),[t,l]=n.useState(900);n.useEffect(()=>{let t=t=>{if(t.origin!==location.origin||t.source!==e.current?.contentWindow||t.data?.type!=="nuris:exam-state")return;a.current=!!t.data.dirty;let s=Number(t.data.height);Number.isFinite(s)&&l(Math.max(350,Math.min(50000,s)))};window.addEventListener("message",t);return()=>{window.removeEventListener("message",t);a.current=!1}},[a]);return(0,s.jsx)("iframe",{ref:e,src:"/mutabaah/ujian/",title:"Ujian semester",style:{width:"100%",height:t,border:0,display:"block"},referrerPolicy:"same-origin"})}';
 code=code.replace(anchor,component+anchor).replace('ujian:eQ,arbain:eO','ujian:NurisSemesterExam,arbain:eO');
 code=code.replace('[c,u]=n.useState("beranda")','[c,u]=n.useState(()=>new URLSearchParams(location.search).get("tool")==="ujian"?"ujian":"beranda")');
 code=code.replace('"setor"!==c&&"hm"!==c||a===c','"setor"!==c&&"hm"!==c&&"ujian"!==c||a===c');
 code=code.replace('l||a.length||u("hm")','l||a.length||c==="ujian"||u("hm")');
 code=code.replace('["raport","akun","monitor","kelola","hm"].includes(c)','["raport","akun","monitor","kelola","hm","ujian"].includes(c)');
 // Swap both desktop ordering and the mobile primary/tools navigation.
 const hadis='{id:"arbain",label:"Hadis Arbain",icon:u.A}',exam='{id:"ujian",label:"Ujian Semester",icon:m.A}';
 if(!code.includes(hadis)||!code.includes(exam))throw Error('Mutabaah menu definitions changed');
 code=code.replace(hadis,'__NURIS_MENU_SWAP__').replace(exam,hadis).replace('__NURIS_MENU_SWAP__',exam);
 code=code.replace('["beranda","arbain","setor","santri"]','["beranda","ujian","setor","santri"]');
 code=code.replace('["ujian","rekap","sertifikasi","hm","monitor","kelola","akun"]','["arbain","rekap","sertifikasi","hm","monitor","kelola","akun"]');
 code=code.replace('"arbain"===a?"Arbain":e.label','"ujian"===a?"Ujian":e.label');
}
html=html.replace(/<script[^>]*src="\/ujian-tahfidz\/mutabaah-link.js"[^>]*><\/script>/g,'');
fs.copyFileSync('ecosystem/tahfidz-exam/ui/mutabaah-link.js',root+'/ujian-tahfidz/mutabaah-link.js');
// Patch the monitor response in this Cloudflare bundle, keeping Netlify assets intact.
const monitorNeedle='P("getMonitoringPekan",e,l).then(c)';
if(!code.includes('window.NurisMonitor.group')){
 if(code.split(monitorNeedle).length!==2)throw Error('Monitor callback changed; inspect before patching');
 code=code.replace(monitorNeedle,'P("getMonitoringPekan",e,l).then(a=>c(window.NurisMonitor.group(a)))');
 code=code.replace('"Total halaqah"','"Total musyrif"').replace('anggota halaqah.','anggota binaan.');
}
fs.copyFileSync('ecosystem/cloudflare/monitor-groups.js',root+'/monitor-groups.js');
const headersPath=root+'/_headers';let headers=fs.readFileSync(headersPath,'utf8');if(!headers.includes('/monitor-groups.js'))fs.writeFileSync(headersPath,headers+'\n/monitor-groups.js\n  Cache-Control: no-cache\n');
if(!html.includes('/monitor-groups.js'))html=html.replace('</head>','<script src="/monitor-groups.js"></script></head>');
const file='page-nuris-exam-'+crypto.createHash('sha256').update(code).digest('hex').slice(0,12)+'.js';fs.writeFileSync(root+'/_next/static/chunks/app/'+file,code);html=html.replaceAll(original,file);fs.writeFileSync(htmlPath,html);console.log(file);
