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
 const ziyadah=uniqueZiyadah(w),tahsin=w.reduce((a:number,x:any)=>a+(Number(x.tahsin_baris)||0),0),murajaah=w.reduce((a:number,x:any)=>a+(Number(x.murajaah_baris)||0),0);
 const classNo=Number(s.tingkat)||({VII:7,VIII:8,IX:9,X:10,XI:11,XII:12} as any)[s.tingkat]||0,level=[7,10].includes(classNo)?0:[8,11].includes(classNo)?1:[9,12].includes(classNo)?2:null;
 const semesterNo=level==null?null:level*2+p.semester,targetJuz=semesterNo==null?null:[null,null,30,29,1,2,3][semesterNo],targetBars=semesterNo===1?0:targetJuz===30?330:targetJuz?300:null;
 const attendance=['hadir','sakit','izin','alfa'].map(k=>w.reduce((a:number,x:any)=>a+(Number(x[k])||0),0)),meetings=attendance.reduce((a,b)=>a+b,0);
 const latest=[...(raw.tajwid||[])].reverse();
 const aspects=ASPECTS.map(([key,label])=>{
  const manual=extra.aspek?.[key]||{};let grade=manual.predikat||'',note=manual.keterangan||'',source=grade?'Isian rapor semester':'';
  const fromMonth=latest.find(x=>x[key]||x[key+'_nilai']!=null);
  // Published exam grades measure test quality, not the guide's achievement/target ratio.
  if(!grade&&legacy[key]&&!(key==='tahfidz'&&legacy.tahfidz_ujian)){grade=legacy[key];source='Penilaian semester';note=note||legacy['ket_'+key]||'';}
  if(!grade&&['makhraj','tajwid'].includes(key)&&fromMonth){grade=fromMonth[key]||numericGrade(fromMonth[key+'_nilai']);source=`Penilaian ${fromMonth.ym}`;note=note||fromMonth['ket_'+key]||'';}
  if(!grade&&key==='tahfidz'&&w.length&&targetBars!=null){grade=capaianGrade(ziyadah,targetBars);source='Capaian semester menurut panduan';note=note||(targetBars===0?'Fokus tahsin/iqro; sudah mulai menghafal.':`${pages(ziyadah)} dari ${pages(targetBars)} (${fmt(ziyadah/targetBars*100)}%).`);}
  // Attendance alone cannot determine discipline/adab. Missing teacher assessments stay blank.
  if(grade&&!['A+','A','B+','B','C'].includes(grade))grade='';
  return {key,label,predikat:grade||'—',keterangan:note||descriptions[key]?.[grade]||'Belum dinilai.',source:source||'Perlu penilaian musyrif/ah'};
 });
 let opening=extra.hafalan_awal_baris??null;if(opening==null&&raw.balance?.verified_ym<p.from)opening=Math.max(0,raw.balance.bars-ziyadah);
 const total=opening!=null?Number(opening)+ziyadah:raw.balance?.bars??null;
 const exam=raw.exam,examRows=exam?(exam.result?.juz_results?.length?exam.result.juz_results.map((j:any)=>[`Juz ${j.juz}${exam.coverage?.mode==='partial'?' · '+(exam.coverage.quarters?.length||0)+'/4 bagian':''}`,String(j.question_count||5),fmt(j.score),j.passed?'Lulus':'Perlu remedial']):exam.exam_type==='UJI_KOMPETENSI_DASAR'?(exam.result?.components||[]).map((c:any)=>[c.q===1?'Al-Fatihah · hafalan':'An-Najm 1–18 · tilawah','1',fmt(c.score),c.completed&&Number(c.score)>=Number(exam.rules?.kkm??75)?'Lulus':'Perlu remedial']):[['Ujian hafalan','5',fmt(exam.score),exam.passed?'Lulus':'Perlu remedial']]):[];
 if(exam&&exam.exam_type==='UJI_KOMPETENSI_DASAR'&&!examRows.length)examRows.push(['Tahsin/dasar · Al-Fatihah & An-Najm','2',fmt(exam.score),exam.passed?'Lulus':'Perlu remedial']);
 const iqro=IQRO.filter(([page])=>extra.iqro?.[page]).map(([page,theme])=>[String(page),String(theme),extra.iqro[page]]);
 const summary=[['Hafalan awal semester',pages(opening)],['Ziyadah semester',pages(ziyadah)],['Target hafalan semester',targetBars==null?'Belum ditetapkan':targetBars===0?'Fokus tahsin / Iqro':`1 juz (Juz ${targetJuz}) · ${pages(targetBars)}`],['Target hafalan tahunan',level==null?'Belum ditetapkan':level===0?'1 juz (Juz 30)':'2 juz ('+(level===1?'Juz 29 dan 1':'Juz 2 dan 3')+')'],['Total hafalan',pages(total)],['Capaian target',targetBars==null?'Belum ditetapkan':targetBars===0?'Fokus tahsin / Iqro':w.length?(ziyadah>=targetBars?'Tuntas':'Belum tuntas'):'Belum ada catatan semester']];
 const date=extra.tanggal||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return {...raw,extra,aspects,summary,examRows,iqro,opening,total,ziyadah,tahsin,murajaah,attendance,meetings,date,title:'RAPOR PERKEMBANGAN TAHSIN DAN TAHFIZH AL-QUR’AN',periodLabel:`${p.year} · ${p.semester===1?'Ganjil':'Genap'} (Semester ${p.semester})`,notes:extra.catatan||legacy.catatan||'',headName:HEAD_NAME,warnings:[...aspects.filter(x=>x.predikat==='—').map(x=>x.label+' belum dinilai.'),...(opening==null?['Hafalan awal semester belum ditetapkan; lengkapi dari data yang terverifikasi.']:[]),...(!exam?['Hasil ujian semester final belum tersedia.']:[]),...(!s.musyrif?['Musyrif/ah santri belum ditetapkan.']:[])]};
}
