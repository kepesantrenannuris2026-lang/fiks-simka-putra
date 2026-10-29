import {jsPDF} from 'jspdf';import autoTable from 'jspdf-autotable';
import {activities,monthlyReport,semesterReport,todayWIB,Entry} from './model';
import {coordinatorName} from '../lib/coordinators';
export const monthLabel=(s:string)=>new Date(s+'-01T00:00:00Z').toLocaleDateString('id-ID',{month:'long',year:'numeric',timeZone:'Asia/Jakarta'});
const clean=(s:any)=>String(s??'').replace(/[’‘]/g,"'").replace(/[–—]/g,'-').replace(/≥/g,'>=');
export function createYaumiyyahPdf({student,entries,months,logo,asOf=todayWIB()}:{student:any;entries:Entry[];months:string[];logo:string;asOf?:string}){
 const sem=months.length>1;const data=sem?semesterReport(months,entries,asOf):monthlyReport(months[0],entries,asOf);const doc=new jsPDF({format:'a4',unit:'mm',compress:true});
 const green:[number,number,number]=[13,74,40];const title=sem?'RAPOR MUTABAAH YAUMIYYAH SEMESTER':'RAPOR MUTABAAH YAUMIYYAH BULANAN';
 doc.addImage(logo,'PNG',15,13,18,18);doc.setTextColor(...green);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('PESANTREN NURUL ISLAM TENGARAN',39,19);doc.setFontSize(10);doc.text(title,39,25);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(94,111,101);doc.text(sem?monthLabel(months[0])+' - '+monthLabel(months.at(-1)!):monthLabel(months[0]),39,30);
 doc.setDrawColor(...green);doc.setLineWidth(.6);doc.line(15,36,195,36);
 doc.setFontSize(10);doc.setTextColor(18,34,25);doc.setFont('helvetica','bold');const name=doc.splitTextToSize(clean(student.nama),155);doc.text(name,15,44);let y=45+name.length*4;
 doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(clean('Kelas '+student.kelas+' | Unit '+student.unit+' | Musyrif/ah: '+(student.musyrif||'-')),15,y);y+=5;
 doc.setFillColor(227,242,232);doc.roundedRect(15,y,180,20,3,3,'F');doc.setTextColor(...green);doc.setFontSize(8);doc.text('NILAI RATA-RATA',20,y+6);doc.setFontSize(17);doc.setFont('helvetica','bold');doc.text(data.score===null?'Belum dinilai':data.score.toFixed(2)+' / 100',20,y+14);doc.setFontSize(19);doc.text(data.predikat,178,y+13,{align:'center'});doc.setFontSize(8);doc.setFont('helvetica','normal');y+=26;
 doc.setTextColor(94,111,101);doc.text((data.provisional?'RAPOR SEMENTARA':'DATA LENGKAP')+' | Terisi '+data.observed+' dari '+data.eligible+' isian yang dinilai | Batas data: '+asOf,15,y);y+=4;
 const head=sem?[['Aktivitas',...months.map(m=>new Date(m+'-01').toLocaleDateString('id-ID',{month:'short'})),'Nilai','Pred.']]:[['No.','Aktivitas','Target','Capaian','Nilai','Pred.']];
 const body=sem?(data as ReturnType<typeof semesterReport>).rows.map(r=>[clean(r.name),...r.months.map(v=>v===null?'-':v.toFixed(1)),r.score===null?'-':r.score.toFixed(2),r.predikat]):(data as ReturnType<typeof monthlyReport>).rows.map((r,i)=>[i+1,clean(r.name),clean(r.target+' '+r.unit),clean(r.actual+' '+r.unit),r.score===null?'-':r.score.toFixed(2),r.predikat]);
 autoTable(doc,{startY:y,head,body,margin:{left:15,right:15,top:18,bottom:18},theme:'grid',styles:{font:'helvetica',fontSize:sem?7:7.5,cellPadding:1.35,lineColor:[220,229,223],textColor:[18,34,25],overflow:'linebreak'},headStyles:{fillColor:green,textColor:255,fontStyle:'bold'},alternateRowStyles:{fillColor:[247,250,248]},columnStyles:sem?{0:{cellWidth:58}}:{0:{cellWidth:8},1:{cellWidth:63}}});
 y=(doc as any).lastAutoTable.finalY+7;
 const lines=[
 'Rentang predikat: A+ 95-100; A 85-<95; B+ 75-<85; B 65-<75; C 0-<65.',
 'Bobot 15 aktivitas sama. Capaian setiap hari/pekan/bulan dibatasi 100% agar kelebihan pada satu waktu tidak menutup kekurangan waktu lain.',
 'Target mingguan: 2 qiyamullail, 4 Dhuha, 1 Al-Kahfi dan Yasin; pekan Senin-Minggu. Pekan parsial dibagi proporsional dan dibulatkan ke atas. Puasa: 2/bulan, disesuaikan hari yang dinilai.',
 'Sekolah: Senin-Jumat; hari libur dapat ditandai tidak dinilai. Izin tidak dinilai dikeluarkan dari target. Nol berarti belum terlaksana; kosong berarti belum dicatat dan bernilai nol pada rata-rata sementara.',
 sem?'Nilai semester adalah rata-rata bulan yang memiliki catatan. Bulan kosong ditampilkan (-); rapor tetap sementara sampai keenam bulan lengkap.':'Capaian adalah jumlah aktual; nilai memakai batas per periode. Rapor berjalan memakai hari sampai batas data, bukan hari mendatang.',
 'Rapor ini untuk pendampingan kebiasaan, bukan penilaian keikhlasan atau kualitas iman.'
 ];
 const write=(s:string,size=7)=>{doc.setFontSize(size);const ls=doc.splitTextToSize(clean(s),180);if(y+ls.length*3.5>264){doc.addPage();y=22;}doc.text(ls,15,y);y+=ls.length*3.5+2;};lines.forEach(l=>write(l));
 const notes=entries.filter(e=>e.note?.trim());if(notes.length){write('CATATAN MUSYRIF/AH',8);for(const n of notes)write(n.date+': '+n.note);}
 if(y+33>275){doc.addPage();y=22;}y+=7;doc.setFontSize(8);doc.text('Musyrif / Musyrifah',50,y,{align:'center'});doc.text('Koordinator '+clean(student.unit),154,y,{align:'center'});y+=21;
 const campus=/akhwat/i.test(student.unit)?'PUTRI':'PUTRA',unit=student.unit.split(' ')[0];const officer=coordinatorName(campus,unit);doc.setFont('helvetica','bold');doc.text(doc.splitTextToSize(clean(student.musyrif||'________________'),76),50,y,{align:'center'});doc.text(officer,154,y,{align:'center'});
 for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(94,111,101);doc.text('Kepesantrenan Nuris | Mutabaah Yaumiyyah',15,287);doc.text(page+' / '+doc.getNumberOfPages(),195,287,{align:'right'});}
 return doc;
}
export async function downloadYaumiyyahPdf(student:any,entries:Entry[],months:string[]){const response=await fetch('/logo-nuris.png');if(!response.ok)throw new Error('Logo Nuris belum dapat dimuat.');const blob=await response.blob();const logo=await new Promise<string>((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result));fr.onerror=reject;fr.readAsDataURL(blob);});const doc=createYaumiyyahPdf({student,entries,months,logo});doc.save('Rapor-Yaumiyyah-'+student.nama.replace(/[^a-z0-9 -]/gi,'').slice(0,65)+'-'+months[0]+(months.length>1?'-semester':'')+'.pdf');}
