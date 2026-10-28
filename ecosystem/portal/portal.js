(()=>{'use strict';
const API='https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/kepesantrenan';
const $=id=>document.getElementById(id);let session=null;let desired=location.hash.slice(1)||'beranda';let busy=false;
const icons={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',book:'<path d="M12 6C9 4 5 3 2 4v15c3-1 7 0 10 2 3-2 7-3 10-2V4c-3-1-7 0-10 2zm0 0v15"/>',shield:'<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z"/><path d="m8 12 3 3 5-6"/>'};
const icon=k=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[k]+'</svg>';
async function request(path,body={},token=localStorage.getItem('mut_token')||''){
 const res=await fetch(API+'/'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 const r=await res.json();if(!res.ok)throw Object.assign(new Error(r.error?.message||'Tidak dapat terhubung. Coba lagi.'),{status:res.status});return r;
}
function clearData(){for(const key of Object.keys(localStorage))if(key==='mut_token'||key==='mut_user'||key.startsWith('simka_'))localStorage.removeItem(key);sessionStorage.removeItem('simka_session');session=null;$('frames').replaceChildren();}
function showLogin(message=''){$('loading').hidden=true;$('workspace').hidden=true;$('login').hidden=false;if(message){$('login-error').textContent=message;$('login-error').hidden=false;}}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;setTimeout(()=>$('toast').hidden=true,5000);}
function navLink(id,name,svg){const a=document.createElement('a');a.className='nav-link';a.href='#'+id;a.innerHTML=icon(svg)+'<span></span>';a.querySelector('span').textContent=name;a.dataset.app=id;return a;}
function mount(){
 $('login').hidden=true;$('loading').hidden=true;$('workspace').hidden=false;
 $('user-name').textContent=session.mutabaahUser.nama;$('user-role').textContent=['pimpinan','admin'].includes(session.mutabaahUser.role)?'Pimpinan Kepesantrenan':'Musyrif / Musyrifah';
 const first=session.mutabaahUser.nama.replace(/^(ustadzah|ustadz|usth|ustz|ust)\.?\s+/i,'').split(',')[0];$('greeting').textContent='Assalamu’alaikum, '+first+'.';
 for(const nav of [$('desktop-nav'),$('mobile-nav')]){nav.replaceChildren(navLink('beranda','Beranda','home'));for(const app of window.NURIS_APPS)nav.append(navLink(app.id,app.short,app.icon));}
 $('app-grid').replaceChildren();for(const app of window.NURIS_APPS){const allowed=session.apps[app.id];const card=document.createElement(allowed?'a':'article');card.className='app-card'+(allowed?'':' disabled');if(allowed)card.href='#'+app.id;card.innerHTML='<div class="icon">'+icon(app.icon)+'</div><div class="label"></div><h3></h3><p></p><div class="card-action"><span></span><span aria-hidden="true">'+(allowed?'↗':'')+'</span></div>';card.querySelector('.label').textContent=app.label;card.querySelector('h3').textContent=app.name;card.querySelector('p').textContent=app.description;card.querySelector('.card-action span').textContent=allowed?'Buka aplikasi':'Belum ada penugasan Putra. Hubungi pimpinan.';$('app-grid').append(card);}
 route();
}
function route(){if(!session)return;const id=location.hash.slice(1)||desired;desired='beranda';const app=window.NURIS_APPS.find(a=>a.id===id);if(app&&!session.apps[app.id]){toast('Akses SIMKA mengikuti penugasan unit Putra di Mutabaah.');location.hash='beranda';return;}
 const active=app?app.id:'beranda';document.querySelectorAll('[data-app]').forEach(a=>{if(a.dataset.app===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('home').hidden=!!app;$('app-stage').hidden=!app;document.title=app?app.name+' · Kepesantrenan Nuris':'Kepesantrenan Nuris';
 for(const f of $('frames').children)f.hidden=f.dataset.id!==active;
 if(app&&!document.querySelector('iframe[data-id="'+app.id+'"]')){const f=document.createElement('iframe');f.src=app.path;f.title=app.name;f.dataset.id=app.id;f.referrerPolicy='same-origin';f.addEventListener('load',()=>{$('frame-loading').hidden=true;});$('frame-loading').hidden=false;$('frames').append(f);}
}
async function signOut(){if(busy)return;busy=true;try{await request('mutabaah',{fn:'logout',args:[]});}catch{}finally{clearData();showLogin();busy=false;}}
$('login-form').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;$('submit').disabled=true;$('submit').textContent='Memeriksa akun…';$('login-error').hidden=true;try{const r=await request('mutabaah',{fn:'login',args:[$('username').value.trim(),$('password').value]},'');if(!r.ok||!r.data?.ok)throw new Error(r.data?.msg||r.error?.message||'Username atau password salah.');clearData();localStorage.setItem('mut_token',r.data.token);localStorage.setItem('mut_user',JSON.stringify(r.data.user));$('password').value='';session=await request('session');mount();}catch(e){showLogin(e.message||'Koneksi terputus. Coba lagi.');}finally{busy=false;$('submit').disabled=false;$('submit').innerHTML='Masuk <span aria-hidden="true">→</span>';}});
$('toggle-password').addEventListener('click',()=>{const hidden=$('password').type==='password';$('password').type=hidden?'text':'password';$('toggle-password').textContent=hidden?'Sembunyikan':'Lihat';$('toggle-password').setAttribute('aria-label',hidden?'Sembunyikan password':'Tampilkan password');});
$('logout').addEventListener('click',signOut);window.addEventListener('hashchange',route);
window.addEventListener('storage',e=>{if(e.key==='mut_token'&&!e.newValue){clearData();showLogin();}if(e.key==='mut_token'&&e.newValue)verify();});
window.addEventListener('message',e=>{if(e.origin!==location.origin||!Array.from($('frames').children).some(f=>f.contentWindow===e.source))return;if(e.data?.type==='nuris:logout')signOut();if(e.data?.type==='nuris:session-ended')verify();});
async function verify(){try{session=await request('session');mount();}catch(e){if(e.status===401){clearData();showLogin('Sesi berakhir. Silakan masuk kembali.');}else showLogin('Belum dapat terhubung ke server. Periksa koneksi lalu coba masuk kembali.');}}
async function startup(){
 const params=new URLSearchParams(location.hash.slice(1));const code=params.get('transfer');
 if(code){
  const target=window.NURIS_APPS.some(a=>a.id===params.get('app'))?params.get('app'):'beranda';
  history.replaceState(null,'','#'+target);desired=target;
  try{const r=await request('redeem',{code},'');clearData();localStorage.setItem('mut_token',r.token);localStorage.setItem('mut_user',JSON.stringify(r.user));await verify();}catch(e){showLogin(e.message);}return;
 }
 if(localStorage.getItem('mut_token'))verify();else showLogin();
}
startup();
})();
