import {fail,norm} from './engine.ts';
export function reportPeriod(year:any,semester:any){
 if(typeof year!=='string'||!/^20\d{2}\/20\d{2}$/.test(year)||Number(year.slice(5))!==Number(year.slice(0,4))+1||![1,2].includes(semester))fail('Tahun ajaran atau semester tidak valid.');
 const y=Number(year.slice(0,4))+(semester===2?1:0);return {year,semester,from:`${y}-${semester===1?'07':'01'}`,to:`${y}-${semester===1?'12':'06'}`,end:`${y}-${semester===1?'12-31':'06-30'}`};
}
export const aspectKeys=['makhraj','tajwid','tahfidz','kehadiran','perkembangan'];
export const iqroPages=[15,16,19,22,27,31,36,39,44,49,54];
function str(v:any,n:number){if(typeof v!=='string'||v.length>n)fail('Isian rapor terlalu panjang atau tidak valid.');return v.trim();}
export function validateSupplement(v:any){
 if(!v||typeof v!=='object'||Array.isArray(v))fail('Isian rapor tidak valid.');
 const data:any={kamar:str(v.kamar||'',120),catatan:str(v.catatan||'',2000),tanggal:str(v.tanggal||'',10),aspek:{},iqro:{},hafalan_awal_baris:null};
 if(data.tanggal&&(!/^20\d{2}-\d{2}-\d{2}$/.test(data.tanggal)||!Number.isFinite(Date.parse(data.tanggal+'T00:00:00Z'))||new Date(data.tanggal+'T00:00:00Z').toISOString().slice(0,10)!==data.tanggal))fail('Tanggal rapor tidak valid.');
 if(v.hafalan_awal_baris!=null&&v.hafalan_awal_baris!==''){const n=Number(v.hafalan_awal_baris);if(!Number.isInteger(n)||n<0||n>9060)fail('Hafalan awal harus 0–9060 baris.');data.hafalan_awal_baris=n;}
 for(const k of aspectKeys){const x=v.aspek?.[k]||{};const grade=str(x.predikat||'',2);if(grade&&!['A','B+','B','C',...(k==='tahfidz'?['A+']:[])].includes(grade))fail('Predikat tidak sesuai panduan rapor.');data.aspek[k]={predikat:grade,keterangan:str(x.keterangan||'',600)};}
 for(const page of iqroPages){const grade=v.iqro?.[page]||'';if(!['','A','B+','B','C'].includes(grade))fail('Predikat Iqro tidak valid.');data.iqro[page]=grade;}
 return data;
}
async function student(db:any,a:any,id:any){if(typeof id!=='string'||id.length>150)fail('Pilih santri.');const s=(await db.query('SELECT id,nama,unit,tingkat,halaqah,musyrif,program,keterangan FROM public.santri WHERE id=$1',[id])).rows[0];if(!s)fail('Santri tidak ditemukan.',404);if(!a.admin&&!a.units?.includes(s.unit))fail('Anda hanya dapat mengakses rapor dalam unit penugasan.',403);return s;}
export async function semesterReport(db:any,a:any,b:any){
 const p=reportPeriod(b.tahun_ajaran,b.semester),s=await student(db,a,b.santri_id);
 const legacy=(await db.query('SELECT * FROM public.ujian_semester WHERE santri_id=$1 AND replace(tahun_ajaran,\'-\',\'/\')=$2 AND semester=$3',[s.id,p.year,p.semester])).rows[0]||null;
 const tajwid=(await db.query('SELECT * FROM public.penilaian_tajwid WHERE santri_id=$1 AND ym BETWEEN $2 AND $3 ORDER BY ym,diperbarui_pada',[s.id,p.from,p.to])).rows;
 const weeks=(await db.query('SELECT ym,pekan,hadir,sakit,izin,alfa,tahsin_baris,ziyadah_baris,murajaah_baris,nilai_tahsin,nilai_ziyadah,nilai_murajaah,ziyadah_surat,murajaah_juz,catatan FROM public.setoran WHERE santri_id=$1 AND ym BETWEEN $2 AND $3 ORDER BY ym,pekan',[s.id,p.from,p.to])).rows;
 const hafalan=(await db.query('SELECT * FROM public.hafalan WHERE santri_id=$1',[s.id])).rows[0]||null;
 // Only the most recent FINAL is reportable. A new draft never becomes an official grade.
 const exam=(await db.query(`SELECT t.exam_type,t.coverage,t.result,t.score,t.passed,t.note,t.finalized_at,t.rules,a.nama AS penguji FROM tahfidz_exam.assignments x JOIN tahfidz_exam.periods p ON p.id=x.period_id JOIN LATERAL(SELECT * FROM tahfidz_exam.attempts WHERE assignment_id=x.id AND status='FINAL' ORDER BY attempt_no DESC LIMIT 1)t ON true LEFT JOIN public.akun a ON a.username=t.examiner WHERE x.santri_id=$1 AND p.tahun_ajaran=$2 AND p.semester=$3`,[s.id,p.year,p.semester])).rows[0]||null;
 const certification=(await db.query('SELECT juz,bagian,nilai,status,tanggal_ujian FROM public.sertifikasi WHERE santri_id=$1 AND tanggal_ujian<=$2 ORDER BY juz,bagian',[s.id,p.end])).rows;
 const supplement=(await db.query('SELECT data,version,updated_at FROM tahfidz_exam.semester_reports WHERE santri_id=$1 AND tahun_ajaran=$2 AND semester=$3',[s.id,p.year,p.semester])).rows[0]||{data:{},version:0};
 // A verification inside the semester is an end balance, not the opening balance.
 let balance:any=null;const ym=hafalan?.terverifikasi_sampai_ym;
 if(/^20\d{2}-\d{2}$/.test(ym||'')&&ym<=p.to&&hafalan.baris_terverifikasi!=null){
  const after=(await db.query("SELECT coalesce(sum(ziyadah_baris) FILTER(WHERE trim(coalesce(ziyadah_surat,''))=''),0)+coalesce((SELECT sum(n) FROM(SELECT max(ziyadah_baris) n FROM public.setoran WHERE santri_id=$1 AND ym>$2 AND ym<=$3 AND trim(coalesce(ziyadah_surat,''))<>'' GROUP BY lower(trim(ziyadah_surat)))u),0) AS n FROM public.setoran WHERE santri_id=$1 AND ym>$2 AND ym<=$3",[s.id,ym,p.to])).rows[0];
  balance={bars:Number(hafalan.baris_terverifikasi)+Number(after.n),verified_ym:ym};
 }
 return {student:s,period:p,legacy,tajwid,weeks,hafalan,balance,exam,certification,supplement,can_edit:a.admin||a.coordinator_units?.includes(s.unit)||!!a.musyrif_master&&norm(a.musyrif_master)===norm(s.musyrif)};
}
export async function saveSemesterReport(db:any,a:any,b:any){
 const p=reportPeriod(b.tahun_ajaran,b.semester),s=await student(db,a,b.santri_id);
 if(!a.admin&&!a.coordinator_units?.includes(s.unit)&&(!a.musyrif_master||norm(a.musyrif_master)!==norm(s.musyrif)))fail('Pelengkap rapor diisi musyrif/ah santri atau pengelola unit.',403);
 const data=validateSupplement(b.data);if(!Number.isInteger(b.version)||b.version<0)fail('Versi rapor tidak valid.');
 await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`rapor:${s.id}:${p.year}:${p.semester}`]);
 const old=(await db.query('SELECT * FROM tahfidz_exam.semester_reports WHERE santri_id=$1 AND tahun_ajaran=$2 AND semester=$3 FOR UPDATE',[s.id,p.year,p.semester])).rows[0];
 if((old?.version||0)!==b.version)fail('Rapor telah diubah pengguna lain. Muat ulang sebelum menyimpan.',409);
 const saved=(await db.query(`INSERT INTO tahfidz_exam.semester_reports(santri_id,tahun_ajaran,semester,data,updated_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(santri_id,tahun_ajaran,semester) DO UPDATE SET data=excluded.data,version=semester_reports.version+1,updated_by=excluded.updated_by,updated_at=now() RETURNING data,version,updated_at`,[s.id,p.year,p.semester,JSON.stringify(data),a.username])).rows[0];
 await db.query('INSERT INTO tahfidz_exam.audit(username,action,record_id,before_data,after_data) VALUES($1,\'SEMESTER_REPORT\',$2,$3,$4)',[a.username,`${s.id}:${p.year}:${p.semester}`,JSON.stringify(old?.data||null),JSON.stringify(data)]);return {ok:true,supplement:saved};
}
