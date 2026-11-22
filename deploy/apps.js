// Registri aplikasi Kepesantrenan Nuris. Aplikasi dengan `requires` memakai hak akses aplikasi induknya.
// Ujian semester tahfidz dan Rapor Al-Qur'an berada di dalam Mutabaah (menu Ujian Semester & Rapor semester), tidak lagi subaplikasi sendiri.
window.NURIS_APPS=[
 {id:'mutabaah',name:'Mutabaah Tahfidz',short:'Mutabaah',path:'/mutabaah/',icon:'book',description:'Setoran hafalan pekanan, halaqah musyrif, hadis arbain, sertifikasi, ujian semester, dan rapor Al-Qur\'an.',label:'Tahfidz & halaqah'},
 {id:'ujian-praktik',name:'Ujian Praktik Ibadah',short:'Praktik',path:'/ujian-praktik/',requires:'mutabaah',nav:false,icon:'check',description:'Rubrik praktik fikih, nilai lisan dan pengganti, serta rekap ujian santri.',label:'Fikih dan praktik ibadah'},
 {id:'yaumiyyah',name:'Mutabaah Yaumiyyah',short:'Yaumiyyah',path:'/yaumiyyah/',icon:'calendar',description:'8 ibadah sesuai Rapor Pesantren, diisi per bulan dengan rincian predikat A–C, rekap serta rapor semester yang dapat diunduh.',label:'Ibadah bulanan santri'},
 {id:'rapor-pesantren',name:'Rapor Pesantren',short:'Rapor Pesantren',path:'/rapor-pesantren/',requires:'mutabaah',nav:false,icon:'award',description:'Rekap nilai ibadah, akhlak, kajian kitab, praktik ibadah, hadis arbain, dan pidato per kamar. Pratinjau dan ubah rapor, lalu cetak atau unduh PDF.',label:'Rapor kepesantrenan'},
 {id:'simka',name:'SIMKA Putra',short:'Putra',path:'/simka/',icon:'shield',description:'Catat pelanggaran, pantau karakter, dan tindak lanjuti pembinaan santri.',label:'Karakter & kedisiplinan'},
 {id:'simka-putri',name:'SIMKA Putri',short:'Putri',path:'/simka-putri/',icon:'shield',description:'Pencatatan kedisiplinan dan pembinaan santriwati SMP, SMA, dan MA.',label:'Karakter & kedisiplinan putri'},
 {id:'infrastruktur',name:'Infrastructure Manager',short:'Infrastruktur',path:'/infrastruktur/',admin:true,nav:false,icon:'server',description:'Kapasitas Supabase dan Cloudflare D1, cadangan harian, pengaman kuota otomatis, dan arsip tahun ajaran. Khusus pimpinan.',label:'Pemeliharaan sistem'}

];
