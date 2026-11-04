import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import {PAPER,fmt,pages} from './model';
// Text stays vector-based and selectable. Every overflow page keeps the F5 media box.
export async function createSemesterPdf(m:any,logo?:string){
 const doc=new jsPDF({unit:'mm',format:[PAPER.width,PAPER.height],orientation:'portrait',compress:true});
 if(logo===undefined){const response=await fetch('/logo-nuris.png');if(!response.ok)throw Error('Logo Nuris belum dapat dimuat. Coba unduh kembali.');const b=await response.blob();logo=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(b);});}
 const clean=(x:any)=>String(x??'—').replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/·/g,' | ').replace(/≥/g,'>=').replace(/¼/g,'1/4').replace(/½/g,'1/2').replace(/¾/g,'3/4');
 let y=17;const bottom=194,margin=10;
 const table=(head:any[],body:any[],widths?:Record<number,any>)=>{autoTable(doc,{startY:y,head:head.length?[head.map(clean)]:undefined,body:body.map(row=>row.map(clean)),margin:{left:margin,right:margin,top:18,bottom:17},tableWidth:145,theme:'grid',styles:{font:'helvetica',fontSize:8.2,cellPadding:1.5,overflow:'linebreak',lineColor:[185,199,188],lineWidth:.15,textColor:[25,44,33]},headStyles:{fillColor:[21,75,45],textColor:255,fontStyle:'bold'},alternateRowStyles:{fillColor:[246,249,247]},columnStyles:widths,rowPageBreak:'avoid',showHead:'everyPage'});y=(doc as any).lastAutoTable.finalY+4;};
 const newPage=()=>{doc.addPage([165,210]);y=20;};
 const section=(title:string)=>{if(y>bottom-17)newPage();doc.setTextColor(21,75,45);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(clean(title),margin,y);y+=3;};
 const paragraph=(text:string)=>{const lines=doc.splitTextToSize(clean(text),145);doc.setFont('helvetica','normal');doc.setFontSize(8.4);doc.setTextColor(25,44,33);for(const line of lines){if(y>bottom-3)newPage();doc.text(line,10,y);y+=4;}y+=3;};
 if(logo)doc.addImage(logo,'PNG',10,9,16,16);
 doc.setTextColor(21,75,45);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('RAPOR PERKEMBANGAN',94,12,{align:'center'});doc.text('TAHSIN DAN TAHFIZH AL-QUR\'AN',94,17,{align:'center'});doc.setFontSize(9);doc.text('PESANTREN NURUL ISLAM TENGARAN',94,22,{align:'center'});doc.setDrawColor(21,75,45);doc.line(10,28,155,28);y=31;
 table([],[[`Nama: ${m.student.nama}`,`Kelas: ${m.student.tingkat} | ${m.student.unit} | ${m.target.program}`],[`Kamar: ${m.extra.kamar||'—'}`,`TA/Semester: ${m.periodLabel}`],[`Halaqah: ${m.student.halaqah||'—'}`,`Musyrif/ah: ${m.student.musyrif||'Belum ditetapkan'}`]],{0:{cellWidth:72},1:{cellWidth:73}});
 section('Penilaian semester');table(['No.','Aspek penilaian','Predikat','Keterangan'],m.aspects.map((a:any,i:number)=>[i+1,a.label,a.predikat,a.keterangan]),{0:{cellWidth:8},1:{cellWidth:38},2:{cellWidth:16},3:{cellWidth:83}});
 section('Nilai ujian semester (0–100)');table([],[[fmt(m.examScore),m.examSource]],{0:{cellWidth:35},1:{cellWidth:110}});
 paragraph('Rincian nilai per juz/komponen: lampiran capaian semester.');
 section('Ringkasan hafalan semester');table([],Array.from({length:Math.ceil(m.summary.length/2)},(_,i)=>[...m.summary[i*2],...(m.summary[i*2+1]||['',''])]),{0:{cellWidth:32},1:{cellWidth:40},2:{cellWidth:32},3:{cellWidth:41}});
 section('Ketidakhadiran');table(['Sakit','Alpa','Izin'],[m.attendance]);
 section('Catatan musyrif/ah');paragraph(m.notes||'—');
 if(y>bottom-34)newPage();doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text('Tengaran, '+new Date(m.date+'T12:00:00Z').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}),155,y,{align:'right'});y+=6;
 doc.text('Musyrif / Musyrifah',43,y,{align:'center'});doc.text('Kepala Bidang Kepesantrenan',116,y,{align:'center'});y+=19;
 doc.setFont('helvetica','bold');const nameLines=doc.splitTextToSize(clean(m.student.musyrif||'(belum ditetapkan)'),68),headLines=doc.splitTextToSize(clean(m.headName),68);doc.text(nameLines,43,y,{align:'center'});doc.text(headLines,116,y,{align:'center'});
 // Long achievements are an appendix, never shrunk into an unreadable single sheet.
 newPage();section('RINCIAN CAPAIAN DAN PENILAIAN SEMESTER');
 section('Hasil ujian semester');table(['Nilai / 100','Sumber'],[[fmt(m.examScore),m.examSource]]);
 if(m.examRows.length){table(['Materi','Soal','Nilai / 100','Hasil'],m.examRows,{0:{cellWidth:59},1:{cellWidth:14},2:{cellWidth:27},3:{cellWidth:45}});paragraph(`Penguji: ${m.exam.penguji||'—'}. ${m.exam.exam_type==='UJI_KOMPETENSI_DASAR'?'Nilai kompetensi dasar; tidak dianggap satu juz hafalan.':'Setiap juz memiliki nilai awal 100. Rata-rata ujian: '+fmt(m.exam.score)+'.'}${m.exam.note?' Catatan: '+m.exam.note:''}`);}else paragraph('Belum ada ujian final untuk semester ini. Draf ujian tidak dicetak sebagai nilai resmi.');
 section('Ketidakhadiran dan kegiatan semester');table(['Sakit','Alpa','Izin'],[m.attendance]);table(['Tahsin','Ziyadah baru*','Murajaah'],[[pages(m.tahsin),pages(m.ziyadah),pages(m.murajaah)]]);
 section('Perkembangan makhraj dan tajwid');table(['Bulan','Makhraj','Tajwid','Catatan'],m.tajwid.length?m.tajwid.map((x:any)=>[x.ym,x.makhraj||fmt(x.makhraj_nilai),x.tajwid||fmt(x.tajwid_nilai),[x.ket_makhraj,x.ket_tajwid,x.catatan].filter(Boolean).join(' / ')||'—']):[['—','—','—','Belum ada penilaian pada semester ini.']]);
 section('Iqro klasikal');if(m.iqro.length)table(['Halaman','Materi','Predikat'],m.iqro);else paragraph('Belum ada penilaian Iqro klasikal. Nilai ujian dasar tidak otomatis diubah menjadi nilai setiap materi Iqro.');
 const locations=new Map<string,any>();for(const w of m.weeks){const loc=String(w.ziyadah_surat||'').trim();if(!loc)continue;const k=loc.toLocaleLowerCase();const old=locations.get(k);if(!old||Number(w.ziyadah_baris)>=Number(old.ziyadah_baris))locations.set(k,w);}
 section('Rincian hafalan / surat semester');table(['Surat / materi tercatat','Capaian','Nilai setoran'],[...locations.values()].length?[...locations.values()].map(w=>[w.ziyadah_surat,pages(w.ziyadah_baris),fmt(w.nilai_ziyadah)]):[['Belum ada rincian surat tercatat.','—','—']],{0:{cellWidth:90},1:{cellWidth:30},2:{cellWidth:25}});
 section('Sertifikasi per 1/4 juz sampai akhir semester');table(['Juz','Bagian','Nilai','Keterangan'],m.certification.length?m.certification.map((c:any)=>[c.juz,c.bagian,fmt(c.nilai),c.status+' | '+c.tanggal_ujian]):[['—','—','—','Belum ada sertifikasi tercatat.']]);
 section('Rekap kegiatan pekanan semester');table(['Bulan / pekan','T/Z/M (hal.)','Materi dan catatan'],m.weeks.length?m.weeks.map((w:any)=>[w.ym+' / '+w.pekan,[w.tahsin_baris,w.ziyadah_baris,w.murajaah_baris].map((n:any)=>fmt(Number(n||0)/15)).join(' / '),[w.ziyadah_surat,w.murajaah_juz,w.catatan].filter(Boolean).join(' | ')||'—']):[['—','—','Belum ada kegiatan tercatat.']],{0:{cellWidth:27},1:{cellWidth:31},2:{cellWidth:87}});
 section('Keterangan sumber penilaian');paragraph('* Ziyadah semester: materi berlabel sama dihitung sebesar capaian tertinggi; entri tanpa label dijumlahkan. Rincian pekanan disertakan untuk pemeriksaan. 15 baris = 1 halaman. Predikat hafalan mengikuti target program (reguler atau tahfidz/PK), sedangkan nilai ujian per juz menunjukkan kualitas ujian. Semester pertama santri baru reguler: lulus Iqro/Tahsin dan tuntas Juz 30; tahunan 2 juz. Tahfidz/PK: lulus Iqro/Tahsin dan 2 juz; tahunan 4 juz.');
 for(const a of m.aspects)paragraph(a.label+': '+a.source+'.');
 if(m.warnings.length){section('Isian yang perlu dilengkapi');paragraph(m.warnings.join(' '));}
 const count=doc.getNumberOfPages();for(let i=1;i<=count;i++){doc.setPage(i);if(i>1){doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(21,75,45);doc.text(doc.splitTextToSize(clean(`${m.student.nama} | ${m.periodLabel}`),145).slice(0,2),10,9);doc.setDrawColor(185,199,188);doc.line(10,14,155,14);}doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(85,100,90);doc.text(`F5 165 x 210 mm | ${i}/${count}`,155,204,{align:'right'});doc.text('Rapor Al-Qur\'an semester',10,204);}
 return doc;
}
export async function downloadSemesterPdf(m:any){const doc=await createSemesterPdf(m);doc.save(`Rapor-Al-Quran-${m.student.nama.replace(/[^a-z0-9-]/gi,'-')}-${m.period.year.replace('/','-')}-S${m.period.semester}.pdf`);}
