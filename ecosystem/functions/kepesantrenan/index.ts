import {yaumiyyah} from './yaumiyyah.ts';
import {campusActor} from './campusScope.ts';
import pg from 'npm:pg@8.13.1';
import { buildWhere, checkPermission, normalizeWrite, tables } from './policy.ts';
const MUT_API='https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/api';
const origins=['https://kepesantrenannuris.netlify.app','https://mutabaahtahfidznurista.netlify.app','http://localhost:4173','http://localhost:3400'];
const direct=new URL(Deno.env.get('SUPABASE_DB_URL')!);
const ref=direct.hostname.replace(/^db\./,'').split('.')[0];
let poolPromise:Promise<any>|null=null;
async function connectPool(){
 for(const host of ['aws-0-ap-southeast-1.pooler.supabase.com','aws-1-ap-southeast-1.pooler.supabase.com']){
  const pool=new pg.Pool({connectionString:`postgres://postgres.${ref}:${encodeURIComponent(decodeURIComponent(direct.password))}@${host}:6543/postgres`,ssl:{rejectUnauthorized:false},max:1,idleTimeoutMillis:4000,connectionTimeoutMillis:10000});
  pool.on('error',()=>{});
  try{await pool.query('SELECT 1');return pool;}catch{await pool.end().catch(()=>{});}
 }
 throw Object.assign(new Error('Server database belum dapat dihubungi. Coba lagi sebentar.'),{status:503});
}
const getPool=()=>poolPromise??=(connectPool().catch(e=>{poolPromise=null;throw e;}));
const query=async(sql:string,args:unknown[]=[]) => (await getPool()).query(sql,args);
const bearer=(req:Request)=>(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
function cors(req:Request){const o=req.headers.get('origin')||'';const allowed=origins.includes(o)||/^https:\/\/[a-z0-9-]+--kepesantrenannuris\.netlify\.app$/.test(o);return {'Access-Control-Allow-Origin':allowed?o:origins[0],'Access-Control-Allow-Headers':'authorization,content-type,x-region','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Max-Age':'600','Vary':'Origin','Cache-Control':'no-store'};}
function reply(req:Request,data:unknown,status=200){return Response.json(data,{status,headers:cors(req)});}
async function identity(token:string){
 if(!token||token.length>512)throw Object.assign(new Error('Sesi berakhir. Silakan masuk kembali.'),{status:401});
 const {rows}=await query(`SELECT a.username,a.nama,a.role,a.musyrif_master,s.data as session_data,md5('akun:'||a.username)::uuid::text as id,
 ARRAY(SELECT DISTINCT split_part(t.unit,' ',1) FROM public.santri t WHERE t.aktif AND t.unit ilike '%ikhwan%' AND lower(trim(t.musyrif))=lower(trim(a.musyrif_master)) ORDER BY 1) as units,
 ARRAY(SELECT DISTINCT split_part(t.unit,' ',1) FROM public.santri t WHERE t.aktif AND t.unit ilike '%akhwat%' AND lower(trim(t.musyrif))=lower(trim(a.musyrif_master)) ORDER BY 1) as putri_units
 FROM public.sesi s JOIN public.akun a ON a.username=s.data->>'username'
 WHERE s.token=$1 AND s.expires_at>now() AND upper(a.aktif)<>'N'`,[token]);
 if(!rows.length)throw Object.assign(new Error('Sesi berakhir atau akun dinonaktifkan. Silakan masuk kembali.'),{status:401});
 const a=rows[0];if(String(a.session_data.role||'').toLowerCase()!==String(a.role).toLowerCase()||String(a.session_data.musyrif_master||'')!==String(a.musyrif_master||''))throw Object.assign(new Error('Penugasan akun berubah. Silakan masuk kembali.'),{status:401});a.admin=['pimpinan','admin'].includes(a.role.toLowerCase());
 a.units=a.admin?['SMP','MA','SMA']:a.units;a.putri_units=a.admin?['SMP','MA','SMA']:a.putri_units;
 a.simkaPutriUser=a.putri_units.length?{id:a.id,nama:a.nama,username:a.username,role:a.admin?'KASIE_KEPESANTRENAN':'MUSYRIF',unit:a.admin?'ALL':a.putri_units[0],is_active:true}:null;
 a.simkaUser=a.units.length?{id:a.id,nama:a.nama,username:a.username,role:a.admin?'KASIE_KEPESANTRENAN':'MUSYRIF',unit:a.admin?'ALL':a.units[0],is_active:true}:null;
 return a;
}
async function loginLimit(req:Request,username:unknown){
 const raw=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0]+'|'+String(username||'').trim().toLowerCase();
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const {rows}=await query(`INSERT INTO simka.login_limits(k,attempts,started_at) VALUES($1,1,now()) ON CONFLICT(k) DO UPDATE SET attempts=CASE WHEN simka.login_limits.started_at<now()-interval '15 minutes' THEN 1 ELSE simka.login_limits.attempts+1 END,started_at=CASE WHEN simka.login_limits.started_at<now()-interval '15 minutes' THEN now() ELSE simka.login_limits.started_at END RETURNING attempts`,[hash]);
 if(rows[0].attempts>12)throw Object.assign(new Error('Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.'),{status:429});
 return hash;
}
async function mutabaah(req:Request,body:any){
 if(body.fn==='login'){
  if(typeof body.args?.[0]!=='string'||typeof body.args?.[1]!=='string'||body.args[0].length>120||body.args[1].length>256)throw new Error('Username dan password tidak valid.');
  await loginLimit(req,body.args[0]);
 } else if(body.fn!=='health') await identity(bearer(req));
 const r=await fetch(MUT_API,{method:'POST',headers:{'content-type':'application/json','authorization':req.headers.get('authorization')||'','x-region':'ap-southeast-1'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
 return reply(req,await r.json(),r.status);
}
const columnCache:Record<string,Record<string,Set<string>>>={};
async function columns(schema:string){if(!columnCache[schema]){const {rows}=await query('SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=$1',[schema]);columnCache[schema]={};for(const r of rows)(columnCache[schema][r.table_name]??=new Set()).add(r.column_name);}return columnCache[schema];}
const quote=(s:string)=>'"'+s.replaceAll('"','""')+'"';
async function dbQuery(a:any,q:any){
 if(!a.simkaUser)throw Object.assign(new Error('Akun ini belum mempunyai penugasan lingkungan dan unit di Mutabaah.'),{status:403});
 if(!q||!tables.includes(q.table))throw new Error('Tabel tidak diizinkan.');
 const cols=(await columns(a.schema))[q.table];if(!cols)throw new Error('Modul belum tersedia.');
 const op=q.op||'select';checkPermission(a,q.table,op,q.payload);
 const args:unknown[]=[];const where=buildWhere(q,a,cols,args);const table=a.schema+'.'+quote(q.table);
 if(op==='select'){
  let sql=`SELECT * FROM ${table} WHERE ${where}`;
  if(Array.isArray(q.orders)&&q.orders.length){sql+=' ORDER BY '+q.orders.slice(0,3).map((o:any)=>{if(!cols.has(o.column))throw new Error('Kolom urutan tidak valid.');return quote(o.column)+(o.ascending===false?' DESC':' ASC');}).join(',');}
  sql+=` LIMIT ${Math.min(Math.max(Number(q.limit)||5000,1),5000)}`;
  if(q.offset)sql+=` OFFSET ${Math.min(Math.max(Math.floor(Number(q.offset))||0,0),100000)}`;
  return (await query(sql,args)).rows;
 }
 const client=await (await getPool()).connect();
 try{
  await client.query('BEGIN');
  let rows:any[]=[];
  if(op==='delete'){
   if(!q.filters?.length)throw new Error('Pilih data yang akan dihapus.');
   rows=(await client.query(`DELETE FROM ${table} WHERE ${where} RETURNING *`,args)).rows;
  }else if(op==='update'){
   if(!q.filters?.length)throw new Error('Pilih data yang akan diperbarui.');
   const payload=await normalizeWrite(a,q.table,q.payload,op,client);
   const keys=Object.keys(payload);for(const k of keys)if(!cols.has(k))throw new Error(`column "${k}" does not exist`);
   const sets=keys.map(k=>{args.push(payload[k]);return quote(k)+'=$'+args.length;});
   if(!sets.length)throw new Error('Tidak ada perubahan.');
   rows=(await client.query(`UPDATE ${table} SET ${sets.join(',')} WHERE ${where} RETURNING *`,args)).rows;
  }else if(op==='insert'||op==='upsert'){
   const items=Array.isArray(q.payload)?q.payload:[q.payload];if(!items.length||items.length>500)throw new Error('Maksimal 500 data per permintaan.');
   for(const item of items){
    const p=await normalizeWrite(a,q.table,item,op,client);const keys=Object.keys(p);
    for(const k of keys)if(!cols.has(k))throw new Error(`column "${k}" does not exist`);
    const vals=keys.map(k=>p[k]);let conflict='';
    if(op==='upsert'){
     const c=q.conflict||'id';if(!['id','kode','tingkat','activity_id,lingkungan'].includes(c))throw new Error('Konflik tidak valid.');
     conflict=` ON CONFLICT (${c.split(',').map(quote).join(',')}) DO UPDATE SET `+keys.filter(k=>k!=='id'&&!c.split(',').includes(k)).map(k=>`${quote(k)}=EXCLUDED.${quote(k)}`).join(',');
    }
    rows.push(...(await client.query(`INSERT INTO ${table} (${keys.map(quote).join(',')}) VALUES (${keys.map((_,i)=>'$'+(i+1)).join(',')})${conflict} RETURNING *`,vals)).rows);
   }
  }else throw new Error('Operasi tidak diizinkan.');
  for(const row of rows)await client.query('INSERT INTO '+a.schema+'.audit(username,tabel,aksi,record_id) VALUES($1,$2,$3,$4)',[a.username,q.table,op,String(row.id)]);
  await client.query('COMMIT');return rows;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
 if(req.method!=='POST')return reply(req,{ok:true,app:'Kepesantrenan Nuris',version:'1.0.0'});
 try{
  if(Number(req.headers.get('content-length'))>1500000)throw new Error('Permintaan terlalu besar.');
  const body=await req.json();const path=new URL(req.url).pathname.split('/').pop();
  if(path==='mutabaah')return await mutabaah(req,body);
  if(path==='redeem'){
   if(typeof body.code!=='string'||!/^[a-f0-9]{64}$/.test(body.code))throw Object.assign(new Error('Tautan masuk tidak valid.'),{status:401});
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.code)))).map(x=>x.toString(16).padStart(2,'0')).join('');
   const {rows}=await query('DELETE FROM simka.handoffs WHERE code_hash=$1 AND expires_at>now() RETURNING token',[hash]);
   if(!rows.length)throw Object.assign(new Error('Tautan masuk kedaluwarsa atau sudah digunakan. Silakan masuk kembali.'),{status:401});
   const actor=await identity(rows[0].token);return reply(req,{ok:true,token:rows[0].token,user:{username:actor.username,nama:actor.nama,role:actor.role,musyrif_master:actor.musyrif_master}});
  }
  const a=await identity(bearer(req));
  if(['yaum-students','yaum-load','yaum-save'].includes(path||''))return reply(req,await yaumiyyah(a,path!,body,query));
  if(path==='handoff'){
   const code=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code)))).map(x=>x.toString(16).padStart(2,'0')).join('');
   await query('DELETE FROM simka.handoffs WHERE expires_at<now()');
   await query("INSERT INTO simka.handoffs(code_hash,token,expires_at) VALUES($1,$2,now()+interval '90 seconds')",[hash,bearer(req)]);
   return reply(req,{ok:true,code});
  }
  if(path==='session')return reply(req,{ok:true,mutabaahUser:{username:a.username,nama:a.nama,role:a.role,musyrif_master:a.musyrif_master},simkaUser:a.simkaUser,simkaPutriUser:a.simkaPutriUser,apps:{yaumiyyah:true,mutabaah:true,simka:!!a.simkaUser,'simka-putri':!!a.simkaPutriUser}});
  if(path==='query'){
   const actor=campusActor(a,body.campus);
   const rows=await dbQuery(actor,body);if(body.single&&!body.maybeSingle&&rows.length!==1)throw new Error('Data tidak ditemukan atau tidak unik.');
   return reply(req,{data:body.single||body.maybeSingle?(rows[0]||null):rows,error:null,count:rows.length});
  }
  return reply(req,{error:{message:'Rute tidak dikenal.'}},404);
 }catch(e:any){console.error('kepesantrenan',e.code||e.status||'request_error');return reply(req,{ok:false,error:{message:e.status?e.message:/^(23505|23503|23514|23502)$/.test(e.code||'')?'Data tidak valid, berhubungan dengan data lain, atau sudah tersedia.':e.message||'Permintaan gagal.'}},e.status||400);}
});
