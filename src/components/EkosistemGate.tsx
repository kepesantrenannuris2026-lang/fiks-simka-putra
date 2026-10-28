import React,{useEffect,useState} from 'react';
import {portalRequest} from '../lib/ekosistem';
export function EkosistemGate({children}:{children:React.ReactNode}){
 const [state,setState]=useState<'loading'|'ready'|'error'>('loading');const [message,setMessage]=useState('');
 useEffect(()=>{
  let active=true;
  portalRequest('session').then(s=>{
   if(!active)return;
   if(!s.simkaUser)throw new Error('Akun ini belum memiliki penugasan unit Putra. Silakan buka Mutabaah.');
   const previous=JSON.parse(localStorage.getItem('simka_session')||'null');
   if(previous?.username!==s.simkaUser.username){for(const k of Object.keys(localStorage))if(k.startsWith('simka_'))localStorage.removeItem(k);}
   localStorage.setItem('simka_session',JSON.stringify(s.simkaUser));sessionStorage.removeItem('simka_session');setState('ready');
  }).catch(e=>{if(active){setMessage(e.message);setState('error');}});
  return()=>{active=false;};
 },[]);
 if(state==='loading')return <main className="p-8 text-center" role="status">Memeriksa akun Kepesantrenan…</main>;
 if(state==='error')return <main className="p-8 max-w-lg mx-auto"><h1 className="text-xl font-bold">Akses SIMKA Putra</h1><p className="my-4" role="alert">{message}</p><a href="/#mutabaah" target="_top" className="text-emerald-700 underline">Kembali ke Mutabaah</a></main>;
 return children;
}
