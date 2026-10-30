(()=>{'use strict';if(window.__nurisGlass)return;window.__nurisGlass=true;
 const css=document.createElement('style');css.textContent=`
 .nuris-glass-nav{isolation:isolate;background:rgba(245,250,247,.82)!important;backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%);box-shadow:inset 0 1px 0 #fff,0 5px 22px #082e1a0a;border-color:#d5e4dac9!important}
 .nuris-glass-nav::before{content:'';position:absolute;pointer-events:none;left:0;top:0;width:var(--glass-width,0px);height:var(--glass-height,0px);transform:translate3d(var(--glass-x,0px),var(--glass-y,0px),0);opacity:var(--glass-visible,0);border:1px solid #ffffffed;border-radius:15px;background:linear-gradient(135deg,#ffffffed,#e3f2e899 55%,#ffffff9c);box-shadow:inset 0 1px 1px #fff,inset 0 -1px 4px #bad6c780,0 3px 12px #0d4a2814;transition:transform .48s cubic-bezier(.22,1,.36,1),width .48s cubic-bezier(.22,1,.36,1),height .3s ease,opacity .2s ease;z-index:0}
 .nuris-glass-nav :is(button,a){position:relative;z-index:1;-webkit-tap-highlight-color:transparent;transition:color .22s ease,transform .22s ease}
 .nuris-glass-nav :is(button,a):active{transform:scale(.96)}
 .nuris-glass-nav [role=tab][aria-selected=true]{color:#0d4a28!important;background:transparent!important}
 .nuris-glass-nav [role=tab]>span.absolute.inset-0{background:transparent!important;box-shadow:none!important}
 .nuris-glass-nav .nav-link[aria-current=page]{background:transparent;border-color:transparent}
 .dark .nuris-glass-nav{background:#10281ae8!important;border-color:#284c35!important}.dark .nuris-glass-nav::before{background:linear-gradient(130deg,#315d43e8,#183f26aa);border-color:#668d7455;box-shadow:inset 0 1px 0 #95b6a240,0 3px 12px #0002}.dark .nuris-glass-nav [role=tab][aria-selected=true]{color:#e3f2e8!important}
 @supports not (backdrop-filter:blur(1px)){.nuris-glass-nav{background:#f2f6f3!important}}
 @media(prefers-reduced-motion:reduce){.nuris-glass-nav::before,.nuris-glass-nav :is(button,a){transition:none!important}}
 @media(prefers-reduced-transparency:reduce){.nuris-glass-nav{background:#f2f6f3!important;backdrop-filter:none}.dark .nuris-glass-nav{background:#10281a!important}}
 @media print{.nuris-glass-nav::before{display:none!important}}
 `;document.head.append(css);
 const tracked=new Set();let scheduled=false;const resize=new ResizeObserver(schedule);
 function active(root){return root.querySelector('[aria-current="page"],[role="tab"][aria-selected="true"]')||root.querySelector('button.text-leaf-deep')||[...root.querySelectorAll('button')].find(b=>b.querySelector('span.bg-pine.text-white'));}
 function sync(){scheduled=false;for(const old of tracked)if(!old.isConnected){resize.unobserve(old);tracked.delete(old);}for(const root of document.querySelectorAll('[role="tablist"],.nuris-bottom-nav,#mobile-nav,#desktop-nav,nav.fixed.bottom-0')){
  const box=root.getBoundingClientRect();if(box.width===0||box.height===0)continue;
  if(!tracked.has(root)){tracked.add(root);root.classList.add('nuris-glass-nav');if(getComputedStyle(root).position==='static')root.style.position='relative';resize.observe(root);}
  const item=active(root);if(!item){root.style.setProperty('--glass-visible','0');continue;}const b=item.getBoundingClientRect();const put=(k,v)=>root.style.setProperty('--glass-'+k,v);
  put('x',(b.left-box.left)+'px');put('y',Math.max(4,b.top-box.top)+'px');put('width',b.width+'px');put('height',Math.max(0,Math.min(b.height,box.height-8))+'px');put('visible','1');
 }}
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(sync);}}
 new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-current','aria-selected','hidden']});window.addEventListener('resize',schedule,{passive:true});document.addEventListener('click',schedule);document.fonts?.ready.then(schedule);schedule();
})();
