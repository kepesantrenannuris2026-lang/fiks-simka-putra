export const activities=[
 {id:'qiyam',name:'Qiyamullail',target:2,period:'week',unit:'kali',max:1,label:'2 kali/pekan'},
 {id:'rawatib',name:'Shalat sunnah rawatib',target:4,period:'day',unit:'kali',max:5,label:'4 kali/hari'},
 {id:'jamaah',name:'Shalat 5 waktu berjamaah (tidak masbuk)',target:5,period:'day',unit:'waktu',max:5,label:'5 waktu/hari'},
 {id:'matsurat',name:'Al-Ma’tsurat pagi dan petang',target:2,period:'day',unit:'kali',max:2,label:'2 kali/hari'},
 {id:'dzikir',name:'Dzikir setelah shalat',target:5,period:'day',unit:'kali',max:5,label:'5 kali/hari'},
 {id:'sekolah',name:'Disiplin masuk sekolah',target:1,period:'school',unit:'hari',max:1,label:'Setiap hari sekolah (Senin–Jumat)'},
 {id:'dhuha',name:'Shalat Dhuha',target:4,period:'week',unit:'kali',max:1,label:'4 kali/pekan'},
 {id:'quran',name:'Tilawah / murajaah Al-Qur’an',target:10,period:'day',unit:'halaman',max:604,label:'10 halaman/hari'},
 {id:'puasa',name:'Puasa sunnah',target:2,period:'month',unit:'hari',max:1,label:'2 kali/bulan'},
 {id:'olahraga',name:'Olahraga',target:15,period:'day',unit:'menit',max:1440,label:'15 menit/hari'},
 {id:'kahfi',name:'Membaca Al-Kahfi dan Yasin',target:1,period:'week',unit:'kali',max:1,label:'1 kali/pekan'},
 {id:'buku',name:'Membaca buku',target:5,period:'day',unit:'halaman',max:2000,label:'5 halaman/hari'},
 {id:'istighfar',name:'Membaca istighfar',target:100,period:'day',unit:'kali',max:100000,label:'100 kali/hari'},
 {id:'tidur',name:'Wudhu dan dzikir sebelum tidur',target:1,period:'day',unit:'hari',max:1,label:'Setiap hari'},
 {id:'doa',name:'Mendoakan orang tua, guru, dan kaum muslimin',target:1,period:'day',unit:'hari',max:1,label:'Setiap hari'}
] as const;
export type Entry={date:string;values:Record<string,number|null>;excused:string[];note?:string;version?:string};
export function todayWIB(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function validDate(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
export function daysOfMonth(month:string){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Bulan tidak valid.');const [y,m]=month.split('-').map(Number);return Array.from({length:new Date(Date.UTC(y,m,0)).getUTCDate()},(_,i)=>month+'-'+String(i+1).padStart(2,'0'));}
export function grade(score:number|null){if(score===null)return '--';return score>=95?'A+':score>=85?'A':score>=75?'B+':score>=65?'B':'C';}
export function validateEntry(input:any){
 if(!validDate(input.date)||input.date>todayWIB())throw new Error('Tanggal harus valid dan tidak melewati hari ini.');
 if(!input.values||typeof input.values!=='object'||Array.isArray(input.values))throw new Error('Isian aktivitas tidak valid.');
 const ids=activities.map(a=>a.id as string);if(Object.keys(input.values).some(k=>!ids.includes(k)))throw new Error('Aktivitas tidak dikenal.');
 if(!Array.isArray(input.excused)||input.excused.some((k:any)=>!ids.includes(k))||new Set(input.excused).size!==input.excused.length)throw new Error('Daftar izin tidak valid.');
 const values:Record<string,number|null>={};for(const a of activities){const v=input.values[a.id];if(v!=null&&(!Number.isInteger(v)||v<0||v>a.max))throw new Error('Jumlah '+a.name+' tidak valid.');values[a.id]=input.excused.includes(a.id)?null:v??null;}
 if(typeof input.note!=='string'||input.note.length>2000)throw new Error('Catatan maksimal 2.000 karakter.');
 return {date:input.date,values,excused:input.excused,note:input.note};
}
export function monthlyReport(month:string,entries:Entry[],asOf=todayWIB()){
 const days=daysOfMonth(month).filter(d=>d<=asOf);const map=new Map(entries.map(e=>[e.date,e]));
 const rows=activities.map(a=>{const eligible=days.filter(d=>!map.get(d)?.excused?.includes(a.id)&&(a.period!=='school'||![0,6].includes(new Date(d+'T00:00:00Z').getUTCDay())));let observed=0,actual=0,earned=0,target=0;
 for(const d of eligible){const v=map.get(d)?.values[a.id];if(v!=null){observed++;actual+=v;}}
 if(a.period==='day'||a.period==='school'){target=eligible.length*a.target;earned=eligible.reduce((s,d)=>s+Math.min(map.get(d)?.values[a.id]??0,a.target),0);}
 if(a.period==='month'){target=eligible.length?Math.max(1,Math.ceil(a.target*eligible.length/daysOfMonth(month).length)):0;earned=Math.min(actual,target);}
 if(a.period==='week'){const weeks=new Map<string,string[]>();for(const d of eligible){const t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()-(t.getUTCDay()+6)%7);const k=t.toISOString().slice(0,10);weeks.set(k,[...(weeks.get(k)||[]),d]);}for(const group of weeks.values()){const goal=Math.ceil(a.target*group.length/7);target+=goal;earned+=Math.min(goal,group.reduce((s,d)=>s+(map.get(d)?.values[a.id]??0),0));}}
 const score=target&&observed?Math.round(earned/target*10000)/100:null;
 return {...a,eligible:eligible.length,observed,actual,target,score,predikat:grade(score)};
 });
 const scored=rows.filter(r=>r.score!==null);const observed=rows.reduce((n,r)=>n+r.observed,0),eligible=rows.reduce((n,r)=>n+r.eligible,0);
 // Missing activity is zero in the provisional overall average; fully excused activity is omitted.
 const applicable=rows.filter(r=>r.target>0);const score=observed&&applicable.length?Math.round(applicable.reduce((n,r)=>n+(r.score??0),0)/applicable.length*100)/100:null;
 return {month,rows,score,predikat:grade(score),observed,eligible,coverage:eligible?Math.round(observed/eligible*100):0,provisional:observed<eligible||asOf<daysOfMonth(month).at(-1)!,notes:entries.filter(e=>e.note).map(e=>({date:e.date,note:e.note!}))};
}
export function semesterMonths(year:number,semester:number){if(!Number.isInteger(year)||year<2000||year>2100||![1,2].includes(semester))throw new Error('Semester tidak valid.');return Array.from({length:6},(_,i)=>(semester===1?year:year+1)+'-'+String((semester===1?7:1)+i).padStart(2,'0'));}
export function semesterReport(months:string[],entries:Entry[],asOf=todayWIB()){
 const reports=months.map(m=>monthlyReport(m,entries.filter(e=>e.date.startsWith(m)),asOf));const available=reports.filter(r=>r.observed>0);const score=available.length?Math.round(available.reduce((s,r)=>s+(r.score??0),0)/available.length*100)/100:null;
 const rows=activities.map(a=>{const vals=available.map(r=>r.rows.find(x=>x.id===a.id)!).filter(r=>r.target>0);const score=vals.length?Math.round(vals.reduce((s,r)=>s+(r.score??0),0)/vals.length*100)/100:null;return {...a,months:reports.map(r=>r.rows.find(x=>x.id===a.id)!.score),score,predikat:grade(score)};});
 return {reports,rows,score,predikat:grade(score),provisional:available.length<6||reports.some(r=>r.provisional),observed:reports.reduce((n,r)=>n+r.observed,0),eligible:reports.reduce((n,r)=>n+r.eligible,0)};
}
