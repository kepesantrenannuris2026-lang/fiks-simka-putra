import catalog from './drive-catalog.json' with {type:'json'};
export {catalog};
export const FORMATS=[['auto','Sesuai kelas / capaian'],['surat','Kelas 7/10 dan 8/11 · per surat'],['perempat','Kelas 9/12 · perempat juz dan sertifikasi'],['lanjutan','Hafalan 7 juz ke atas · blok juz lanjutan']];
export const SUMMARY_FIELDS=[['hafalan_awal_juz','Hafalan awal','juz'],['ziyadah_halaman','Ziyadah semester','halaman'],['target_semester_juz','Target hafalan semester','juz'],['target_tahunan_juz','Target hafalan tahunan','juz'],['total_hafalan_juz','Total hafalan','juz']];
export function slotName(index:number){let s='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
const plain=(x:any)=>!!x&&typeof x==='object'&&!Array.isArray(x);
export function validateDriveFields(raw:any,invalid:(message:string)=>never=(m)=>{throw Object.assign(new Error(m),{status:400});}){
 if(!plain(raw))invalid('Isian templat rapor tidak valid.');
 const string=(x:any,max:number)=>{if(typeof x!=='string'||x.length>max)invalid('Teks pada templat rapor terlalu panjang atau tidak valid.');return x.trim();};
 const number=(x:any,max:number)=>{if(x==null||x==='')return null;if(typeof x!=='number'||!Number.isFinite(x)||x<0||x>max)invalid(`Nilai pada templat rapor harus angka 0–${max}.`);return Math.round(x*100)/100;};
 const cell=(x:any)=>{if(!plain(x))invalid('Isian nilai dan keterangan tidak valid.');return {nilai:number(x.nilai,100),keterangan:string(x.keterangan??'',400)};};
 const filled=(x:any)=>x.nilai!=null||!!x.keterangan;
 const out:any={version:1,format:raw.format||'auto',kelas:string(raw.kelas??'',40),nomor:string(raw.nomor??'',30),surat:{},juz:[],setengah:{},iqro_catatan:{},iqro_silah:{predikat:'',keterangan:''},rekap:{}};
 if(!FORMATS.some(([key])=>key===out.format))invalid('Pilihan format rapor tidak valid.');
 if(raw.surat!=null){if(!plain(raw.surat)||Object.keys(raw.surat).length>69)invalid('Isian nilai surat tidak valid.');for(const [id,value] of Object.entries(raw.surat)){if(!catalog.surahs.some(s=>String(s.id)===id))invalid('Surat tidak terdapat pada templat rapor.');const c=cell(value);if(filled(c))out.surat[id]=c;}}
 if(raw.juz!=null){if(!Array.isArray(raw.juz)||raw.juz.length>30)invalid('Maksimal 30 blok juz per rapor.');const used=new Set();for(const block of raw.juz){if(!plain(block)||!Number.isInteger(block.juz)||block.juz<1||block.juz>30||used.has(block.juz))invalid('Pilih nomor juz 1–30 yang berbeda untuk setiap blok.');used.add(block.juz);const entry:any={juz:block.juz,bagian:{}};if(!plain(block.bagian))invalid('Isian bagian juz tidak valid.');for(const [part,value] of Object.entries(block.bagian)){if(!['1','2','3','4'].includes(part))invalid('Perempat juz terdiri dari bagian 1–4.');const c=cell(value);if(filled(c))entry.bagian[part]=c;}if(Object.keys(entry.bagian).length)out.juz.push(entry);}}
 if(raw.setengah!=null){if(!plain(raw.setengah)||Object.keys(raw.setengah).length>30)invalid('Isian sertifikasi setengah juz tidak valid.');for(const [juz,parts] of Object.entries(raw.setengah)){if(!/^(?:[1-9]|[12][0-9]|30)$/.test(juz)||!plain(parts))invalid('Nomor juz sertifikasi tidak valid.');const entry:any={};for(const [part,value] of Object.entries(parts as any)){if(!['1','2'].includes(part))invalid('Setengah juz terdiri dari bagian 1–2.');const c=cell(value);if(filled(c))entry[part]=c;}if(Object.keys(entry).length)out.setengah[juz]=entry;}}
 if(raw.iqro_catatan!=null){if(!plain(raw.iqro_catatan))invalid('Keterangan Iqro tidak valid.');for(const [page,value] of Object.entries(raw.iqro_catatan)){if(!['15','16','19','22','27','31','36','39','44','49','54'].includes(page))invalid('Halaman Iqro tidak dikenal.');const t=string(value,400);if(t)out.iqro_catatan[page]=t;}}
 if(raw.iqro_silah!=null){if(!plain(raw.iqro_silah)||!['','A','B+','B','C'].includes(raw.iqro_silah.predikat??''))invalid('Nilai Mad Silah tidak valid.');out.iqro_silah={predikat:raw.iqro_silah.predikat||'',keterangan:string(raw.iqro_silah.keterangan??'',400)};}
 if(raw.rekap!=null){if(!plain(raw.rekap))invalid('Rekap hafalan tidak valid.');for(const [key,,unit] of SUMMARY_FIELDS){const n=number(raw.rekap[key],unit==='halaman'?604:30);if(n!=null)out.rekap[key]=n;}const c=string(raw.rekap.capaian_target??'',120);if(c)out.rekap.capaian_target=c;}
 return out;
}
