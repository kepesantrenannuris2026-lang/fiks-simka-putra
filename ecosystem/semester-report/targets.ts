// Shared by semester reports, exam context and the Cloudflare Mutabaah UI.
export function semesterTarget(student:any,semester:number){
 const program=String(student?.program||'').trim().toLowerCase().replace(/\s+/g,' ');
 const special=program==='pk'||program.includes('tahfidz')||program.includes('tahfizh')||program==='program khusus';
 const value=String(student?.tingkat||'').trim().toUpperCase().replace(/^(KELAS|KLS\.?)\s*/,'');
 const grade=Number(value)||({VII:7,VIII:8,IX:9,X:10,XI:11,XII:12} as any)[value]||0;
 const entry=[7,10].includes(grade),juz=special?2:1,annual=special?4:2;
 const juz30=!special&&entry&&semester===1,requireTahsin=semester===1&&(entry||special);
 const bars=juz30?330:juz*300;
 const hafalanLabel=juz30?'1 juz · menuntaskan Juz 30':`${juz} juz`;
 return {special,program:special?'Tahfidz / PK':'Reguler',grade,entry,juz,annual,bars,juz30,requireTahsin,hafalanLabel,semesterLabel:`${requireTahsin?'Lulus Iqro/Tahsin + ':''}${hafalanLabel}`,annualLabel:`${annual} juz per tahun`};
}
export const TARGET_RULES='Reguler kelas 7/10 baru, semester 1: lulus Iqro/Tahsin dan menuntaskan Juz 30; target tahunan 2 juz. Kelas tahfidz/PK, semester 1: lulus Iqro/Tahsin dan hafalan 2 juz; target tahunan 4 juz.';
