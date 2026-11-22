/* Tampilan Kepesantrenan Nuris: selalu mode terang (fitur siang/malam dihapus 22 Nov 2026).
   Lokal saja: tanpa analitik, permintaan jaringan, atau penulisan database. Pilihan "gelap" lama di perangkat ditimpa
   menjadi "terang" agar SIMKA & aplikasi lain yang membaca kunci yang sama ikut terang. */
(() => {
  const root = document.documentElement;
  const KEYS = ['nuris-appearance', 'simka_theme', 'simka_theme_mode'];
  try { for (const k of KEYS) if (localStorage.getItem(k) && localStorage.getItem(k) !== 'light') localStorage.setItem(k, 'light'); } catch {}
  function apply() {
    root.dataset.nurisTheme = 'light';
    root.classList.remove('dark');
    document.body?.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
  // API lama tetap ada agar pemanggil tidak galat; selalu terang.
  window.NurisAppearance = { change() { apply(); }, get mode() { return 'light'; } };
  apply();
  document.getElementById('nuris-appearance-toggle')?.remove();
  document.addEventListener('DOMContentLoaded', () => { apply(); document.getElementById('nuris-appearance-toggle')?.remove(); dispatchEvent(new CustomEvent('nuris-theme', { detail: 'light' })); }, { once: true });
})();
