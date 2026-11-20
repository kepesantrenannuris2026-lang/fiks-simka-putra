// Service worker situs lama dinonaktifkan: lepaskan diri lalu muat ulang tab agar diarahkan ke Kepesantrenan Nuris.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));
