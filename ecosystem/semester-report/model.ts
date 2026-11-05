import {catalog} from './drive-schema';
import {semesterTarget} from './targets';
export const PAPER={name:'F5',width:165,height:210};
export const HEAD_NAME='Abdul Fattah Ismail Farros, Lc., M.IRKH';
export const ASPECTS=[['makhraj','Makhraj Huruf'],['tajwid','Hukum Tajwid'],['tahfidz','Tahfidz / Hafalan'],['kehadiran','Kehadiran dan Kedisiplinan'],['perkembangan','Perkembangan']];
export const IQRO=[[15,'Huruf Hijaiyah'],[16,'Huruf Sambung'],[19,'Mad Asli'],[22,'Mad Lin'],[27,'Mim Mati dan Lin'],[31,'Qalqalah'],[36,'Ghunnah'],[39,'Lafadz Allah'],[44,'Idgham'],[49,'Ikhfa'],[54,'Tes Akhir Iqro']];
export const fmt=(n:any)=>n==null||!Number.isFinite(Number(n))?'—':Number(n).toLocaleString('id-ID',{maximumFractionDigits:2});
export const pages=(bars:any)=>bars==null?'Belum ditetapkan':`${fmt(Number(bars)/15)} halaman`;
export const numericGrade=(n:any)=>n==null||n===''?'':Number(n)>=90?'A':Number(n)>=80?'B+':Number(n)>=70?'B':'C';
export function capaianGrade(actual:number,target:number){return target===0?(actual>0?'A+':''):actual/target>1?'A+':actual/target>=.9?'A':actual/target>=.8?'B+':actual/target>=.7?'B':'C';}
export function uniqueZiyadah(rows:any[]){let blanks=0;const parts=new Map<string,number>();for(const w of rows){const n=Math.max(0,Number(w.ziyadah_baris)||0),loc=String(w.ziyadah_surat||'').trim().replace(/\s+/g,' ').toLowerCase();if(loc)parts.set(loc,Math.max(parts.get(loc)||0,n));else blanks+=n;}return blanks+[...parts.values()].reduce((a,b)=>a+b,0);}
const descriptions:any={makhraj:{A:'Semua huruf keluar dari makhraj yang tepat.','B+':'Hampir semua makhraj tepat; beberapa huruf perlu diperjelas.',B:'Makhraj dasar masih memerlukan penguatan.',C:'Memerlukan bimbingan khusus makhraj dasar.'},tajwid:{A:'Menerapkan hukum tajwid dengan benar dan konsisten.','B+':'Penerapan tajwid baik dengan kesalahan ringan.',B:'Penerapan kaidah belum stabil; perlu latihan penguatan.',C:'Memerlukan pembinaan dasar hukum tajwid.'},kehadiran:{A:'Kehadiran, kesiapan, dan adab sangat baik.','B+':'Kehadiran dan kedisiplinan baik; sesekali perlu pengingat.',B:'Kedisiplinan dan kesiapan perlu pembiasaan rutin.',C:'Memerlukan pendampingan lebih intensif.'},perkembangan:{A:'Perkembangan bacaan dan hafalan signifikan serta konsisten.','B+':'Perkembangan stabil dan masih dapat ditingkatkan.',B:'Perkembangan memerlukan penguatan konsistensi.',C:'Memerlukan pendampingan untuk meningkatkan perkembangan.'}};
export function reportModel(raw:any){
 const p=raw.period,s=raw.student,w=raw.weeks||[],extra=raw.supplement?.data||{},legacy=raw.legacy||{};
 const drive=extra.drive||{},rekap=drive.rekap||{};
 const ziyadah=rekap.ziyadah_halaman!=null?Number(rekap.ziyadah_halaman)*15:uniqueZiyadah(w),tahsin=w.reduce((a:number,x:any)=>a+(Number(x.tahsin_baris)||0),0),murajaah=w.reduce((a:number,x:any)=>a+(Number(x.murajaah_baris)||0),0);
 const target=semesterTarget(s,p.semester);if(rekap.target_semester_juz!=null){target.juz=Number(rekap.target_semester_juz);target.bars=target.juz30&&target.juz===1?330:target.juz*300;target.semesterLabel=`${target.requireTahsin?'Lulus Iqro/Tahsin + ':''}${target.juz} juz (rekap rapor)`;}if(rekap.target_tahunan_juz!=null){target.annual=Number(rekap.target_tahunan_juz);target.annualLabel=`${target.annual} juz per tahun (rekap rapor)`;}const targetBars=target.bars;
 const absence=extra.ketidakhadiran||Object.fromEntries([['sakit','sakit'],['alpa','alfa'],['izin','izin']].map(([k,source])=>[k,w.reduce((a:number,x:any)=>a+(Number(x[source])||0),0)]));
 const attendance=[absence.sakit,absence.alpa,absence.izin];
 const fullExam=raw.exam?.exam_type==='HAFALAN_5_SOAL'&&raw.exam?.coverage?.mode!=='partial';
 const completedExamJuz=fullExam?(raw.exam.result?.juz_results||[]).filter((j:any)=>j.complete===true&&j.passed):[];
 const certifiedJuz=[...new Set<number>((raw.certification||[]).map((c:any)=>Number(c.juz)))].filter(j=>[1,2,3,4].every(part=>(raw.certification||[]).some((c:any)=>Number(c.juz)===j&&Number(c.bagian)===part&&c.status==='lulus')));
 const verified=new Set<number>([...certifiedJuz,...completedExamJuz.map((j:any)=>Number(j.juz))]);
 const automaticHafalan=target.juz30?verified.has(30):verified.size>=target.juz;
 const hafalanStatus=extra.status_hafalan||(automaticHafalan?'TUNTAS':'');
 const tahsinStatus=extra.status_tahsin||'';
 const targetDone=hafalanStatus==='TUNTAS'&&(!target.requireTahsin||tahsinStatus==='LULUS');
 const progress=hafalanStatus==='TUNTAS'?Math.max(ziyadah,targetBars):ziyadah;
 const latest=[...(raw.tajwid||[])].reverse();
 const aspects=ASPECTS.map(([key,label])=>{
  const manual=extra.aspek?.[key]||{};let grade=manual.predikat||'',note=manual.keterangan||'',source=grade?'Isian rapor semester':'';
  const fromMonth=latest.find(x=>x[key]||x[key+'_nilai']!=null);
  // Published exam grades measure test quality, not the guide's achievement/target ratio.
  if(!grade&&legacy[key]&&!(key==='tahfidz'&&legacy.tahfidz_ujian)){grade=legacy[key];source='Penilaian semester';note=note||legacy['ket_'+key]||'';}
  if(!grade&&['makhraj','tajwid'].includes(key)&&fromMonth){grade=fromMonth[key]||numericGrade(fromMonth[key+'_nilai']);source=`Penilaian ${fromMonth.ym}`;note=note||fromMonth['ket_'+key]||'';}
  if(!grade&&key==='tahfidz'&&(w.length||hafalanStatus==='TUNTAS')){grade=capaianGrade(progress,targetBars);source='Capaian semester menurut target program';note=note||`${pages(progress)} dari ${pages(targetBars)} (${fmt(progress/targetBars*100)}%).${target.requireTahsin?' Ketuntasan Iqro/Tahsin dinilai terpisah.':''}`;}
  // Attendance alone cannot determine discipline/adab. Missing teacher assessments stay blank.
  if(grade&&!['A+','A','B+','B','C'].includes(grade))grade='';
  return {key,label,predikat:grade||'—',keterangan:note||descriptions[key]?.[grade]||'Belum dinilai.',source:source||'Perlu penilaian musyrif/ah'};
 });
 let opening=rekap.hafalan_awal_juz!=null?Number(rekap.hafalan_awal_juz)*300:extra.hafalan_awal_baris??null;if(opening==null&&raw.balance?.verified_ym<p.from&&raw.balance.bars>=ziyadah)opening=raw.balance.bars-ziyadah;
 const total=rekap.total_hafalan_juz!=null?Number(rekap.total_hafalan_juz)*300:opening!=null?Number(opening)+ziyadah:raw.balance?.bars??null;
 const exam=raw.exam,examRows=exam?(exam.result?.juz_results?.length?exam.result.juz_results.map((j:any)=>[`Juz ${j.juz}${exam.coverage?.mode==='partial'?' · '+(exam.coverage.quarters?.length||0)+'/4 bagian':''}`,String(j.question_count||5),fmt(j.score),j.passed?'Lulus':'Perlu remedial']):exam.exam_type==='UJI_KOMPETENSI_DASAR'?(exam.result?.components||[]).map((c:any)=>[c.q===1?'Al-Fatihah · hafalan':'An-Najm 1–18 · tilawah','1',fmt(c.score),c.completed&&Number(c.score)>=Number(exam.rules?.kkm??75)?'Lulus':'Perlu remedial']):[['Ujian hafalan','5',fmt(exam.score),exam.passed?'Lulus':'Perlu remedial']]):[];
 if(exam&&exam.exam_type==='UJI_KOMPETENSI_DASAR'&&!examRows.length)examRows.push(['Tahsin/dasar · Al-Fatihah & An-Najm','2',fmt(exam.score),exam.passed?'Lulus':'Perlu remedial']);
 const iqro=IQRO.filter(([page])=>extra.iqro?.[page]||drive.iqro_catatan?.[page]).map(([page,theme])=>[String(page),String(theme),extra.iqro?.[page]||'—',drive.iqro_catatan?.[page]||'—']);if(drive.iqro_silah?.predikat||drive.iqro_silah?.keterangan)iqro.push(['22','Mad Silah (templat Excel)',drive.iqro_silah.predikat||'—',drive.iqro_silah.keterangan||'—']);
 const validScore=(n:any)=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))&&Number(n)>=0&&Number(n)<=100;
 const examScore=validScore(exam?.score)?Number(exam.score):validScore(legacy.tahfidz_nilai)?Number(legacy.tahfidz_nilai):validScore(extra.nilai_ujian_semester)?Number(extra.nilai_ujian_semester):null;
 const examSource=validScore(exam?.score)?'Hasil ujian final aplikasi':validScore(legacy.tahfidz_nilai)?'Nilai ujian semester tersimpan':validScore(extra.nilai_ujian_semester)?'Isian musyrif/ah (ujian luring)':'Belum diisi';
 const canEnterExamScore=!validScore(exam?.score)&&!validScore(legacy.tahfidz_nilai);
 const statusLabel=tahsinStatus==='LULUS'?'Lulus':tahsinStatus==='BELUM_LULUS'?'Belum lulus':'Belum dinilai';
 const hafalanLabel=hafalanStatus==='TUNTAS'?'Tuntas':hafalanStatus==='BELUM_TUNTAS'?'Belum tuntas':'Belum diverifikasi';
 const summary=[['Hafalan awal semester',rekap.hafalan_awal_juz!=null?fmt(rekap.hafalan_awal_juz)+' juz':pages(opening)],['Ziyadah semester',pages(ziyadah)],['Target semester',target.semesterLabel],['Target hafalan tahunan',target.annualLabel],['Total hafalan',rekap.total_hafalan_juz!=null?fmt(rekap.total_hafalan_juz)+' juz':pages(total)],['Ketuntasan Iqro/Tahsin',statusLabel],['Ketuntasan hafalan target',hafalanLabel],['Capaian target semester',targetDone?'Tuntas':hafalanStatus==='BELUM_TUNTAS'||target.requireTahsin&&tahsinStatus==='BELUM_LULUS'?'Belum tuntas':'Belum lengkap / perlu verifikasi']];
 if(rekap.capaian_target)summary.push(['Capaian target (rekap rapor)',String(rekap.capaian_target)]);
 const suratRows=catalog.surahs.filter(x=>drive.surat?.[x.id]).map(x=>({...x,...drive.surat[x.id]}));
 const quarterBlocks=(drive.juz||[]).map((block:any,index:number)=>({...block,index}));
 const halfRows=Object.entries(drive.setengah||{}).flatMap(([juz,parts]:any)=>Object.entries(parts).map(([part,v]:any)=>({juz:Number(juz),bagian:Number(part),...v}))).sort((a,b)=>a.juz-b.juz||a.bagian-b.bagian);
 const date=extra.tanggal||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return {...raw,extra,drive,suratRows,quarterBlocks,halfRows,displayClass:drive.kelas||s.tingkat,aspects,summary,examRows,iqro,opening,total,ziyadah,tahsin,murajaah,attendance,absence,target,targetDone,tahsinStatus,hafalanStatus,examScore,examSource,canEnterExamScore,date,title:'RAPOR PERKEMBANGAN TAHSIN DAN TAHFIZH AL-QUR’AN',periodLabel:`${p.year} · ${p.semester===1?'Ganjil':'Genap'} (Semester ${p.semester})`,notes:extra.catatan||legacy.catatan||'',headName:HEAD_NAME,warnings:[...aspects.filter(x=>x.predikat==='—').map(x=>x.label+' belum dinilai.'),...(opening==null?['Hafalan awal semester belum ditetapkan; lengkapi dari data yang terverifikasi.']:[]),...(examScore==null?['Nilai ujian semester belum tersedia.']:[]),...(target.requireTahsin&&!tahsinStatus?['Ketuntasan Iqro/Tahsin belum dinilai.']:[]),...(!hafalanStatus?['Ketuntasan hafalan target belum diverifikasi.']:[]),...(!s.musyrif?['Musyrif/ah santri belum ditetapkan.']:[])]};
}
