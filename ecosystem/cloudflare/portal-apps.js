// Registri aplikasi Kepesantrenan Nuris. Aplikasi dengan `requires` memakai hak akses aplikasi induknya
// dan dibuka di dalam Mutabaah yang sama (tanpa iframe tambahan). `nav:false` = hanya kartu di Beranda.
window.NURIS_APPS=[
 {id:'mutabaah',name:'Mutabaah Tahfidz',short:'Mutabaah',path:'/mutabaah/',icon:'book',description:'Setoran hafalan pekanan, halaqah musyrif, hadis arbain, sertifikasi, dan monitoring capaian.',label:'Tahfidz & halaqah'},
 {id:'ujian',name:'Ujian Semester',short:'Ujian',path:'/mutabaah/?tool=ujian',requires:'mutabaah',nav:false,icon:'check',description:'Ujian tahfidz semester: 5 soal per juz, nilai awal 100, potongan otomatis, KKM 75. Penguji dapat menguji santri satu unit.',label:'Tahfidz · ujian'},
 {id:'rapor',name:"Rapor Al-Qur'an",short:'Rapor',path:'/mutabaah/?tool=raport',requires:'mutabaah',nav:false,icon:'award',description:'Rapor semester format pesantren ukuran F5, terisi otomatis. Cetak satu santri atau satu halaqah sekaligus tanpa mail-merge Word.',label:'Rapor semester'},
 {id:'yaumiyyah',name:'Mutabaah Yaumiyyah',short:'Yaumiyyah',path:'/yaumiyyah/',icon:'calendar',description:'Ibadah dan kebiasaan harian, rekap bulanan serta rapor semester yang dapat diunduh.',label:'Ibadah & kebiasaan harian'},
 {id:'simka',name:'SIMKA Putra',short:'Putra',path:'/simka/',icon:'shield',description:'Catat pelanggaran, pantau karakter, dan tindak lanjuti pembinaan santri.',label:'Karakter & kedisiplinan'},
 {id:'simka-putri',name:'SIMKA Putri',short:'Putri',path:'/simka-putri/',icon:'shield',description:'Pencatatan kedisiplinan dan pembinaan santriwati SMP, SMA, dan MA.',label:'Karakter & kedisiplinan putri'}
];
