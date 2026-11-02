import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
function harness(reduce = false, support = false) {
 const listeners: Record<string, Function> = {}, values = new Map(), classes = new Set();
 const root:any = {dataset:{},style:{},classList:{toggle:(k:string,on:boolean)=>on?classes.add(k):classes.delete(k),add:(k:string)=>classes.add(k),remove:(k:string)=>classes.delete(k)},animate:()=>({finished:Promise.resolve()})};
 const button:any={setAttribute(k:string,v:string){this[k]=v},getAttribute(k:string){return this[k]},addEventListener(){},getBoundingClientRect:()=>({left:20,top:20,width:36,height:36})};
 let transitions=0;
 const document:any={documentElement:root,body:{classList:root.classList},createElement:()=>button,addEventListener(){},visibilityState:'visible'};
 if(support)document.startViewTransition=(fn:Function)=>{transitions++;fn();return {ready:Promise.resolve(),finished:Promise.resolve()}};
 const context:any={document,matchMedia:()=>({matches:reduce}),localStorage:{getItem:(k:string)=>values.get(k),setItem:(k:string,v:string)=>values.set(k,v)},addEventListener:(k:string,f:Function)=>listeners[k]=f,dispatchEvent(){},CustomEvent:class{},innerWidth:400,innerHeight:800};context.window=context;
 vm.runInNewContext(readFileSync('ecosystem/nuris-appearance.js','utf8'),context);
 return {context,root,values,listeners,transitions:()=>transitions};
}
test('unsupported browser changes theme and persists without networking',async()=>{const h=harness();await h.context.NurisAppearance.change('dark');assert.equal(h.root.dataset.nurisTheme,'dark');assert.equal(h.values.get('nuris-appearance'),'dark');});
test('reduced motion skips snapshot animation',async()=>{const h=harness(true,true);await h.context.NurisAppearance.change('dark');assert.equal(h.transitions(),0);assert.equal(h.root.dataset.nurisTheme,'dark');});
test('supported browser performs one transition and accepts subsequent switch',async()=>{const h=harness(false,true);await h.context.NurisAppearance.change('dark');await h.context.NurisAppearance.change('light');assert.equal(h.transitions(),2);assert.equal(h.root.dataset.nurisTheme,'light');});
test('storage sync updates sibling frame without a write loop',()=>{const h=harness();h.listeners.storage({key:'nuris-appearance',newValue:'dark'});assert.equal(h.root.dataset.nurisTheme,'dark');assert.equal(h.values.size,0);});
