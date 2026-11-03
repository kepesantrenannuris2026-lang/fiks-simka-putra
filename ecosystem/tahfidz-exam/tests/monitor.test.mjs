import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const context={};vm.runInNewContext(fs.readFileSync('ecosystem/cloudflare/monitor-groups.js','utf8'),context);const group=x=>JSON.parse(JSON.stringify(context.NurisMonitor.group(x)));
const row=(key,musyrif,unit,jumlah,filled)=>({key,musyrif,unit,tingkat:'12',halaqah:key,jumlah,pekan:{1:{wajib:true,berjalan:false,terisi:filled,terakhir:'2026-10-01'},2:{wajib:false,berjalan:true,terisi:0,terakhir:''}},status:'lengkap'});
test('monitor merges teacher within unit, retains every halaqah and recomputes counts and summary',()=>{
 const data={halaqah:[row('HALAQAH 2','Ust. Muh Hisom','SMA Ikhwan',13,13),row('HALAQAH 1',' Ust. Muh Hisom ','SMA Ikhwan',1,0)],ringkasan:{total_halaqah:2,lengkap:1,kosong:1}};const before=JSON.stringify(data);const result=group(data);
 assert.equal(result.halaqah.length,1);const teacher=result.halaqah[0];assert.equal(teacher.jumlah,14);assert.equal(teacher.pekan[1].terisi,13);assert.equal(teacher.status,'sebagian');assert.deepEqual(teacher.belum,[1]);assert.ok(teacher.halaqah.includes('HALAQAH 1')&&teacher.halaqah.includes('HALAQAH 2'));assert.equal(result.ringkasan.total_halaqah,1);assert.equal(result.ringkasan.sebagian,1);assert.equal(result.ringkasan.lengkap,0);assert.equal(JSON.stringify(data),before);
});
test('monitor keeps different units and unknown teachers separate and respects open/future weeks',()=>{
 const rows=[row('a','Guru Sama','MA Ikhwan',10,10),row('b','Guru Sama','SMA Ikhwan',5,5),row('c','','SMA Ikhwan',1,0),row('d','','SMA Ikhwan',1,0)];assert.equal(group({halaqah:rows}).halaqah.length,4);assert.equal(group({halaqah:rows,periode_masa_depan:true}).halaqah[0].status,'akan_datang');rows[0].pekan[1].wajib=false;assert.equal(group({halaqah:rows}).halaqah[0].status,'berjalan');
});
