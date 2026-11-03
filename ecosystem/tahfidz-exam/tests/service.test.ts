import {before,after,test} from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import fs from 'node:fs';import {examService,actorFromToken} from '../../functions/ujian-tahfidz/service.ts';import {DEFAULT_RULES} from '../core/engine.ts';
let db:PGlite,serial=Promise.resolve();const pool={connect:async()=>{let release:any;const wait=serial;serial=new Promise<void>(r=>release=r);await wait;return {query:async(sql:string,args:any[]=[])=>sql.includes('pg_advisory_xact_lock')?{rows:[]}:db.query(sql,args),release};}};
const admin={username:'admin',nama:'Pengelola',admin:true,coordinator_units:[],musyrif_master:''};const teacher={username:'teacher',units:['SMP Ikhwan'],nama:'Penguji',admin:false,coordinator_units:[],musyrif_master:'Guru B'};const other={username:'other',units:['MA Akhwat'],nama:'Lain',admin:false,coordinator_units:[],musyrif_master:'Guru C'};
const call=(a:any,b:any)=>examService(a,{...b,request_id:b.request_id||crypto.randomUUID()},pool);
let period:any,assignment:any,attempt:any,first:any;
before(async()=>{db=new PGlite();await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;
CREATE TABLE public.akun(username text PRIMARY KEY,password text,nama text,role text,musyrif_master text,aktif text);CREATE TABLE public.sesi(token text PRIMARY KEY,data jsonb,expires_at timestamptz);
CREATE TABLE public.santri(id text PRIMARY KEY,nama text,unit text,tingkat text,halaqah text,musyrif text,aktif boolean);CREATE TABLE public.hafalan(santri_id text,baris_terverifikasi int,terverifikasi_pada timestamptz,juz_selesai text,target_juz int,juz_diuji text);CREATE TABLE public.penilaian_tajwid(santri_id text,ym text,makhraj text,tajwid text,diperbarui_pada timestamptz default now());
CREATE TABLE public.ujian_semester(id text PRIMARY KEY,santri_id text,santri_nama text,unit text,tingkat text,halaqah text,musyrif text,tahun_ajaran text,semester int,tahfidz text,ket_tahfidz text,tahfidz_nilai numeric,tahfidz_ujian jsonb,penguji text,tanggal text,diperbarui_oleh text,diperbarui_pada timestamptz default now(),makhraj_nilai numeric,UNIQUE(santri_id,tahun_ajaran,semester));CREATE TABLE public.sync_queue(sheet text,op text,payload jsonb);
INSERT INTO public.akun VALUES('admin','','Pengelola','pimpinan','','Y'),('teacher','','Penguji','musyrif','Guru B','Y'),('other','','Guru Lain','musyrif','Guru C','Y');INSERT INTO public.santri VALUES('s1','Santri Contoh','SMP Ikhwan','7','A','Guru A',true),('s2','Santri Lain','MA Akhwat','10','B','Guru C',true);`);
await db.exec(fs.readFileSync('ecosystem/tahfidz-exam/schema.sql','utf8'));await call(admin,{action:'staff',username:'teacher',unit:'SMP Ikhwan',role:'examiner'});period=(await call(admin,{action:'period',tahun_ajaran:'2026/2027',semester:1,rules:DEFAULT_RULES,is_open:true})).period;
});
after(async()=>{await db.close();});
test('full database lifecycle, scoped reads, optimistic locking, retries, remedial, rapor and RLS on isolated PostgreSQL',async()=>{
 const coverage={juz:30,start:'78:1',end:'114:6',target:'BELUM_TUNTAS',verified:true};const request_id=crypto.randomUUID();const prepare={action:'prepare',period_id:period.id,unit:'SMP Ikhwan',students:['s1'],exam_type:'HAFALAN_5_SOAL',coverage,request_id};
 const p=await call(admin,prepare);assert.equal(p.prepared,1);assert.deepEqual(await call(admin,prepare),p);assert.equal((await db.query('SELECT * FROM tahfidz_exam.assignments')).rows.length,1);await assert.rejects(call(admin,{...prepare,students:['s2']}),/Kunci permintaan/);
 assignment=(await call(teacher,{action:'participants',period_id:period.id})).rows[0];assert.equal(assignment.examiner,'teacher');assert.equal((await call(other,{action:'participants',period_id:period.id})).rows.length,0);
 await assert.rejects(call(other,{action:'start',assignment_id:assignment.id}),/unit penugasan/);const started=await call(teacher,{action:'start',assignment_id:assignment.id});attempt=started.attempt;
 assert.equal(started.questions.length,5);assert.equal((await call(teacher,{action:'start',assignment_id:assignment.id})).attempt.id,attempt.id);
 await assert.rejects(call(other,{action:'load',attempt_id:attempt.id}),/Tidak berwenang/);
 const draft={events:Array.from({length:30},()=>({id:crypto.randomUUID(),q:1,type:'JALI',at:new Date().toISOString()})),completed:[1,2,3,4,5],note:'Catatan contoh'};
 const save={action:'save',attempt_id:attempt.id,version:attempt.version,draft,request_id:crypto.randomUUID()};const saved=await call(teacher,save);assert.equal(saved.attempt.score,'70.00');assert.equal((await call(teacher,save)).attempt.version,saved.attempt.version);await assert.rejects(call(teacher,{...save,request_id:crypto.randomUUID()}),/Data telah berubah/);
 const final={action:'finalize',attempt_id:attempt.id,version:saved.attempt.version,draft};const race=await Promise.allSettled([call(teacher,final),call(teacher,final)]);assert.equal(race.filter(x=>x.status==='fulfilled').length,1);first=(race.find(x=>x.status==='fulfilled') as any).value;
 assert.equal(first.attempt.status,'FINAL');assert.equal(first.attempt.passed,false);
 await assert.rejects(call(teacher,{action:'save',attempt_id:attempt.id,version:first.attempt.version,draft}),/sudah final/);
 await assert.rejects(call(teacher,{action:'start',assignment_id:assignment.id,reason:'Latihan ulang'}),/Pengelola/);
 const remedial=await call(admin,{action:'start',assignment_id:assignment.id,reason:'Perbaikan kelancaran'});assert.equal(remedial.attempt.attempt_no,2);assert.equal(remedial.attempt.rules.kkm,75);
 await call(admin,{action:'period',tahun_ajaran:'2026/2027',semester:1,rules:{...DEFAULT_RULES,kkm:95},is_open:true});
 const final2=await call(teacher,{action:'finalize',attempt_id:remedial.attempt.id,version:remedial.attempt.version,draft:{events:[],completed:[1,2,3,4,5],note:''}});assert.equal(final2.attempt.rules.kkm,75);assert.equal((await call(teacher,{action:'history',assignment_id:assignment.id})).attempts.length,2);assert.equal((await call(teacher,{action:'load',attempt_id:first.attempt.id})).attempt.score,'70.00');
 await db.query("INSERT INTO public.ujian_semester(id,santri_id,tahun_ajaran,semester,makhraj_nilai) VALUES('legacy','s1','2026/2027',1,88)");
 await call(admin,{action:'publish',attempt_id:final2.attempt.id,confirm_replace:true});const legacy=(await db.query('SELECT * FROM public.ujian_semester')).rows[0] as any;assert.equal(legacy.makhraj_nilai,'88');assert.equal(Number(legacy.tahfidz_nilai),100);assert.equal((await db.query('SELECT * FROM public.sync_queue')).rows.length,1);
 await db.exec('SET ROLE anon');await assert.rejects(db.query('SELECT * FROM tahfidz_exam.attempts'),/permission denied/);await db.exec('RESET ROLE');
 const old=(await db.query('SELECT count(*)::int n FROM tahfidz_exam.attempts')).rows[0] as any;assert.equal(old.n,2);
});
test('active account and session metadata are verified; forged role is rejected',async()=>{await db.query("INSERT INTO public.sesi VALUES('test-token',$1,now()+interval '1 hour')",[JSON.stringify({username:'teacher',role:'musyrif',musyrif_master:'Guru B'})]);assert.equal((await actorFromToken('test-token',(s:any,a:any)=>db.query(s,a))).admin,false);await db.query("UPDATE public.sesi SET data=jsonb_set(data,'{role}','\"pimpinan\"') WHERE token='test-token'");await assert.rejects(actorFromToken('test-token',(s:any,a:any)=>db.query(s,a)),/Sesi atau penugasan/);});

test('semester is created automatically and full unit roster is visible before preparation',async()=>{
 const b=await call(teacher,{action:'bootstrap'});assert.ok(b.active_period_id);assert.ok(b.periods.some(p=>p.id===b.active_period_id&&p.is_open));
 await db.query("INSERT INTO public.santri VALUES('s3','Santri Unit Sama','SMP Ikhwan','8','Lain','Guru X',true)");
 const r=await call(teacher,{action:'roster',period_id:b.active_period_id});assert.ok(r.rows.some(s=>s.santri_id==='s3'&&s.unprepared));assert.ok(!r.rows.some(s=>s.santri_id==='s2'));
 const coverage={juz:30,start:'78:1',end:'114:6',target:'BELUM_TUNTAS',verified:true};
 await assert.rejects(call(other,{action:'begin-student',period_id:b.active_period_id,santri_id:'s3',exam_type:'HAFALAN_5_SOAL',coverage}),/unit penugasan/);
 const prep=await call(teacher,{action:'begin-student',period_id:b.active_period_id,santri_id:'s3',exam_type:'HAFALAN_5_SOAL',coverage});const opened=await call(teacher,{action:'start',assignment_id:prep.assignment_id});assert.equal(opened.attempt.examiner,'teacher');
 const colleague={...teacher,username:'admin',admin:false};const read=await call(colleague,{action:'load',attempt_id:opened.attempt.id});assert.equal(read.assignment.santri_id,'s3');
 await assert.rejects(call(colleague,{action:'save',attempt_id:opened.attempt.id,version:opened.attempt.version,draft:opened.draft}),/Penguji atau penugasan/);
});

test('restart archives draft, releases same-unit examiner, preserves history and rejects stale/final/cross-unit writes',async()=>{
 const roster=await call(teacher,{action:'roster',period_id:period.id});const row=roster.rows.find(s=>s.santri_id==='s3');const draft=await call(teacher,{action:'load',attempt_id:row.attempt_id});
 await assert.rejects(call(other,{action:'restart',attempt_id:draft.attempt.id,version:draft.attempt.version,reason:'Salah memilih santri'}),/unit penugasan/);
 const colleague={...teacher,username:'admin',admin:false};const body={action:'restart',attempt_id:draft.attempt.id,version:draft.attempt.version,request_id:crypto.randomUUID()};const cancelled=await call(colleague,body);assert.equal(cancelled.ok,true);assert.deepEqual(await call(colleague,body),cancelled);
 const archived=await call(teacher,{action:'load',attempt_id:draft.attempt.id});assert.equal(archived.attempt.status,'BATAL');assert.equal(archived.attempt.reason,'Restart sesi ujian');
 await assert.rejects(call(teacher,{action:'save',attempt_id:draft.attempt.id,version:draft.attempt.version,draft:draft.draft}),/Data telah berubah|sudah final/);
 const ready=(await call(teacher,{action:'roster',period_id:period.id})).rows.find(s=>s.santri_id==='s3');assert.equal(ready.attempt_id,null);assert.equal(ready.status,'SUDAH_DITUGASKAN');assert.equal(ready.score,null);assert.equal(ready.penguji,null);
 const restarted=await call(colleague,{action:'start',assignment_id:cancelled.assignment_id});assert.equal(restarted.attempt.examiner,'admin');assert.equal(restarted.attempt.attempt_no,draft.attempt.attempt_no+1);assert.equal(restarted.draft.events.length,0);assert.equal(restarted.draft.completed.length,0);
 const history=await call(teacher,{action:'history',assignment_id:cancelled.assignment_id});assert.ok(history.attempts.some(t=>t.id===draft.attempt.id&&t.status==='BATAL'));
 await assert.rejects(call(admin,{action:'restart',attempt_id:first.attempt.id,version:first.attempt.version,reason:'Mengubah hasil final'}),/sudah berubah|final/);
});

test('multi-juz material and scoped context, then partial/tahsin changes archive drafts without touching finalized results',async()=>{
 await db.query("INSERT INTO public.santri VALUES('s4','Contoh Materi','SMP Ikhwan','8','A','Guru B',true)");
 await db.query("INSERT INTO public.hafalan(santri_id,juz_selesai,juz_diuji,target_juz,baris_terverifikasi) VALUES('s4','30,29','30',1,260)");await db.query("INSERT INTO public.penilaian_tajwid(santri_id,ym,makhraj,tajwid) VALUES('s4','2026-09','B','B+')");
 await assert.rejects(call(other,{action:'student-context',santri_id:'s4'}),/unit penugasan/);const context=await call(teacher,{action:'student-context',santri_id:'s4'});assert.equal(context.tajwid.makhraj,'B');assert.equal(context.hafalan.juz_selesai,'30,29');
 const coverage={juz:30,start:'78:1',end:'114:6',target:'TUNTAS',verified:true,mode:'full',ranges:[{juz:30,start:'78:1',end:'114:6'},{juz:29,start:'67:1',end:'77:50'}]};
 const prep=await call(teacher,{action:'begin-student',period_id:period.id,santri_id:'s4',exam_type:'HAFALAN_5_SOAL',coverage});const multi=await call(teacher,{action:'start',assignment_id:prep.assignment_id});assert.equal(multi.questions.length,5);assert.equal(new Set(multi.questions.map(q=>q.juz)).size,2);assert.equal(multi.attempt.coverage.ranges.length,2);
 const saved=await call(teacher,{action:'save',attempt_id:multi.attempt.id,version:multi.attempt.version,draft:{events:[{id:crypto.randomUUID(),q:4,type:'JALI',at:new Date().toISOString()}],completed:[4],note:'Contoh draf tersimpan'}});assert.equal(Number(saved.attempt.score),99);
 const partial={juz:30,start:'78:1',end:'81:29',target:'BELUM_TUNTAS',verified:true,mode:'partial'};
 await assert.rejects(call(other,{action:'change-material',attempt_id:saved.attempt.id,version:saved.attempt.version,exam_type:'HAFALAN_5_SOAL',coverage:partial}),/unit penugasan/);
 await assert.rejects(call(teacher,{action:'change-material',attempt_id:saved.attempt.id,version:multi.attempt.version,exam_type:'HAFALAN_5_SOAL',coverage:partial}),/sudah berubah/);
 const body={action:'change-material',attempt_id:saved.attempt.id,version:saved.attempt.version,exam_type:'HAFALAN_5_SOAL',coverage:partial,request_id:crypto.randomUUID()};const changed=await call(teacher,body);assert.deepEqual(await call(teacher,body),changed);
 const archived=await call(teacher,{action:'load',attempt_id:saved.attempt.id});assert.equal(archived.attempt.status,'BATAL');assert.equal(archived.draft.events.length,1);assert.equal(archived.draft.note,'Contoh draf tersimpan');
 const partialSession=await call(teacher,{action:'start',assignment_id:prep.assignment_id});assert.equal(partialSession.attempt.coverage.mode,'partial');assert.ok(partialSession.questions.every(q=>Number(q.start.split(':')[0])<=81));
 const basics={juz:1,start:'1:1',end:'1:7',target:'BELUM_WAJIB',verified:true,mode:'basic'};
 await call(teacher,{action:'change-material',attempt_id:partialSession.attempt.id,version:partialSession.attempt.version,exam_type:'UJI_KOMPETENSI_DASAR',coverage:basics});const basic=await call(teacher,{action:'start',assignment_id:prep.assignment_id});assert.deepEqual(basic.questions.map(q=>q.start),['1:1','53:1']);
 const final=await call(teacher,{action:'finalize',attempt_id:basic.attempt.id,version:basic.attempt.version,draft:{events:[],completed:[1,2],note:''}});assert.equal(Number(final.attempt.score),100);
 await assert.rejects(call(teacher,{action:'change-material',attempt_id:final.attempt.id,version:final.attempt.version,exam_type:'HAFALAN_5_SOAL',coverage}),/sudah berubah|final/);
 const history=await call(teacher,{action:'history',assignment_id:prep.assignment_id});assert.deepEqual(history.attempts.map(t=>t.status),['BATAL','BATAL','FINAL']);
});
