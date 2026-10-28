export const isIntegrated = import.meta.env?.VITE_KEPESANTRENAN_PORTAL === 'true';
export const EKOSISTEM_API = 'https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/kepesantrenan';
export async function portalRequest(path: string, body: unknown = {}) {
 const res = await fetch(EKOSISTEM_API + '/' + path, { method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(localStorage.getItem('mut_token')||'')},body:JSON.stringify(body)});
 const result = await res.json();
 if(!res.ok) { if(res.status===401)window.parent.postMessage({type:'nuris:session-ended'},location.origin);throw new Error(result.error?.message||'Koneksi terputus. Silakan coba lagi.'); }
 return result;
}
export async function integratedLogin(username: string,password: string) {
 try {
  const r=await portalRequest('mutabaah',{fn:'login',args:[username,password]});
  if(!r.ok||!r.data?.ok)return {success:false,message:r.data?.msg||r.error?.message||'Username atau password salah.'};
  localStorage.setItem('mut_token',r.data.token);localStorage.setItem('mut_user',JSON.stringify(r.data.user));
  const s=await portalRequest('session');if(!s.simkaUser)return {success:false,message:'Akun belum memiliki penugasan SIMKA Putra. Anda tetap dapat menggunakan Mutabaah.'};
  return {success:true,user:s.simkaUser};
 }catch(e:any){return {success:false,message:e.message};}
}
export class PortalQuery implements PromiseLike<any> {
 q:any; private request:Promise<any>|null=null;
 constructor(table:string){this.q={table,op:'select',filters:[],orders:[]};}
 select(_columns='*',options?:any){if(options?.head)this.q.head=true;return this;}
 insert(payload:any){this.q.op='insert';this.q.payload=payload;return this;}
 upsert(payload:any,options?:any){this.q.op='upsert';this.q.payload=payload;this.q.conflict=options?.onConflict;return this;}
 update(payload:any){this.q.op='update';this.q.payload=payload;return this;}
 delete(){this.q.op='delete';return this;}
 eq(column:string,value:any){this.q.filters.push({op:'eq',column,value});return this;}
 neq(column:string,value:any){this.q.filters.push({op:'neq',column,value});return this;}
 ilike(column:string,value:any){this.q.filters.push({op:'ilike',column,value});return this;}
 in(column:string,value:any){this.q.filters.push({op:'in',column,value});return this;}
 order(column:string,options?:any){this.q.orders.push({column,ascending:options?.ascending});return this;}
 limit(n:number){this.q.limit=n;return this;}
 range(from:number,to:number){this.q.offset=from;this.q.limit=to-from+1;return this;}
 single(){this.q.single=true;return this;}
 maybeSingle(){this.q.maybeSingle=true;return this;}
 then<TResult1=any,TResult2=never>(onfulfilled?:((value:any)=>TResult1|PromiseLike<TResult1>)|null,onrejected?:((reason:any)=>TResult2|PromiseLike<TResult2>)|null):Promise<TResult1|TResult2>{
  if(!this.request)this.request=portalRequest('query',this.q).catch(e=>({data:null,error:{message:e.message}}));
  return this.request.then(onfulfilled,onrejected);
 }
}
export const portalClient = {from:(table:string)=>new PortalQuery(table),rpc:()=>Promise.resolve({data:null,error:{message:'Kelola akun melalui Mutabaah.'}})};
