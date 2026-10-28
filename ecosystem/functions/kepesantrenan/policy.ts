export const tables=['users','santri','master_pelanggaran','master_pembinaan','pelanggaran','pembinaan','hidden_notifications'];
const quote=(s:string)=>'"'+s.replaceAll('"','""')+'"';
export function buildWhere(q:any,a:any,columns:Set<string>,args:unknown[]){
 const parts:string[]=[];const param=(v:unknown)=>{args.push(v);return '$'+args.length;};
 if(!a.admin){
  if(['santri','users'].includes(q.table))parts.push(`${quote('unit')}=ANY(${param(a.units)}::text[])`);
  if(['pelanggaran','pembinaan'].includes(q.table))parts.push(`santri_unit=ANY(${param(a.units)}::text[])`);
  if(q.table==='hidden_notifications')parts.push(`unit=ANY(${param(a.units)}::text[])`);
 }
 if(Array.isArray(q.filters))for(const f of q.filters.slice(0,20)){
  if(!columns.has(f.column))throw new Error('Kolom filter tidak valid.');const c=quote(f.column);
  if(f.op==='eq'||f.op==='neq'||f.op==='ilike')parts.push(`${c} ${f.op==='eq'?'=':f.op==='neq'?'<>':'ILIKE'} ${param(f.value)}`);
  else if(f.op==='in'){if(!Array.isArray(f.value)||f.value.length>5000)throw new Error('Filter tidak valid.');parts.push(`${c}::text=ANY(${param(f.value.map(String))}::text[])`);}
  else throw new Error('Filter tidak diizinkan.');
 }
 return parts.join(' AND ')||'true';
}
export function checkPermission(a:any,table:string,op:string,payload:any){
 if(op==='select')return;
 if(['users','santri'].includes(table))throw new Error('Data akun dan santri dikelola melalui Mutabaah.');
 if(['master_pelanggaran','master_pembinaan'].includes(table)&&!a.admin)throw Object.assign(new Error('Hanya pimpinan yang dapat mengubah data master.'),{status:403});
 if(table==='pembinaan'&&!a.admin)throw Object.assign(new Error('Hanya pimpinan yang dapat mengelola pembinaan.'),{status:403});
 if(table==='pelanggaran'&&op!=='insert'&&!a.admin)throw Object.assign(new Error('Hanya pimpinan yang dapat mengubah catatan pelanggaran.'),{status:403});
 if(table==='hidden_notifications'&&!a.admin)throw Object.assign(new Error('Hanya pimpinan yang dapat mengarsipkan pemberitahuan.'),{status:403});
}
export async function normalizeWrite(a:any,table:string,input:any,op:string,db:any){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Data tidak valid.');
 const p={...input};
 if(op==='update'&&['pelanggaran','pembinaan'].includes(table)){
  for(const k of ['id','santri_id','santri_unit','lingkungan','pencatat_id','pencatat_nama','dicatat_oleh','pembina_id','pembina','created_at'])delete p[k];
 }
 if(['pelanggaran','pembinaan'].includes(table)&&(op==='insert'||op==='upsert')){
  const s=(await db.query('SELECT id,nama,kelas,unit FROM simka.santri WHERE id=$1',[String(p.santri_id||'')])).rows[0];
  if(!s||(!a.admin&&!a.units.includes(s.unit)))throw Object.assign(new Error('Santri berada di luar unit tugas Anda.'),{status:403});
  Object.assign(p,{santri_id:s.id,santri_nama:s.nama,santri_kelas:s.kelas,santri_unit:s.unit,lingkungan:'PUTRA'});
  if(table==='pelanggaran'){
   const m=(await db.query('SELECT * FROM simka.master_pelanggaran WHERE id=$1',[String(p.pelanggaran_id||p.jenis_pelanggaran_id||'')])).rows[0];
   if(!m)throw new Error('Jenis pelanggaran tidak ditemukan.');
   Object.assign(p,{pelanggaran_id:m.id,jenis_pelanggaran_id:m.id,jenis_pelanggaran_nama:m.jenis||m.nama,poin:m.poin,hukuman:m.konsekuensi||m.hukuman,pencatat_id:a.id,dicatat_oleh:a.id,pencatat_nama:a.nama,status:m.poin<50?'Selesai':'Belum Selesai'});
  }else{
   Object.assign(p,{pembina:a.nama,pembina_id:a.id});
   if(p.pelanggaran_terkait_id){const found=(await db.query('SELECT 1 FROM simka.pelanggaran WHERE id=$1 AND santri_id=$2',[p.pelanggaran_terkait_id,s.id])).rows[0];if(!found)throw new Error('Kasus terkait tidak sesuai dengan santri.');}
  }
 }
 if(table==='pelanggaran'&&op==='update'){
  if(p.pelanggaran_id||p.jenis_pelanggaran_id){const m=(await db.query('SELECT * FROM simka.master_pelanggaran WHERE id=$1',[String(p.pelanggaran_id||p.jenis_pelanggaran_id)])).rows[0];if(!m)throw new Error('Jenis pelanggaran tidak ditemukan.');Object.assign(p,{pelanggaran_id:m.id,jenis_pelanggaran_id:m.id,jenis_pelanggaran_nama:m.jenis||m.nama,poin:m.poin});}
  if(p.status==='Selesai')Object.assign(p,{diselesaikan_oleh:a.id,penyelesai_nama:a.nama,diselesaikan_pada:new Date().toISOString(),selesai_oleh:a.id,selesai_oleh_nama:a.nama,selesai_pada:new Date().toISOString()});
 }
 if(table==='pembinaan'&&p.status==='SELESAI')Object.assign(p,{selesai_oleh:a.id,selesai_oleh_nama:a.nama});
 if(table==='hidden_notifications'){
  if(!['pelanggaran','pembinaan'].includes(p.activity_type))throw new Error('Jenis pemberitahuan tidak valid.');
  const source=(await db.query(`SELECT santri_unit FROM simka.${p.activity_type} WHERE id=$1`,[p.source_id||p.activity_id])).rows[0];
  if(!source)throw new Error('Aktivitas tidak ditemukan.');Object.assign(p,{unit:source.santri_unit,lingkungan:'PUTRA',hidden_by_user_id:a.id,hidden_by_nama:a.nama,hidden_by_role:a.simkaUser.role});
 }
 return p;
}
