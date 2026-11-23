// Registri aplikasi Kepesantrenan Nuris. Aplikasi dengan `requires` memakai hak akses aplikasi induknya.
// Ujian semester tahfidz dan Rapor Al-Qur'an berada di dalam Mutabaah (menu Ujian Semester & Rapor semester), tidak lagi subaplikasi sendiri.
// Ujian Praktik Ibadah bergabung ke Mutabaah Yaumiyyah (24 Nov 2026): tautan lama #ujian-praktik dibuka di menu Ujian Praktik.
window.NURIS_APPS=[
 {id:'mutabaah',name:'Mutabaah Tahfidz',short:'Mutabaah',path:'/mutabaah/',icon:'book',description:'Setoran hafalan pekanan, halaqah musyrif, hadis arbain, sertifikasi, ujian semester, dan rapor Al-Qur\'an.',label:'Tahfidz & halaqah'},
 {id:'yaumiyyah',name:'Mutabaah Yaumiyyah',short:'Yaumiyyah',path:'/yaumiyyah/',icon:'calendar',description:'Isian 8 ibadah bulanan sesuai Rapor Pesantren dengan rekap bulanan dan semester, serta Ujian Praktik Ibadah: penilaian peserta, rekap, rubrik, dan periode materi.',label:'Ibadah bulanan & praktik ibadah'},
 {id:'rapor-pesantren',name:'Rapor Pesantren',short:'Rapor Pesantren',path:'/rapor-pesantren/',requires:'mutabaah',nav:false,icon:'award',description:'Rekap nilai ibadah, akhlak, kajian kitab, praktik ibadah, hadis arbain, dan pidato per kamar. Pratinjau dan ubah rapor, lalu cetak atau unduh PDF.',label:'Rapor kepesantrenan'},
 {id:'simka',name:'SIMKA Putra',short:'Putra',path:'/simka/',icon:'shield',description:'Catat pelanggaran, pantau karakter, dan tindak lanjuti pembinaan santri.',label:'Karakter & kedisiplinan'},
 {id:'simka-putri',name:'SIMKA Putri',short:'Putri',path:'/simka-putri/',icon:'shield',description:'Pencatatan kedisiplinan dan pembinaan santriwati SMP, SMA, dan MA.',label:'Karakter & kedisiplinan putri'},
 {id:'infrastruktur',name:'Infrastructure Manager',short:'Infrastruktur',path:'/infrastruktur/',admin:true,nav:false,icon:'server',description:'Kapasitas Supabase dan Cloudflare D1, cadangan harian, pengaman kuota otomatis, dan arsip tahun ajaran. Khusus pimpinan.',label:'Pemeliharaan sistem'}

];
// Tautan lama Beranda Portal (#ujian-praktik) → Mutabaah Yaumiyyah, menu Ujian Praktik.
(function(){
 if(location.pathname!=='/'&&location.pathname!=='/index.html')return;
 var fix=function(){if(location.hash!=='#ujian-praktik')return;history.replaceState(null,'','#yaumiyyah');
  try{sessionStorage.setItem('nuris_yaum_awal','peserta');}catch(e){}
  var f=document.querySelector('iframe[data-id="yaumiyyah"]');if(f)try{f.contentWindow.location.hash='peserta';}catch(e){}};
 fix();addEventListener('hashchange',fix,true);
})();
