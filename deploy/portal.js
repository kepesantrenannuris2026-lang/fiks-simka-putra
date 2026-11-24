(() => {
 'use strict';
 const API='https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/kepesantrenan';
 const $=id=>document.getElementById(id);
 let session=null, desired=location.hash.slice(1)||'beranda', busy=false, toastTimer;
 const icons={server:'<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',award:'<circle cx="12" cy="9" r="6"/><path d="m8.5 14 -1.5 7 5-3 5 3-1.5-7"/>',check:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 3 3 5-6"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4"/>',home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',book:'<path d="M12 6C9 4 5 3 2 4v15c3-1 7 0 10 2 3-2 7-3 10-2V4c-3-1-7 0-10 2zm0 0v15"/>',shield:'<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z"/><path d="m8 12 3 3 5-6"/>'};
 const icon=k=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[k]+'</svg>';
 async function request(path,body={},token=localStorage.getItem('mut_token')||'') {
  const res=await fetch(API+'/'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  const r=await res.json();
  if(!res.ok)throw Object.assign(new Error(r.error?.message||'Tidak dapat terhubung. Periksa koneksi lalu coba lagi.'),{status:res.status});
  return r;
 }
 function clearData(){for(const key of Object.keys(localStorage))if(key==='mut_token'||key==='mut_user'||key.startsWith('simka_'))localStorage.removeItem(key);sessionStorage.removeItem('simka_session');session=null;$('frames').replaceChildren();}
 function showLogin(message='') {
  document.body.classList.remove('module-open');$('loading').hidden=true;$('workspace').hidden=true;$('login').hidden=false;
  document.querySelector('.skip-link').href='#main-content';$('login-error').hidden=!message;
  if(message){$('login-error').textContent=message;$('login-error').focus();}
 }
 function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,5000);}
 // Aplikasi bervarian (SIMKA: Putra & Putri dalam satu aplikasi). Akses = salah satu varian; varian terakhir diingat.
 const allowedOf=app=>app.varian?app.varian.some(v=>session.apps[v.id]):session.apps[app.requires||app.id];
 const VARIAN_KEY='nuris_varian_';
 function pathOf(app){if(!app.varian)return app.path;let pick='';try{pick=localStorage.getItem(VARIAN_KEY+app.id)||'';}catch{}const ok=app.varian.filter(v=>session.apps[v.id]);const v=ok.find(x=>x.id===pick)||ok[0]||app.varian[0];return v.path;}
 const appOfId=id=>window.NURIS_APPS.find(a=>a.id===id||(a.varian||[]).some(v=>v.id===id));
 function navLink(id,name,svg){const a=document.createElement('a');a.className='nav-link';a.href='#'+id;a.innerHTML=icon(svg)+'<span></span>';a.querySelector('span').textContent=name;a.dataset.app=id;return a;}
 function mount() {
  session.apps.infrastruktur=['pimpinan','admin'].includes(String(session.mutabaahUser.role||'').toLowerCase());$('login').hidden=true;$('loading').hidden=true;$('workspace').hidden=false;document.querySelector('.skip-link').href='#home';
  $('user-name').textContent=session.mutabaahUser.nama;
  $('user-role').textContent=['pimpinan','admin'].includes(session.mutabaahUser.role)?'Pimpinan Kepesantrenan':'Musyrif / Musyrifah';
  const first=session.mutabaahUser.nama.replace(/^(ustadzah|ustadz|usth|ustz|ust)\.?\s+/i,'').split(',')[0];
  $('greeting').textContent='Assalamu’alaikum, '+first+'.';
  for(const nav of [$('desktop-nav'),$('mobile-nav')]){nav.replaceChildren(navLink('beranda','Beranda','home'));for(const app of window.NURIS_APPS.filter(a=>a.nav!==false))nav.append(navLink(app.id,app.short,app.icon));}
  $('app-grid').replaceChildren();$('apps-empty').hidden=window.NURIS_APPS.length>0;
  for(const app of window.NURIS_APPS.filter(a=>!a.admin||session.apps[a.id])){
   const allowed=allowedOf(app), card=document.createElement(allowed?'a':'article');
   card.className='app-card'+(allowed?'':' disabled');if(allowed)card.href='#'+app.id;
   card.innerHTML='<div class="icon app-logo"><img src="/logo-app/'+app.id+'.svg" alt="" width="34" height="34" decoding="async"></div><div class="label"></div><h3></h3><p></p><div class="card-action"></div>';
   card.querySelector('.label').textContent=app.label;card.querySelector('h3').textContent=app.name;card.querySelector('p').textContent=app.description;
   card.querySelector('.card-action').textContent=allowed?'Buka '+app.short:'Belum ada penugasan. Hubungi pimpinan.';
   $('app-grid').append(card);
  }
  route();
 }
 function route() {
  if(!session)return;
  const rawId=location.hash.slice(1)||desired,sub=window.NURIS_APPS.find(a=>a.id===rawId&&a.path.startsWith('/mutabaah/?tool=')),legacyExam=rawId==='ujian-tahfidz'||!!sub,subPath=sub?sub.path:'/mutabaah/?tool=ujian',subTool=new URL(subPath,location.origin).searchParams.get('tool'),id=legacyExam?'mutabaah':rawId;if(legacyExam)history.replaceState(null,'','#mutabaah');desired='beranda';const app=appOfId(id);
  if(app&&app.id!==id){const v=app.varian.find(x=>x.id===id);try{localStorage.setItem(VARIAN_KEY+app.id,id);}catch{}history.replaceState(null,'','#'+app.id);const ex=document.querySelector('iframe[data-id="'+app.id+'"]');if(ex&&v&&!ex.src.includes(v.path))ex.src=v.path;}
  if(app&&!allowedOf(app)){toast('Akses '+app.name+' belum ditugaskan. Hubungi pimpinan untuk memeriksa akses Anda.');location.hash='beranda';return;}
  const active=app?app.id:'beranda';
  document.querySelectorAll('[data-app]').forEach(a=>{if(a.dataset.app===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.body.classList.toggle('module-open',!!app);$('home').hidden=!!app;$('app-stage').hidden=!app;
  document.title=app?app.name+' · Kepesantrenan Nuris':'Kepesantrenan Nuris';
  for(const f of $('frames').children)f.hidden=f.dataset.id!==active;
  const existingFrame=document.querySelector('iframe[data-id="mutabaah"]');if(legacyExam&&existingFrame)existingFrame.contentWindow.postMessage({type:'nuris:tool',tool:subTool},location.origin);
  if(app&&!document.querySelector('iframe[data-id="'+app.id+'"]')) {
   const f=document.createElement('iframe');f.src=legacyExam?subPath:pathOf(app);f.title=app.name;f.dataset.id=app.id;f.referrerPolicy='same-origin';
   f.addEventListener('load',()=>{$('frame-loading').hidden=true;});
   $('frame-loading').hidden=false;$('frames').append(f);
  }
 }
 async function signOut(){if(busy)return;busy=true;$('logout').disabled=true;try{await request('mutabaah',{fn:'logout',args:[]});}catch{}finally{clearData();showLogin();busy=false;$('logout').disabled=false;$('username').focus();}}
 $('login-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;$('submit').disabled=true;$('submit').textContent='Memeriksa akun…';$('login-form').setAttribute('aria-busy','true');$('login-error').hidden=true;
  try {
   const r=await request('mutabaah',{fn:'login',args:[$('username').value.trim(),$('password').value]},'');
   if(!r.ok||!r.data?.ok)throw new Error(r.data?.msg||r.error?.message||'Username atau password salah. Periksa kembali akun Anda.');
   clearData();localStorage.setItem('mut_token',r.data.token);localStorage.setItem('mut_user',JSON.stringify(r.data.user));$('password').value='';session=await request('session');mount();$('home').focus();
  }catch(e){showLogin(e.message||'Koneksi terputus. Periksa koneksi lalu coba masuk kembali.');}
  finally{busy=false;$('submit').disabled=false;$('submit').textContent='Masuk ke Kepesantrenan';$('login-form').removeAttribute('aria-busy');}
 });
 $('toggle-password').addEventListener('click',()=>{
  const hidden=$('password').type==='password';$('password').type=hidden?'text':'password';
  $('toggle-password').textContent=hidden?'Sembunyikan':'Lihat';$('toggle-password').setAttribute('aria-label',hidden?'Sembunyikan password':'Tampilkan password');$('toggle-password').setAttribute('aria-pressed',String(hidden));
 });
 $('logout').addEventListener('click',signOut);window.addEventListener('hashchange',route);
 window.addEventListener('storage',e=>{if(e.key==='mut_token'&&!e.newValue){clearData();showLogin();}if(e.key==='mut_token'&&e.newValue)void verify();});
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||!Array.from($('frames').children).some(f=>f.contentWindow===e.source))return;
  if(e.data?.type==='nuris:navigate'&&(e.data.app==='beranda'||appOfId(e.data.app)))location.hash=e.data.app;
  if(e.data?.type==='nuris:logout')void signOut();if(e.data?.type==='nuris:session-ended')void verify();
 });
 async function verify(){try{session=await request('session');mount();}catch(e){if(e.status===401){clearData();showLogin('Sesi berakhir. Silakan masuk kembali.');}else showLogin('Belum dapat terhubung ke server. Periksa koneksi lalu coba masuk kembali.');}}
 async function startup(){
  const params=new URLSearchParams(location.hash.slice(1)),code=params.get('transfer');
  if(code){
   const target=appOfId(params.get('app'))?params.get('app'):'beranda';history.replaceState(null,'','#'+target);desired=target;
   try{const r=await request('redeem',{code},'');clearData();localStorage.setItem('mut_token',r.token);localStorage.setItem('mut_user',JSON.stringify(r.user));await verify();}catch(e){showLogin(e.message);}return;
  }
  if(localStorage.getItem('mut_token'))await verify();else showLogin();
 }
 void startup();
})();
