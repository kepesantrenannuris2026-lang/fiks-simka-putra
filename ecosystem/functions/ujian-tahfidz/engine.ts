export type ExamType='HAFALAN_5_SOAL'|'UJI_KOMPETENSI_DASAR';
export type ErrorType='KHAFI'|'JALI'|'LUPA'|'TIDAK_JAWAB';
export const WEIGHTS:Record<ErrorType,number>={KHAFI:1,JALI:2,LUPA:6,TIDAK_JAWAB:20};
export const DEFAULT_RULES={version:1,kkm:75,require_min_completed:false,min_completed:4,weights:WEIGHTS};
export type Rules=typeof DEFAULT_RULES;
export interface Question{n:number;start:string;end:string;page:number;juz:number;group:number;label:string;mode:'hafalan'|'tilawah';}
export interface ErrorEvent{id:string;q:number;type:ErrorType;at:string;}
export interface Draft{events:ErrorEvent[];completed:number[];note:string;}
export interface Coverage{juz:number;start:string;end:string;target:'TUNTAS'|'BELUM_TUNTAS'|'BELUM_WAJIB';verified:true;}
export function fail(message:string,status=400):never{throw Object.assign(new Error(message),{status});}
export const norm=(x:unknown)=>String(x||'').trim().replace(/\s+/g,' ').toLowerCase();
export function validRules(input:any):Rules{const r={...DEFAULT_RULES,...input,weights:WEIGHTS};if(!Number.isFinite(r.kkm)||r.kkm<0||r.kkm>100||!Number.isInteger(r.min_completed)||r.min_completed<1||r.min_completed>5||typeof r.require_min_completed!=='boolean')fail('Aturan penilaian tidak valid.');return r;}
export function validateDraft(input:any,questions:Question[]):Draft{
 if(!input||!Array.isArray(input.events)||input.events.length>1000||!Array.isArray(input.completed)||typeof input.note!=='string'||input.note.length>2000)fail('Isian ujian tidak valid.');
 const ids=new Set<string>(),unanswered=new Set<number>();const nums=questions.map(q=>q.n);
 const events=input.events.map((e:any)=>{if(!e||typeof e.id!=='string'||!/^[0-9a-f-]{36}$/i.test(e.id)||ids.has(e.id)||!nums.includes(e.q)||!Object.hasOwn(WEIGHTS,e.type)||!Number.isFinite(Date.parse(e.at)))fail('Kejadian kesalahan tidak valid atau ganda.');ids.add(e.id);if(e.type==='TIDAK_JAWAB'){if(unanswered.has(e.q))fail('Tidak menjawab hanya boleh satu kali per soal.');unanswered.add(e.q);}if(e.type==='LUPA'&&questions.find(q=>q.n===e.q)?.mode==='tilawah')fail('Lupa sambungan tidak digunakan untuk tilawah dengan mushaf.');return {id:e.id,q:e.q,type:e.type,at:e.at};});
 const completed=[...new Set<number>(input.completed)];if(completed.some(n=>!nums.includes(n))||completed.some(n=>unanswered.has(n)))fail('Status soal bertentangan.');return {events,completed,note:input.note.trim()};
}
export function score(draft:Draft,questions:Question[],type:ExamType,rules:Rules=DEFAULT_RULES){
 const d=validateDraft(draft,questions);const totals={KHAFI:0,JALI:0,LUPA:0,TIDAK_JAWAB:0};for(const e of d.events)totals[e.type]++;
 const penalty=(events:ErrorEvent[])=>events.reduce((v,e)=>v+rules.weights[e.type],0);
 const components=questions.map(q=>({q:q.n,score:Math.max(0,200-penalty(d.events.filter(e=>e.q===q.n)))/2,completed:d.completed.includes(q.n)}));
 const value=type==='UJI_KOMPETENSI_DASAR'?components.reduce((v,c)=>v+c.score,0)/2:Math.max(0,200-penalty(d.events))/2;
 const complete=questions.every(q=>d.completed.includes(q.n)||d.events.some(e=>e.q===q.n&&e.type==='TIDAK_JAWAB'));
 const basicOk=type!=='UJI_KOMPETENSI_DASAR'||components.every(c=>c.completed);
 const passed=value>=rules.kkm&&basicOk&&(!rules.require_min_completed||type==='UJI_KOMPETENSI_DASAR'||d.completed.length>=rules.min_completed);
 return {score:value,penalty:100-value,totals,components,complete,passed,status:!basicOk?'BELUM_MEMENUHI_KOMPETENSI_DASAR':passed?'LULUS':'PERLU_REMEDIAL'};
}
export function canManage(a:any,unit:string){return !!a.admin||!!a.coordinator_units?.includes(unit);}
export function canRead(a:any,assignment:any){return canManage(a,assignment.unit)||assignment.examiner===a.username||norm(assignment.musyrif)===norm(a.musyrif_master)&&!!norm(a.musyrif_master);}
export function canExamine(a:any,assignment:any){return assignment.examiner===a.username||!!a.admin;}
export function balancedAssign(students:any[],examiners:any[],random:()=>number=Math.random,counts:Record<string,number>={}){
 const shuffled=[...students].sort((a,b)=>String(a.id).localeCompare(String(b.id)));for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 return shuffled.map(s=>{let eligible=examiners.filter(e=>e.units.includes(s.unit));if(!eligible.length)fail('Belum ada penguji aktif untuk '+s.unit);const alt=eligible.filter(e=>norm(e.musyrif_master)!==norm(s.musyrif));if(alt.length)eligible=alt;const min=Math.min(...eligible.map(e=>counts[e.username]||0));const tied=eligible.filter(e=>(counts[e.username]||0)===min);const e=tied[Math.floor(random()*tied.length)];counts[e.username]=(counts[e.username]||0)+1;return {santri_id:s.id,examiner:e.username,own_halaqah:norm(e.musyrif_master)===norm(s.musyrif)};});
}
export function seeded(seed:string){let n=2166136261;for(const c of seed)n=Math.imul(n^c.charCodeAt(0),16777619);return ()=>{n+=0x6d2b79f5;let t=Math.imul(n^n>>>15,1|n);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
export function selectQuestions(metadata:any[],coverage:Coverage,type:ExamType,seed:string):Question[]{
 if(type==='UJI_KOMPETENSI_DASAR')return [{n:1,start:'1:1',end:'1:7',page:1,juz:1,group:0,label:'Al-Fatihah · hafalan tanpa mushaf',mode:'hafalan'},{n:2,start:'53:1',end:'53:18',page:526,juz:27,group:0,label:'An-Najm 1–18 · membaca dengan mushaf',mode:'tilawah'}];
 if(coverage.verified!==true||!Number.isInteger(coverage.juz)||coverage.juz<1||coverage.juz>30||!['TUNTAS','BELUM_TUNTAS','BELUM_WAJIB'].includes(coverage.target))fail('Konfirmasikan cakupan hafalan terlebih dahulu.');
 const first=metadata.findIndex(v=>v[1]===coverage.start),last=metadata.findIndex(v=>v[1]===coverage.end);if(first<0||last<first||metadata[first][3]!==coverage.juz||metadata[last][3]!==coverage.juz)fail('Rentang ayat harus valid dan berada pada juz yang dipilih.');
 const verses=metadata.slice(first,last+1);if(new Set(verses.map(v=>v[2])).size<5)fail('Cakupan kurang dari sekitar ¼ juz. Gunakan ujian kompetensi dasar.');
 const pages:Record<string,any[]>={};for(const v of verses)(pages[v[2]+(coverage.juz===30?':'+(Number(v[1].split(':')[0])<=81?1:Number(v[1].split(':')[0])<=87?2:Number(v[1].split(':')[0])<=94?3:4):'')]??=[]).push(v);
 const group=(s:number)=>s<=81?1:s<=87?2:s<=94?3:4;
 const candidates=Object.values(pages).flatMap(page=>{const m=Math.ceil(page.length/2);return [page.slice(0,m),page.slice(m)].filter(a=>a.length).map(a=>({start:a[0][1],end:a.at(-1)[1],page:a[0][2],juz:coverage.juz,group:coverage.juz===30?group(Number(a[0][1].split(':')[0])):0,label:'Melanjutkan ayat · ±½ halaman (cek batas pada mushaf)',mode:'hafalan' as const}));});
 const random=seeded(seed),selected:Question[]=[];const full30=coverage.juz===30&&coverage.start==='78:1'&&coverage.end==='114:6';
 for(let i=0;i<5;i++){let pool=candidates.filter(q=>!selected.some(s=>s.start===q.start));if(full30&&i<4)pool=pool.filter(q=>q.group===i+1);else if(!full30){const lo=Math.floor(i*candidates.length/5),hi=Math.floor((i+1)*candidates.length/5);pool=candidates.slice(lo,hi).filter(q=>!selected.some(s=>s.start===q.start));}if(!pool.length)fail('Cakupan belum menyediakan lima lokasi soal yang berbeda.');selected.push({...pool[Math.floor(random()*pool.length)],n:i+1});}
 return selected;
}
