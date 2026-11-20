// Uji antrean offline dengan IndexedDB tiruan (memori).
// Jalankan: node ecosystem/mutabaah-rapor/tests/offline.test.mjs ecosystem/mutabaah-rapor/src/offline.js
import fs from 'node:fs'; import vm from 'node:vm';
const rows=new Map(); let seq=0;
const mkReq=(fn)=>{const r={};setTimeout(()=>{try{r.result=fn();r.onsuccess&&r.onsuccess();}catch(e){r.error=e;r.onerror&&r.onerror();}});return r;};
const store={getAll:()=>{const r={result:[...rows.values()].map(x=>({...x}))};return r;},add:(e)=>{const id=++seq;rows.set(id,{...e,id});return {result:id};},delete:(id)=>{rows.delete(id);return {result:undefined};},put:(e)=>{rows.set(e.id,{...e});return {result:e.id};},clear:()=>{rows.clear();return {result:undefined};}};
const dbo={transaction:()=>{const t={objectStore:()=>store};setTimeout(()=>t.oncomplete&&t.oncomplete());return t;},close(){},createObjectStore(){}};
const indexedDB={open:()=>{const r={};setTimeout(()=>{r.result=dbo;r.onupgradeneeded&&r.onupgradeneeded();r.onsuccess();});return r;}};
const ls=new Map(); const localStorage={getItem:k=>ls.has(k)?ls.get(k):null,setItem:(k,v)=>ls.set(k,String(v)),removeItem:k=>ls.delete(k)};
const listeners={}; let online=true; const sent=[];
let netDown=true;
const fetchMock=async(url,init)=>{ if(netDown) throw new TypeError('Failed to fetch'); sent.push(JSON.parse(init.body).fn); return new Response(JSON.stringify({ok:true,data:{}}),{status:200}); };
const body={appendChild(){},};
const ctx={window:null,indexedDB,localStorage,fetch:fetchMock,Response,Promise,JSON,Date,Math,console,setTimeout,setInterval:()=>0,navigator:{get onLine(){return online;}},
 document:{readyState:'complete',visibilityState:'visible',body:{appendChild(){}} ,createElement:()=>({style:{},setAttribute(){},appendChild(){},remove(){},set innerHTML(v){}})},
 addEventListener:(k,f)=>{(listeners[k]??=[]).push(f);},confirm:()=>true,TypeError};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2],'utf8'),ctx);
const W=ctx.window, wait=(ms=30)=>new Promise(r=>setTimeout(r,ms)), A='https://x.supabase.co/functions/v1/api';
const call=(fn,args)=>W.fetch(A,{method:'POST',headers:{},body:JSON.stringify({fn,args})});
let ok=0; const t=(c,m)=>{if(!c){console.error('GAGAL',m);process.exitCode=1;}else ok++;};
localStorage.setItem('mut_user',JSON.stringify({username:'musyrif.a'}));localStorage.setItem('mut_token','tok');
await wait();
const r=await call('saveSetoranBatch',[{tahun:2026,bulan:11,pekan:3},[{santri_id:'A'},{santri_id:'B'}]]); const j=await r.json();
t(j.ok&&j.data.offline&&j.data.count===2,'respons sintetis'); t(r.headers.get('X-Nuris-Offline')==='antre','header');
await wait(); t((await W.__nurisOffline.list()).length===1,'masuk antrean');
let thrown=false; try{await call('saveSertifikasi',[]);}catch(e){thrown=true;} t(thrown,'fungsi lain tidak diantrekan');
t((await W.__nurisOffline.list()).length===1,'antrean tetap 1');
netDown=false; await W.__nurisOffline.flush(false); await wait();
t(sent.join()==='saveSetoranBatch','dikirim ulang saat online'); t((await W.__nurisOffline.list()).length===0,'antrean kosong setelah terkirim');
netDown=true; await call('saveSetoranBatch',[{},[{santri_id:'C'}]]); await wait();
localStorage.setItem('mut_user',JSON.stringify({username:'musyrif.b'})); listeners.storage.forEach(f=>f({key:'mut_user'})); await wait(60);
t((await W.__nurisOffline.list()).length===0,'akun lain masuk: antrean dibuang');
localStorage.setItem('mut_user',JSON.stringify({username:'musyrif.a'})); await call('saveSetoranBatch',[{},[{santri_id:'D'}]]); await wait();
localStorage.removeItem('mut_token'); listeners.storage.forEach(f=>f({key:'mut_token'})); await wait(60);
t((await W.__nurisOffline.list()).length===1,'sesi berakhir: antrean disimpan');
try{await call('logout',[]);}catch(e){} await wait(60);
t((await W.__nurisOffline.list()).length===0,'keluar akun: antrean dibuang');
// isian basi (> 3 hari) tidak dikirim otomatis
localStorage.setItem('mut_token','tok'); await call('saveSetoranBatch',[{},[{santri_id:'E'}]]); await wait();
const e=(await W.__nurisOffline.list())[0]; e.waktu=Date.now()-4*86400e3; rows.set(e.id,e);
netDown=false; sent.length=0; await W.__nurisOffline.flush(false); await wait();
t(sent.length===0&&(await W.__nurisOffline.list()).length===1,'basi tidak otomatis'); await W.__nurisOffline.flush(true); await wait();
t(sent.length===1&&(await W.__nurisOffline.list()).length===0,'basi terkirim bila dipilih');
console.log('lulus', ok, 'pemeriksaan');
