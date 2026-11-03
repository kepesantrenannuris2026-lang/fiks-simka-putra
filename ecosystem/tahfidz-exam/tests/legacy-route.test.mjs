import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const html=fs.readFileSync('dist-cloudflare/mutabaah/index.html','utf8');const file=html.match(/\/_next\/static\/chunks\/app\/(page-nuris-exam-[^"?]+\.js)/)?.[1];assert.ok(file,'HTML must reference a newly versioned exam bundle');
const bundle=fs.readFileSync('dist-cloudflare/_next/static/chunks/app/'+file,'utf8');const begin=bundle.indexOf('let M=a=>{if(a==="ujian")');const end=bundle.indexOf(',q=t5.filter',begin);assert.ok(begin>=0&&end>begin);
const route=bundle.slice(begin,end)+';M("ujian");';
test('legacy Ujian Semester navigation opens the new exam in portal',()=>{const calls=[];const w={parent:{postMessage:(...x)=>calls.push(x)}};vm.runInNewContext(route,{window:w,location:{origin:'https://example.test'}});assert.equal(calls[0][0].app,'ujian-tahfidz');assert.equal(calls[0][1],'https://example.test');});
test('standalone legacy Mutabaah opens the new exam on the same origin',()=>{const calls=[];const w={parent:null};w.parent=w;vm.runInNewContext(route,{window:w,location:{assign:x=>calls.push(x)}});assert.equal(calls[0],'/ujian-tahfidz/');});
