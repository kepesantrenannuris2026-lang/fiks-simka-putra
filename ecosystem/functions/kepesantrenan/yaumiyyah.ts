import {validateEntry,daysOfMonth} from './yaumiyyahModel.ts';
export function studentScope(a:any,args:any[]){if(a.admin)return 'true';if(!String(a.musyrif_master||'').trim())return 'false';args.push(a.musyrif_master);return `lower(trim(musyrif))=lower(trim($${args.length}))`;}
export async function yaumiyyah(a:any,path:string,body:any,query:any){
 if(path==='yaum-students'){const args:any[]=[];const where=studentScope(a,args);return {students:(await query(`SELECT id,nama,tingkat AS kelas,unit,musyrif FROM public.santri WHERE aktif AND ${where} ORDER BY nama LIMIT 5000`,args)).rows};}
 if(typeof body.santri_id!=='string'||body.santri_id.length>150)throw new Error('Pilih santri.');
 const args:any[]=[body.santri_id];const where=studentScope(a,args);const student=(await query(`SELECT id,nama,tingkat AS kelas,unit,musyrif FROM public.santri WHERE id=$1 AND aktif AND ${where}`,args)).rows[0];
 if(!student)throw Object.assign(new Error('Santri tidak termasuk binaan akun Anda.'),{status:403});
 if(path==='yaum-load'){
  if(!Array.isArray(body.months)||body.months.length<1||body.months.length>6||new Set(body.months).size!==body.months.length)throw new Error('Pilih maksimal enam bulan.');
  for(const m of body.months)daysOfMonth(m);
  const rows=(await query("SELECT to_char(tanggal,'YYYY-MM-DD') AS date,aktivitas AS values,izin AS excused,catatan AS note,version FROM yaumiyyah.daily WHERE santri_id=$1 AND to_char(tanggal,'YYYY-MM')=ANY($2::text[]) ORDER BY tanggal",[student.id,body.months])).rows;
  return {student,entries:rows};
 }
 if(path==='yaum-save'){
  const entry=validateEntry(body.entry);const version=body.entry.version??null;if(version!==null&&!/^[0-9a-f-]{36}$/i.test(version))throw new Error('Versi data tidak valid.');
  // Authorization is repeated in the atomic write to handle a changed assignment.
  const values:any[]=[student.id,entry.date,JSON.stringify(entry.values),JSON.stringify(entry.excused),entry.note,a.username,version];
  const scope=studentScope(a,values);
  const rows=(await query(`WITH saved AS (INSERT INTO yaumiyyah.daily(santri_id,tanggal,aktivitas,izin,catatan,updated_by) SELECT $1,$2::date,$3::jsonb,$4::jsonb,$5,$6 FROM public.santri WHERE id=$1 AND aktif AND ${scope} ON CONFLICT(santri_id,tanggal) DO UPDATE SET aktivitas=excluded.aktivitas,izin=excluded.izin,catatan=excluded.catatan,updated_by=excluded.updated_by,updated_at=now(),version=gen_random_uuid() WHERE $7::uuid IS NOT NULL AND yaumiyyah.daily.version=$7::uuid RETURNING *) , audit AS (INSERT INTO yaumiyyah.audit(username,santri_id,tanggal) SELECT updated_by,santri_id,tanggal FROM saved) SELECT to_char(tanggal,'YYYY-MM-DD') AS date,aktivitas AS values,izin AS excused,catatan AS note,version FROM saved`,values)).rows;
  if(!rows.length)throw Object.assign(new Error('Data telah berubah atau penugasan diperbarui. Muat ulang sebelum menyimpan.'),{status:409});
  return {entry:rows[0]};
 }
 throw new Error('Rute mutabaah tidak dikenal.');
}
