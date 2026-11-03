(function(root){
 'use strict';
 // Presentation only: combine a teacher's halaqah rows in the same unit.
 // Source students, teacher accounts and weekly records are never changed.
 function group(data){
  if(!data||!Array.isArray(data.halaqah))return data;
  const groups=new Map();
  const norm=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('id');
  for(const row of data.halaqah){
   const key=norm(row.musyrif)?norm(row.unit)+'|'+norm(row.musyrif):'unassigned|'+row.key;
   let g=groups.get(key);
   if(!g){g={...row,key,jumlah:0,pekan:{},levels:[],halaqahs:[]};groups.set(key,g);}
   g.jumlah+=Number(row.jumlah)||0;
   if(row.tingkat&&!g.levels.includes(row.tingkat))g.levels.push(row.tingkat);
   if(row.halaqah&&!g.halaqahs.includes(row.halaqah))g.halaqahs.push(row.halaqah);
   if(!g.wa&&row.wa)g.wa=row.wa;
   for(const [week,value] of Object.entries(row.pekan||{})){
    const p=g.pekan[week]||{terisi:0,terakhir:'',wajib:false,berjalan:false};
    p.terisi+=Number(value.terisi)||0;p.wajib=p.wajib||value.wajib;p.berjalan=p.berjalan||value.berjalan;
    if(value.terakhir>p.terakhir)p.terakhir=value.terakhir;
    g.pekan[week]=p;
   }
  }
  const halaqah=[...groups.values()].map(g=>{
   g.tingkat=g.levels.sort((a,b)=>String(a).localeCompare(String(b),'id',{numeric:true})).join(', ');g.halaqah=g.halaqahs.join(' / ');delete g.levels;delete g.halaqahs;
   g.kosong=[];g.sebagian=[];g.lengkap=[];
   for(const [week,p] of Object.entries(g.pekan)){if(!p.wajib)continue;(p.terisi===0?g.kosong:p.terisi<g.jumlah?g.sebagian:g.lengkap).push(Number(week));}
   g.belum=[...g.kosong,...g.sebagian].sort((a,b)=>a-b);
   const required=g.kosong.length+g.sebagian.length+g.lengkap.length;
   g.status=data.periode_masa_depan?'akan_datang':!required?'berjalan':g.lengkap.length===required?'lengkap':g.kosong.length===required?'kosong':'sebagian';
   return g;
  });
  const ringkasan={...data.ringkasan,total_halaqah:halaqah.length};
  for(const status of ['lengkap','sebagian','kosong','berjalan'])ringkasan[status]=halaqah.filter(g=>g.status===status).length;
  return {...data,halaqah,ringkasan};
 }
 root.NurisMonitor={group};
})(globalThis);
