const months=['jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des'];
export function caseDateToISO(value:string):string {
 const s=String(value||'').trim();
 if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(s)){const d=new Date(s);if(!isNaN(d.valueOf()))return d.toISOString();}
 let m=s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
 if(!m){const id=s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),?\s+(\d{1,2})[.:](\d{2})(?:\s+WIB)?$/i);if(id){const month=months.indexOf(id[2].slice(0,3).toLowerCase())+1;if(month)m=['',id[3],String(month).padStart(2,'0'),id[1].padStart(2,'0'),id[4].padStart(2,'0'),id[5],'00'];}}
 if(m){const [y,mo,d,h,mi,se]=m.slice(1).map(Number);const t=new Date(Date.UTC(y,mo-1,d,h,mi,se||0));if(y>=1900&&t.getUTCFullYear()===y&&t.getUTCMonth()===mo-1&&t.getUTCDate()===d&&t.getUTCHours()===h&&t.getUTCMinutes()===mi)return new Date(t.valueOf()-7*3600000).toISOString();}
 throw new Error('Tanggal tidak valid. Pilih tanggal dan waktu kejadian (WIB).');
}
export function caseDateInput(value:string):string {try{return new Date(new Date(caseDateToISO(value)).valueOf()+7*3600000).toISOString().slice(0,16);}catch{return '';}}
export function caseDateDisplay(value:string):string {return new Date(caseDateToISO(value)).toLocaleString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'})+' WIB';}
