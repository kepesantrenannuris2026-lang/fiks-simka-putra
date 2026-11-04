import {semesterReport,saveSemesterReport} from './semester-report.ts';
import {DEFAULT_RULES,WEIGHTS,validRules,validateDraft,score,selectQuestions,canManage,canRead,canExamine,balancedAssign,fail,norm,seeded,partialJuz30} from './engine.ts';
import metadata from './quran-metadata.json' with {type:'json'};
const uuid=(s:any)=>{if(typeof s!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s))fail('Identitas data tidak valid.');return s;};
const text=(s:any,max=2000)=>{if(typeof s!=='string'||s.length>max)fail('Teks tidak valid.');return s.trim();};
const qselect='n,start_key AS start,end_key AS end,page,juz,group_no AS "group",label,mode,completed';
const unitSQL=`SELECT DISTINCT unit FROM public.santri WHERE aktif AND lower(trim(musyrif))=lower(trim($1))`;
export async function actorFromToken(token:string,q:any){
 if(!token||token.length>512)fail('Sesi berakhir. Masuk melalui Kepesantrenan Nuris.',401);
 const a=(await q(`SELECT a.username,a.nama,a.role,a.musyrif_master,s.data AS session_data FROM public.sesi s JOIN public.akun a ON a.username=s.data->>'username' WHERE s.token=$1 AND s.expires_at>now() AND upper(a.aktif)<>'N'`,[token])).rows[0];
 if(!a||norm(a.role)!==norm(a.session_data.role)||norm(a.musyrif_master)!==norm(a.session_data.musyrif_master))fail('Sesi atau penugasan berubah. Silakan masuk kembali.',401);
 a.units=(await q(`SELECT DISTINCT unit FROM public.santri WHERE aktif AND trim($1::text)<>'' AND lower(trim(musyrif))=lower(trim($1)) UNION SELECT unit FROM tahfidz_exam.staff WHERE username=$2`,[a.musyrif_master||'',a.username])).rows.map((r:any)=>r.unit);a.admin=['pimpinan','admin'].includes(norm(a.role));a.coordinator_units=(await q("SELECT unit FROM tahfidz_exam.staff WHERE username=$1 AND role='coordinator'",[a.username])).rows.map((r:any)=>r.unit);return a;
}
function visibleSQL(a:any,args:any[]){if(a.admin)return 'true';args.push(a.units||[]);return `(s.unit=x.unit AND x.unit=ANY($${args.length}::text[]))`;}
export function academicPeriod(now=new Date()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit'}).formatToParts(now);const year=Number(parts.find(p=>p.type==='year')!.value),month=Number(parts.find(p=>p.type==='month')!.value),start=month>=7?year:year-1;return {year:`${start}/${start+1}`,semester:month>=7?1:2};}
async function ensureCurrentPeriod(db:any){const p=academicPeriod();const existing=(await db.query('SELECT * FROM tahfidz_exam.periods WHERE tahun_ajaran=$1 AND semester=$2',[p.year,p.semester])).rows[0];if(existing)return existing;return (await db.query(`INSERT INTO tahfidz_exam.periods(tahun_ajaran,semester,title,is_open,rules,created_by) VALUES($1,$2,$3,true,$4,'system:auto-semester') ON CONFLICT(tahun_ajaran,semester) DO UPDATE SET title=tahfidz_exam.periods.title RETURNING *`,[p.year,p.semester,`Ujian ${p.year} · Semester ${p.semester}`,JSON.stringify(DEFAULT_RULES)])).rows[0];}
function requireUnit(a:any,unit:string){if(!a.admin&&!a.units?.includes(unit))fail('Anda hanya dapat mengakses santri dalam unit penugasan Anda.',403);}

async function assignment(db:any,id:string){const x=(await db.query(`SELECT x.*,s.nama,s.musyrif,s.tingkat,s.halaqah,s.aktif,s.unit AS current_unit,p.rules,p.rules_version,p.is_open,p.tahun_ajaran,p.semester FROM tahfidz_exam.assignments x JOIN public.santri s ON s.id=x.santri_id JOIN tahfidz_exam.periods p ON p.id=x.period_id WHERE x.id=$1 FOR UPDATE OF x`,[uuid(id)])).rows[0];if(!x)fail('Penugasan tidak ditemukan.',404);return x;}
async function loadAttempt(db:any,id:string){const link=(await db.query('SELECT assignment_id FROM tahfidz_exam.attempts WHERE id=$1',[uuid(id)])).rows[0];if(!link)fail('Ujian tidak ditemukan.',404);const x=await assignment(db,link.assignment_id);const t=(await db.query('SELECT * FROM tahfidz_exam.attempts WHERE id=$1 FOR UPDATE',[id])).rows[0];const questions=(await db.query(`SELECT ${qselect} FROM tahfidz_exam.questions WHERE attempt_id=$1 ORDER BY n`,[id])).rows;const events=(await db.query('SELECT id,question_no AS q,type,occurred_at AS at FROM tahfidz_exam.error_events WHERE attempt_id=$1 AND NOT voided ORDER BY occurred_at,id',[id])).rows;return {attempt:t,assignment:x,questions,draft:{events,completed:questions.filter((q:any)=>q.completed).map((q:any)=>q.n),note:t.note}};}
async function audit(db:any,a:any,action:string,id:string,before:any,after:any,reason=''){await db.query('INSERT INTO tahfidz_exam.audit(username,action,record_id,before_data,after_data,reason) VALUES($1,$2,$3,$4,$5,$6)',[a.username,action,id,JSON.stringify(before),JSON.stringify(after),reason]);}
async function requireManager(a:any,unit:string){if(!canManage(a,unit))fail('Hanya pengelola unit yang berwenang.',403);}
async function examinerList(db:any){const rows=(await db.query(`SELECT a.username,a.nama,a.musyrif_master,ARRAY(SELECT unit FROM (${unitSQL.replace('$1','a.musyrif_master')} UNION SELECT unit FROM tahfidz_exam.staff t WHERE t.username=a.username) u) AS units FROM public.akun a WHERE upper(a.aktif)<>'N' AND a.role IN('musyrif','pimpinan','admin') ORDER BY a.nama`)).rows;return rows;}
function coverageInput(b:any){
 if(!['HAFALAN_5_SOAL','UJI_KOMPETENSI_DASAR'].includes(b.exam_type)||b.coverage?.verified!==true)fail('Konfirmasikan materi yang dikuasai peserta.');
 const v=b.coverage;const target=['TUNTAS','BELUM_TUNTAS','BELUM_WAJIB'].includes(v.target)?v.target:b.exam_type==='UJI_KOMPETENSI_DASAR'?'BELUM_WAJIB':v.mode==='partial'?'BELUM_TUNTAS':'TUNTAS';const coverage:any={juz:v.juz,start:v.start,end:v.end,target,verified:true};
 if(v.mode!==undefined){if(!['full','partial','basic'].includes(v.mode))fail('Mode materi tidak valid.');coverage.mode=v.mode;}
 if(v.ranges!==undefined){if(!Array.isArray(v.ranges)||v.ranges.length<1||v.ranges.length>30)fail('Pilih 1–30 juz berbeda; setiap juz mendapat lima soal.');coverage.ranges=v.ranges.map((r:any)=>({juz:r?.juz,start:r?.start,end:r?.end}));}
 if(v.mode==='partial'){if(b.exam_type!=='HAFALAN_5_SOAL')fail('Bagian Juz 30 memakai ujian hafalan.');const partial=partialJuz30(v.quarters,target);if(v.juz!==30||v.start!==partial.start||v.end!==partial.end||v.ranges!==undefined)fail('Ujian sebagian hanya memakai kelompok resmi Juz 30.');return partial;}
 selectQuestions(metadata,coverage,b.exam_type,'validate');return coverage;
}
const readActions=new Set(['bootstrap','roster','participants','candidates','load','history','report','student-context','semester-report']);
export async function examService(a:any,b:any,pool:any){
 const action=text(b.action||'',40);const db=await pool.connect();
 try{await db.query('BEGIN');
  // Same idempotency key with another payload is rejected; duplicate sends serialize.
  if(!readActions.has(action)){
   uuid(b.request_id);await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[a.username+':'+b.request_id]);
   const old=(await db.query('SELECT body,response FROM tahfidz_exam.requests WHERE username=$1 AND request_id=$2',[a.username,b.request_id])).rows[0];
   if(old){const eq=(await db.query('SELECT $1::jsonb=$2::jsonb AS eq',[JSON.stringify(old.body),JSON.stringify(b)])).rows[0].eq;if(!eq)fail('Kunci permintaan telah digunakan untuk isian berbeda.',409);await db.query('COMMIT');return old.response;}
  }
  let result:any;
  if(action==='semester-report'){
   result=await semesterReport(db,a,b);
  }else if(action==='save-semester-report'){
   result=await saveSemesterReport(db,a,b);
  }else if(action==='bootstrap'){
   const activePeriod=await ensureCurrentPeriod(db);
   const periods=(await db.query('SELECT * FROM tahfidz_exam.periods ORDER BY tahun_ajaran DESC,semester DESC LIMIT 16')).rows;
   const halaqah_options=(await db.query(`SELECT DISTINCT unit,musyrif,halaqah FROM public.santri WHERE aktif AND ($1::boolean OR unit=ANY($2::text[])) ORDER BY unit,musyrif,halaqah`,[a.admin,a.units||[]])).rows;
   const staff=a.admin?(await db.query('SELECT * FROM tahfidz_exam.staff ORDER BY unit,role')).rows:[];
   result={user:{username:a.username,nama:a.nama,admin:a.admin,coordinator_units:a.coordinator_units,units:a.units||[]},active_period_id:activePeriod.id,periods,staff,halaqah_options,examiners:a.admin?await examinerList(db):a.coordinator_units.length?(await examinerList(db)).filter((e:any)=>e.units.some((u:string)=>a.coordinator_units.includes(u))):[]};
  }else if(action==='period'){
   if(!a.admin)fail('Hanya pimpinan yang dapat mengatur periode dan aturan.',403);
   const year=text(b.tahun_ajaran,9);if(!/^20\d{2}\/20\d{2}$/.test(year)||Number(year.slice(5))!==Number(year.slice(0,4))+1||![1,2].includes(b.semester))fail('Tahun ajaran atau semester tidak valid.');
   const rules=validRules(b.rules);if(rules.require_min_completed&&b.approved_min!==true)fail('Syarat jumlah soal harus disahkan pengelola.');
   const r=(await db.query(`INSERT INTO tahfidz_exam.periods(tahun_ajaran,semester,title,rules,created_by,is_open) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(tahun_ajaran,semester) DO UPDATE SET is_open=excluded.is_open,rules=excluded.rules,rules_version=tahfidz_exam.periods.rules_version+1 RETURNING *`,[year,b.semester,`Ujian ${year} · Semester ${b.semester}`,JSON.stringify(rules),a.username,b.is_open===true])).rows[0];await audit(db,a,'PERIOD',r.id,null,r);result={period:r};
  }else if(action==='staff'){
   if(!a.admin)fail('Hanya pimpinan yang dapat mengatur kewenangan unit.',403);if(!['coordinator','examiner'].includes(b.role)||!['SMP Ikhwan','SMA Ikhwan','MA Ikhwan','SMP Akhwat','SMA Akhwat','MA Akhwat'].includes(b.unit))fail('Penugasan petugas tidak valid.');
   if(b.remove===true)await db.query('DELETE FROM tahfidz_exam.staff WHERE username=$1 AND unit=$2 AND role=$3',[b.username,b.unit,b.role]);else await db.query('INSERT INTO tahfidz_exam.staff VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[text(b.username,120),b.unit,b.role]);await audit(db,a,'STAFF',b.username,null,b);result={ok:true};
  }else if(action==='roster'){
   const args:any[]=[uuid(b.period_id)];let where='s.aktif';if(!a.admin){args.push(a.units||[]);where+=` AND s.unit=ANY($${args.length}::text[])`;}
   if(b.unit){args.push(text(b.unit,60));where+=` AND s.unit=$${args.length}`;}if(b.search){args.push('%'+text(b.search,100)+'%');where+=` AND s.nama ILIKE $${args.length}`;}
   if(b.kelas){args.push(text(b.kelas,20));where+=` AND s.tingkat=$${args.length}`;}
   if(b.musyrif){args.push(text(b.musyrif,200));where+=` AND s.musyrif=$${args.length}`;}if(b.halaqah){args.push(text(b.halaqah,150));where+=` AND s.halaqah=$${args.length}`;}
   const rows=(await db.query(`SELECT coalesce(x.id::text,s.id) AS id,s.id AS santri_id,s.nama,s.unit,s.tingkat,s.halaqah,s.musyrif,x.id IS NULL AS unprepared,x.exam_type,x.coverage,coalesce(x.status,'BELUM_DIUJI') AS status,x.examiner,CASE WHEN t.id IS NOT NULL THEN a.nama END AS penguji,t.id AS attempt_id,t.attempt_no,t.score,t.passed,t.status AS attempt_status,t.result,t.published_at,(SELECT count(*)::int FROM tahfidz_exam.attempts history WHERE history.assignment_id=x.id AND history.status<>'BATAL') AS attempt_count FROM public.santri s LEFT JOIN tahfidz_exam.assignments x ON x.santri_id=s.id AND x.period_id=$1 AND x.unit=s.unit LEFT JOIN public.akun a ON a.username=x.examiner LEFT JOIN LATERAL(SELECT * FROM tahfidz_exam.attempts t WHERE t.assignment_id=x.id AND t.status<>'BATAL' ORDER BY attempt_no DESC LIMIT 1)t ON true WHERE ${where} ORDER BY s.nama LIMIT 30 OFFSET $${args.length+1}`,[...args,Math.min(Math.max(Number(b.offset)||0,0),5000)])).rows;
   const summary=(await db.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE x.id IS NULL OR x.status='SUDAH_DITUGASKAN')::int AS belum,count(*) FILTER(WHERE x.status='SEDANG_UJIAN')::int AS berjalan,count(*) FILTER(WHERE x.status='SELESAI' OR x.status='PERLU_REMEDIAL')::int AS selesai,count(*) FILTER(WHERE x.status='PERLU_REMEDIAL')::int AS remedial FROM public.santri s LEFT JOIN tahfidz_exam.assignments x ON x.santri_id=s.id AND x.period_id=$1 AND x.unit=s.unit WHERE ${where}`,args)).rows;result={rows,summary};
  }else if(action==='student-context'){
   const student=(await db.query("SELECT s.id,s.unit,s.tingkat,to_jsonb(s)->>'program' AS program FROM public.santri s WHERE id=$1 AND aktif",[text(b.santri_id,150)])).rows[0];if(!student)fail('Peserta tidak tersedia.',404);requireUnit(a,student.unit);
   const hafalan=(await db.query('SELECT baris_terverifikasi,target_juz,juz_selesai,juz_diuji FROM public.hafalan WHERE santri_id=$1',[student.id])).rows[0]||null;
   const tajwid=(await db.query("SELECT ym,makhraj,tajwid FROM public.penilaian_tajwid WHERE santri_id=$1 AND ym<to_char(now() AT TIME ZONE 'Asia/Jakarta','YYYY-MM') ORDER BY ym DESC,diperbarui_pada DESC LIMIT 1",[student.id])).rows[0]||null;
   result={hafalan,tajwid,student};
  }else if(action==='change-material'){
   const r=await loadAttempt(db,b.attempt_id);requireUnit(a,r.assignment.unit);
   if(r.assignment.unit!==r.assignment.current_unit||!r.assignment.aktif||!r.assignment.is_open)fail('Status peserta atau periode telah berubah.',409);
   if(!a.admin&&r.attempt.examiner!==a.username)fail('Hanya penguji sesi ini yang dapat mengubah materi. Gunakan Restart untuk pergantian penguji.',403);
   if(r.attempt.status!=='DRAFT'||r.attempt.version!==b.version)fail('Sesi sudah berubah atau telah final. Muat ulang.',409);
   if((await db.query("SELECT 1 FROM tahfidz_exam.attempts WHERE assignment_id=$1 AND status='FINAL'",[r.assignment.id])).rows.length)fail('Materi hasil final tetap tersimpan. Hubungi pengelola untuk remedial.',409);
   const coverage=coverageInput(b);
   await db.query("UPDATE tahfidz_exam.attempts SET status='BATAL',reason='Mengubah materi ujian',version=version+1 WHERE id=$1",[r.attempt.id]);
   await db.query("UPDATE tahfidz_exam.assignments SET exam_type=$2,coverage=$3,verified_by=$4,verified_at=now(),status='SUDAH_DITUGASKAN',version=version+1 WHERE id=$1",[r.assignment.id,b.exam_type,JSON.stringify(coverage),a.username]);
   await audit(db,a,'CHANGE_MATERIAL',r.attempt.id,{coverage:r.attempt.coverage,exam_type:r.attempt.exam_type,draft:r.draft},{coverage,exam_type:b.exam_type,status:'BATAL'},'Mengubah materi ujian');
   result={assignment_id:r.assignment.id,cancelled_attempt_id:r.attempt.id};
  }else if(action==='begin-student'){
   const p=(await db.query('SELECT * FROM tahfidz_exam.periods WHERE id=$1 FOR UPDATE',[uuid(b.period_id)])).rows[0];if(!p?.is_open)fail('Periode ujian ditutup oleh pengelola.');
   const student=(await db.query('SELECT id,unit,musyrif FROM public.santri WHERE id=$1 AND aktif FOR UPDATE',[text(b.santri_id,150)])).rows[0];if(!student)fail('Peserta tidak tersedia.',404);requireUnit(a,student.unit);
   const coverage=coverageInput(b);
   const existing=(await db.query('SELECT * FROM tahfidz_exam.assignments WHERE period_id=$1 AND santri_id=$2 FOR UPDATE',[p.id,student.id])).rows[0];if(existing){
    const equal=existing.exam_type===b.exam_type&&(await db.query('SELECT $1::jsonb=$2::jsonb AS eq',[JSON.stringify(existing.coverage),JSON.stringify(coverage)])).rows[0].eq;
    const active=(await db.query("SELECT status FROM tahfidz_exam.attempts WHERE assignment_id=$1 AND status<>'BATAL' ORDER BY attempt_no DESC LIMIT 1",[existing.id])).rows[0];
    if(active&&!equal)fail('Sesi sudah berjalan atau final. Gunakan Ubah materi pada draf atau hubungi pengelola.',409);
    if(!active){if(existing.unit!==student.unit)fail('Unit penugasan berubah. Hubungi pengelola.',409);await db.query('UPDATE tahfidz_exam.assignments SET coverage=$2,exam_type=$3,verified_by=$4,verified_at=now(),version=version+1 WHERE id=$1',[existing.id,JSON.stringify(coverage),b.exam_type,a.username]);await audit(db,a,'PREPARE_MATERIAL',existing.id,{coverage:existing.coverage,exam_type:existing.exam_type},{coverage,exam_type:b.exam_type});}
    result={assignment_id:existing.id};
   }else{
    const x=(await db.query(`INSERT INTO tahfidz_exam.assignments(period_id,santri_id,unit,examiner,exam_type,coverage,verified_by) VALUES($1,$2,$3,$4,$5,$6,$4) RETURNING id`,[p.id,student.id,student.unit,a.username,b.exam_type,JSON.stringify(coverage)])).rows[0];await audit(db,a,'PREPARE_AND_CLAIM',x.id,null,{examiner:a.username,coverage});result={assignment_id:x.id};
   }
  }else if(action==='participants'||action==='report'){
   const args:any[]=[uuid(b.period_id)];const where=visibleSQL(a,args);let filters='';for(const col of ['unit','examiner','status','exam_type'])if(b[col]){args.push(text(b[col],120));filters+=` AND x.${col}=$${args.length}`;}if(b.search){args.push('%'+text(b.search,100)+'%');filters+=` AND s.nama ILIKE $${args.length}`;}if(b.kelas){args.push(text(b.kelas,20));filters+=` AND s.tingkat=$${args.length}`;}
   if(b.musyrif){args.push(text(b.musyrif,200));filters+=` AND s.musyrif=$${args.length}`;}
   if(b.halaqah){args.push('%'+text(b.halaqah,100)+'%');filters+=` AND s.halaqah ILIKE $${args.length}`;}
   const rows=(await db.query(`SELECT x.*,s.nama,s.tingkat,s.halaqah,s.musyrif,CASE WHEN t.id IS NOT NULL THEN a.nama END AS penguji,t.id AS attempt_id,t.attempt_no,t.score,t.passed,t.status AS attempt_status,t.result,t.published_at FROM tahfidz_exam.assignments x JOIN public.santri s ON s.id=x.santri_id JOIN public.akun a ON a.username=x.examiner LEFT JOIN LATERAL(SELECT * FROM tahfidz_exam.attempts t WHERE t.assignment_id=x.id AND t.status<>'BATAL' ORDER BY attempt_no DESC LIMIT 1)t ON true WHERE x.period_id=$1 AND ${where}${filters} ORDER BY s.nama LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,action==='report'?1000:30,Math.min(Math.max(Number(b.offset)||0,0),5000)])).rows;
   const summary=(await db.query(`SELECT x.unit,count(*)::int total,count(*) FILTER(WHERE x.status='SUDAH_DITUGASKAN')::int belum,count(*) FILTER(WHERE x.status='SEDANG_UJIAN')::int berjalan,count(*) FILTER(WHERE t.status='FINAL')::int selesai,count(*) FILTER(WHERE t.passed AND t.status='FINAL')::int lulus,count(*) FILTER(WHERE NOT t.passed AND t.status='FINAL')::int remedial,round(avg(t.score) FILTER(WHERE t.status='FINAL'),2) rata_rata FROM tahfidz_exam.assignments x JOIN public.santri s ON s.id=x.santri_id LEFT JOIN LATERAL(SELECT * FROM tahfidz_exam.attempts WHERE assignment_id=x.id AND status<>'BATAL' ORDER BY attempt_no DESC LIMIT 1)t ON true WHERE x.period_id=$1 AND ${where}${filters} GROUP BY x.unit ORDER BY x.unit`,args)).rows;
   result={rows,summary};
  }else if(action==='candidates'){
   await requireManager(a,b.unit);const rows=(await db.query(`SELECT s.id,s.nama,s.unit,s.tingkat,s.halaqah,s.musyrif,h.baris_terverifikasi,h.terverifikasi_pada,h.juz_selesai,h.target_juz FROM public.santri s LEFT JOIN public.hafalan h ON h.santri_id=s.id WHERE s.aktif AND s.unit=$1 AND NOT EXISTS(SELECT 1 FROM tahfidz_exam.assignments x WHERE x.period_id=$2 AND x.santri_id=s.id) AND s.nama ILIKE $3 ORDER BY s.nama LIMIT 30 OFFSET $4`,[b.unit,uuid(b.period_id),'%'+text(b.search||'',100)+'%',Math.min(Math.max(Number(b.offset)||0,0),5000)])).rows;result={rows};
  }else if(action==='prepare'){
   const p=(await db.query('SELECT * FROM tahfidz_exam.periods WHERE id=$1 FOR UPDATE',[uuid(b.period_id)])).rows[0];if(!p)fail('Pilih periode ujian.');await requireManager(a,b.unit);
   if(!Array.isArray(b.students)||!b.students.length||b.students.length>100||new Set(b.students).size!==b.students.length)fail('Pilih 1–100 peserta berbeda.');
   const students=(await db.query('SELECT id,unit,musyrif FROM public.santri WHERE aktif AND unit=$1 AND id=ANY($2::text[])',[b.unit,b.students])).rows;if(students.length!==b.students.length)fail('Peserta tidak sesuai unit.',403);
   const coverage=coverageInput(b);
   const counts:Record<string,number>=Object.fromEntries((await db.query('SELECT examiner,count(*)::int n FROM tahfidz_exam.assignments WHERE period_id=$1 GROUP BY examiner',[p.id])).rows.map((r:any)=>[r.examiner,r.n]));
   const staff=await examinerList(db);const chosen=balancedAssign(students,staff,Math.random,counts);
   for(const c of chosen){const row=(await db.query(`INSERT INTO tahfidz_exam.assignments(period_id,santri_id,unit,examiner,exam_type,coverage,verified_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[p.id,c.santri_id,b.unit,c.examiner,b.exam_type,JSON.stringify(coverage),a.username])).rows[0];await audit(db,a,'ASSIGN',row.id,null,{...c,coverage,exam_type:b.exam_type});}
   result={prepared:chosen.length,own_halaqah:chosen.filter(c=>c.own_halaqah).length};
  }else if(action==='history'){
   const x=await assignment(db,b.assignment_id);if((x.unit!==x.current_unit&&!a.admin)||!canRead(a,x))fail('Tidak berwenang membaca peserta ini.',403);result={assignment:x,attempts:(await db.query('SELECT id,attempt_no,kind,examiner,status,score,passed,finalized_at,published_at,reason FROM tahfidz_exam.attempts WHERE assignment_id=$1 AND status<>\'BATAL\' ORDER BY attempt_no',[x.id])).rows};
  }else if(action==='reassign'){
   const x=await assignment(db,b.assignment_id);await requireManager(a,x.unit);const reason=text(b.reason,500);if(reason.length<5)fail('Isi alasan penggantian penguji.');if((await db.query("SELECT 1 FROM tahfidz_exam.attempts WHERE assignment_id=$1 AND status='DRAFT'",[x.id])).rows.length)fail('Sesi masih berjalan. Selesaikan sebelum mengganti penguji.',409);const e=(await examinerList(db)).find((e:any)=>e.username===b.examiner&&e.units.includes(x.unit));if(!e)fail('Penguji tidak berwenang di unit ini.',403);await db.query('UPDATE tahfidz_exam.assignments SET examiner=$2,scheduled_date=$3,version=version+1 WHERE id=$1',[x.id,e.username,b.scheduled_date||null]);await audit(db,a,'REASSIGN',x.id,{examiner:x.examiner},{examiner:e.username,date:b.scheduled_date},reason);result={ok:true};
  }else if(action==='restart'){
   const r=await loadAttempt(db,b.attempt_id);requireUnit(a,r.assignment.unit);if(r.assignment.unit!==r.assignment.current_unit)fail('Unit peserta sudah berubah.',409);
   if(r.attempt.status!=='DRAFT'||r.attempt.version!==b.version)fail('Sesi sudah berubah atau telah final. Muat ulang sebelum membatalkan.',409);
   const removed=(await db.query("SELECT id FROM tahfidz_exam.attempts WHERE assignment_id=$1 AND status<>'FINAL' ORDER BY attempt_no FOR UPDATE",[r.assignment.id])).rows.map((t:any)=>t.id);
   // Delete dependent rows and cached snapshots as one transaction. No canceled-copy history remains.
   await db.query('DELETE FROM tahfidz_exam.error_events WHERE attempt_id=ANY($1::uuid[])',[removed]);
   await db.query('DELETE FROM tahfidz_exam.questions WHERE attempt_id=ANY($1::uuid[])',[removed]);
   await db.query('DELETE FROM tahfidz_exam.audit WHERE record_id=ANY($1::text[])',[removed]);
   await db.query("DELETE FROM tahfidz_exam.requests WHERE body->>'attempt_id'=ANY($1::text[]) OR response#>>'{attempt,id}'=ANY($1::text[])",[removed]);
   await db.query('DELETE FROM tahfidz_exam.attempts WHERE id=ANY($1::uuid[])',[removed]);
   const previous=(await db.query("SELECT passed FROM tahfidz_exam.attempts WHERE assignment_id=$1 AND status='FINAL' ORDER BY attempt_no DESC LIMIT 1",[r.assignment.id])).rows[0];
   await db.query('UPDATE tahfidz_exam.assignments SET status=$2,version=version+1 WHERE id=$1',[r.assignment.id,previous?(previous.passed?'SELESAI':'PERLU_REMEDIAL'):'SUDAH_DITUGASKAN']);
   result={ok:true,assignment_id:r.assignment.id,deleted_attempt_ids:removed};
  }else if(action==='start'){
   const x=await assignment(db,b.assignment_id);requireUnit(a,x.unit);if(x.unit!==x.current_unit)fail('Unit peserta berubah. Pengelola perlu memperbarui penugasan.',409);if(!x.is_open||!x.aktif)fail('Periode belum dibuka atau peserta tidak aktif.');
   const previous=(await db.query("SELECT * FROM tahfidz_exam.attempts WHERE assignment_id=$1 AND status<>'BATAL' ORDER BY attempt_no DESC LIMIT 1",[x.id])).rows[0];
   if(previous?.status==='DRAFT'){result=await loadAttempt(db,previous.id);}else{
    if(previous&&!canManage(a,x.unit))fail('Pengelola unit perlu menjadwalkan remedial/revisi.',403);const kind=previous?(previous.passed?'REVISI':'REMEDIAL'):'PERTAMA';const reason=previous?text(b.reason||'',500):'';if(previous&&reason.length<5)fail('Isi alasan dan rencana remedial/revisi.');
    if(!a.admin&&x.examiner!==a.username){await db.query('UPDATE tahfidz_exam.assignments SET examiner=$2,version=version+1 WHERE id=$1',[x.id,a.username]);await audit(db,a,'CLAIM_UNIT',x.id,{examiner:x.examiner},{examiner:a.username});x.examiner=a.username;}
    const nextNo=(await db.query('SELECT coalesce(max(attempt_no),0)+1 AS n FROM tahfidz_exam.attempts WHERE assignment_id=$1',[x.id])).rows[0].n;
    const seed=crypto.randomUUID();const qs=selectQuestions(metadata,x.coverage,x.exam_type,seed);const rules={...validRules(x.rules),scoring_mode:'PER_JUZ_5',version:x.rules_version};const t=(await db.query(`INSERT INTO tahfidz_exam.attempts(assignment_id,attempt_no,kind,reason,examiner,rules,coverage,exam_type,seed) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[x.id,nextNo,kind,reason,x.examiner,JSON.stringify(rules),JSON.stringify(x.coverage),x.exam_type,seed])).rows[0];
    for(const q of qs)await db.query('INSERT INTO tahfidz_exam.questions(attempt_id,n,start_key,end_key,page,juz,group_no,label,mode) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[t.id,q.n,q.start,q.end,q.page,q.juz,q.group,q.label,q.mode]);await db.query("UPDATE tahfidz_exam.assignments SET status='SEDANG_UJIAN',version=version+1 WHERE id=$1",[x.id]);await audit(db,a,'START',t.id,null,{seed,questions:qs,examiner:t.examiner,kind},reason);result=await loadAttempt(db,t.id);
   }
  }else if(action==='load'){
   const r=await loadAttempt(db,b.attempt_id);if((r.assignment.unit!==r.assignment.current_unit&&!a.admin)||!canRead(a,r.assignment))fail('Tidak berwenang membaca hasil ini.',403);result=r;
  }else if(action==='save'||action==='finalize'){
   let r=await loadAttempt(db,b.attempt_id);if(r.assignment.unit!==r.assignment.current_unit||!r.assignment.aktif)fail('Status atau unit peserta telah berubah.',409);if(!canExamine(a,r.assignment)||(!a.admin&&r.attempt.examiner!==a.username)||r.attempt.examiner!==r.assignment.examiner)fail('Penguji atau penugasan berubah.',403);if(!r.assignment.is_open)fail('Periode ujian ditutup.');if(r.attempt.status!=='DRAFT'||r.attempt.version!==b.version)fail('Data telah berubah atau sudah final. Muat ulang; salinan lokal Anda tetap tersedia.',409);
   const draft=validateDraft(b.draft,r.questions),computed=score(draft,r.questions,r.attempt.exam_type,r.attempt.rules);if(action==='finalize'&&!computed.complete)fail('Tandai seluruh soal selesai atau tidak menjawab sebelum finalisasi.');
   await db.query('UPDATE tahfidz_exam.error_events SET voided=true WHERE attempt_id=$1',[r.attempt.id]);
   for(const e of draft.events)await db.query(`INSERT INTO tahfidz_exam.error_events(id,attempt_id,question_no,type,penalty_units,occurred_at,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(attempt_id,id) DO UPDATE SET question_no=excluded.question_no,type=excluded.type,penalty_units=excluded.penalty_units,voided=false`,[e.id,r.attempt.id,e.q,e.type,r.attempt.rules.weights[e.type],e.at,a.username]);
   await db.query('UPDATE tahfidz_exam.questions SET completed=(n=ANY($2::int[])) WHERE attempt_id=$1',[r.attempt.id,draft.completed]);
   const final=action==='finalize';await db.query(`UPDATE tahfidz_exam.attempts SET note=$2,version=version+1,status=$3,score=$4,passed=$5,result=$6,finalized_at=CASE WHEN $7 THEN now() ELSE NULL END WHERE id=$1`,[r.attempt.id,draft.note,final?'FINAL':'DRAFT',computed.score,computed.passed,JSON.stringify(computed),final]);
   if(final)await db.query('UPDATE tahfidz_exam.assignments SET status=$2,version=version+1 WHERE id=$1',[r.assignment.id,computed.passed?'SELESAI':'PERLU_REMEDIAL']);await audit(db,a,action.toUpperCase(),r.attempt.id,r.draft,draft);result=await loadAttempt(db,r.attempt.id);
  }else if(action==='publish'){
   const r=await loadAttempt(db,b.attempt_id);await requireManager(a,r.assignment.unit);if(r.attempt.status!=='FINAL')fail('Finalisasi terlebih dahulu.');if(r.attempt.exam_type==='UJI_KOMPETENSI_DASAR')fail('Ujian dasar dilaporkan terpisah dan tidak menggantikan nilai hafalan pada rapor lama.');
   const x=r.assignment,old=(await db.query('SELECT * FROM public.ujian_semester WHERE santri_id=$1 AND tahun_ajaran=$2 AND semester=$3 FOR UPDATE',[x.santri_id,x.tahun_ajaran,x.semester])).rows[0];
   if(old&&b.confirm_replace!==true)fail('Rapor sudah memiliki isian. Konfirmasikan penggantian aspek tahfidz saja.',409);
   const grade=Number(r.attempt.score)>=95?'A+':Number(r.attempt.score)>=85?'A':Number(r.attempt.score)>=75?'B+':Number(r.attempt.score)>=65?'B':'C';
   const perJuz=(r.attempt.result?.juz_results||[]).map((j:any)=>`Juz ${j.juz}: ${j.score} (${j.passed?'Lulus':'Remedial'})`).join('; ');
   const ket=`${perJuz?perJuz+'. ':''}Ujian semester: ${r.attempt.score}; KKM ${r.attempt.rules.kkm}: ${r.attempt.passed?'Lulus':'Belum lulus'}. Percobaan ${r.attempt.attempt_no}.`;
   const row=(await db.query(`INSERT INTO public.ujian_semester(id,santri_id,santri_nama,unit,tingkat,halaqah,musyrif,tahun_ajaran,semester,tahfidz,ket_tahfidz,tahfidz_nilai,tahfidz_ujian,penguji,tanggal,diperbarui_oleh) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,to_char(now() AT TIME ZONE 'Asia/Jakarta','YYYY-MM-DD'),$15) ON CONFLICT(santri_id,tahun_ajaran,semester) DO UPDATE SET tahfidz=excluded.tahfidz,ket_tahfidz=excluded.ket_tahfidz,tahfidz_nilai=excluded.tahfidz_nilai,tahfidz_ujian=excluded.tahfidz_ujian,penguji=excluded.penguji,tanggal=excluded.tanggal,diperbarui_oleh=excluded.diperbarui_oleh,diperbarui_pada=now() RETURNING *`,[crypto.randomUUID(),x.santri_id,x.nama,x.unit,x.tingkat,x.halaqah,x.musyrif,x.tahun_ajaran,x.semester,grade,ket,r.attempt.score,JSON.stringify(r.questions.map((q:any)=>({...q,events:r.draft.events.filter((e:any)=>e.q===q.n),attempt_id:r.attempt.id}))),r.attempt.examiner,a.username])).rows[0];
   await db.query("INSERT INTO public.sync_queue(sheet,op,payload) VALUES('UjianSemester','upsert',$1)",[JSON.stringify(row)]);await db.query('UPDATE tahfidz_exam.attempts SET published_at=now() WHERE id=$1',[r.attempt.id]);await audit(db,a,'PUBLISH_RAPOR',r.attempt.id,old,row,'Aspek tahfidz; aspek lain dipertahankan');result={ok:true};
  }else fail('Perintah ujian tidak dikenal.',404);
  if(!readActions.has(action))await db.query('INSERT INTO tahfidz_exam.requests(username,request_id,body,response) VALUES($1,$2,$3,$4)',[a.username,b.request_id,JSON.stringify(b),JSON.stringify(result)]);
  await db.query('COMMIT');return result;
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
}
