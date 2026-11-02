import React from 'react';
import {Home,ClipboardList,PenLine,Users,Menu} from 'lucide-react';
import {useApp} from '../../context/AppContext';
import {PageRoute} from '../../types';
export function BottomNavigation({onOpenMenu}:{onOpenMenu:()=>void}){
 const {currentRoute,setCurrentRoute}=useApp();
 const items:[PageRoute,string,React.ElementType][]=[['dashboard','Beranda',Home],['rekap-pelanggaran','Rekap',ClipboardList],['catat-pelanggaran','Catat',PenLine],['data-santri','Santri',Users]];
 return <nav className="nuris-bottom-nav" aria-label="Navigasi SIMKA">{items.map(([route,label,Icon])=><button key={route} type="button" aria-current={route===currentRoute?'page':undefined} className={route==='catat-pelanggaran'?'nuris-record-tab':''} onClick={()=>setCurrentRoute(route)}><span><Icon size={23} strokeWidth={1.8}/></span><b>{label}</b></button>)}<button type="button" onClick={onOpenMenu}><span><Menu size={23} strokeWidth={1.8}/></span><b>Menu</b></button></nav>;
}
