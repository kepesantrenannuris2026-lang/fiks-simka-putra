import {sessionKey,sessionUser,campusName} from '../lib/ekosistem';
import React,{useEffect,useState} from 'react';
import {portalRequest} from '../lib/ekosistem';
export function EkosistemGate({children}:{children:React.ReactNode}){
 const [state,setState]=useState<'loading'|'ready'|'error'>('loading');const [message,setMessage]=useState('');
 useEffect(()=>{
  let active=true;
  portalRequest('session').then(s=>{
   if(!active)return;
   if(!sessionUser(s))throw new Error('Akun ini belum memiliki penugasan lingkungan ini. Silakan buka Mutabaah.');
   const previous=JSON.parse(localStorage.getItem(sessionKey)||'null');
   if(previous && previous.username!==sessionUser(s).username){for(const k of Object.keys(localStorage))if(k.startsWith('simka_'))localStorage.removeItem(k);}
   localStorage.setItem(sessionKey,JSON.stringify(sessionUser(s)));sessionStorage.removeItem(sessionKey);setState('ready');
  }).catch(e=>{if(active){setMessage(e.message);setState('error');}});
  return()=>{active=false;};
 },[]);
 if(state==='loading')return <main className="p-8 text-center" role="status">Memeriksa akun Kepesantrenan…</main>;
 if(state==='error')return <main className="p-8 max-w-lg mx-auto"><h1 className="text-xl font-bold">Akses SIMKA {campusName}</h1><p className="my-4" role="alert">{message}</p><a href="/#mutabaah" target="_top" className="text-emerald-700 underline">Kembali ke Mutabaah</a></main>;
 return children;
}
