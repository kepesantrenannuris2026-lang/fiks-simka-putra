import fs from 'node:fs';import {initialPelanggaranList,initialMasterPembinaanList} from '../../src/data/mockData';
const sql=(s:any)=>s===undefined||s===null?'NULL':"'"+String(s).replaceAll("'","''")+"'";
let out='\n-- Official catalogues from the existing SIMKA Putra source, excluding sample accounts/students.\n';
for(const p of initialPelanggaranList)out+=`INSERT INTO simka.master_pelanggaran(id,kode,jenis,kategori,poin,konsekuensi) VALUES(${[p.id,p.kode,p.jenis,p.kategori,p.poin,p.konsekuensi].map(sql).join(',')}) ON CONFLICT(kode) DO NOTHING;\n`;
for(const p of initialMasterPembinaanList)out+=`INSERT INTO simka.master_pembinaan(tingkat,nama_tingkat,min_poin,max_poin,jenis_pembinaan,is_active) VALUES(${[p.tingkat,p.nama_tingkat,p.min_poin,p.max_poin,JSON.stringify(p.jenis_pembinaan)].map(sql).join(',')},true) ON CONFLICT(tingkat) DO NOTHING;\n`;
fs.writeFileSync('ecosystem/catalogues.sql',out);console.log(initialPelanggaranList.length+' master pelanggaran, '+initialMasterPembinaanList.length+' master pembinaan');
