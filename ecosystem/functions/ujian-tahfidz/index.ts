import pg from 'npm:pg@8.13.1';
import {actorFromToken,examService} from './service.ts';
// Database credentials remain in Supabase's managed runtime.
const direct=new URL(Deno.env.get('SUPABASE_DB_URL')!);const ref=direct.hostname.replace(/^db\./,'').split('.')[0];let pending:any;
async function connect(){for(const host of ['aws-0-ap-southeast-1.pooler.supabase.com','aws-1-ap-southeast-1.pooler.supabase.com']){const pool=new pg.Pool({connectionString:`postgres://postgres.${ref}:${encodeURIComponent(decodeURIComponent(direct.password))}@${host}:6543/postgres`,ssl:{rejectUnauthorized:false},max:2,idleTimeoutMillis:10000,connectionTimeoutMillis:10000});pool.on('error',()=>{});try{await pool.query('SELECT 1');return pool;}catch{await pool.end().catch(()=>{});}}throw Object.assign(new Error('Database belum dapat dihubungi. Coba simpan kembali.'),{status:503});}
const pool=()=>pending??=(connect().catch(e=>{pending=null;throw e;}));
export async function handler(req:Request){
 const origin=req.headers.get('origin')||'',allowed=['https://kepesantrenan-nuris.kepesantrenannuris.workers.dev'];const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':allowed.includes(origin)?origin:allowed[0],'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Max-Age':'600'};
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method==='GET')return Response.json({app:'Ujian Tahfidz Semester Nuris',version:'1.0.0'}, {headers});
 if(req.method!=='POST')return Response.json({error:'Gunakan POST.'},{status:405,headers});
 try{const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!token||token.length>512)throw Object.assign(new Error('Masuk melalui Kepesantrenan Nuris.'),{status:401});const raw=await req.text();if(raw.length>200000)throw new Error('Isian terlalu besar.');const b=JSON.parse(raw);const p=await pool();const actor=await actorFromToken(token,(sql:any,args:any[])=>p.query(sql,args));const data=await examService(actor,b,p);return Response.json(data,{headers});}catch(e:any){return Response.json({error:e.status?e.message:'Permintaan belum dapat diproses. Periksa isian atau coba kembali.'},{status:e.status||400,headers});}
}
Deno.serve(handler);
