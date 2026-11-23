/* Nuris Liquid Glass v4 — lensa kaca ala Apple untuk navigasi samping, dan "floating notch" untuk tab bar bawah.
   Progressive enhancement: tidak mengubah rute, data, atau pilihan tab. Satu lensa per navigasi mengikuti elemen aktif
   dengan animasi pegas (regang-memantul), umpan balik tekan, dan seret pada tab bar. Hormati reduced-motion/transparency. */
(() => {
  if (window.__nurisGlass) return; window.__nurisGlass = 4.3;
  // Fitur siang/malam dihapus: semua aplikasi selalu terang. Pilihan gelap lama di perangkat ditimpa.
  const terang = () => {
    try { for (const k of ['nuris-appearance', 'simka_theme', 'simka_theme_mode']) if (localStorage.getItem(k) && localStorage.getItem(k) !== 'light') localStorage.setItem(k, 'light'); } catch {}
    const r = document.documentElement; r.dataset.nurisTheme = 'light'; r.style.colorScheme = 'light';
    if (r.classList.contains('dark') || document.body?.classList.contains('dark')) { r.classList.remove('dark'); document.body?.classList.remove('dark'); dispatchEvent(new CustomEvent('nuris-theme', { detail: 'light' })); }
  };
  terang();
  // Lapisan bersama (warna aplikasi, logo ke Portal, Pindah Aplikasi) untuk halaman yang belum memuatnya sendiri.
  if (!document.querySelector('link[href^="/nuris-shell.css"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/nuris-shell.css'; document.head.append(l); }
  if (!document.querySelector('script[src^="/nuris-shell.js"]')) { const sc = document.createElement('script'); sc.src = '/nuris-shell.js'; document.head.append(sc); }
  // v3: hanya navigasi. Kontrol segmen/chip ([role=tablist]) memakai sorotan aplikasinya sendiri agar teks tetap kontras.
  const SEL = '[data-nuris-glass]:not([data-nuris-glass="off"]), .nuris-bottom-nav, #mobile-nav, #desktop-nav, .nuris-sidebar nav, aside.fixed.inset-y-0 > nav';
  const ACTIVE = '[aria-current="page"], [role="tab"][aria-selected="true"]';
  const ITEM = 'a, button, [role="tab"]';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const roots = new Map();
  const doc = document.documentElement;
  const chromium = !!(navigator.userAgentData && navigator.userAgentData.brands.some(b => /Chromium/.test(b.brand)));
  if (chromium) doc.classList.add('nuris-refract');

  function defs() {
    if (document.getElementById('nuris-glass-defs') || !document.body) return;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.id = 'nuris-glass-defs'; s.setAttribute('aria-hidden', 'true'); s.setAttribute('width', '0'); s.setAttribute('height', '0');
    s.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    s.innerHTML = '<filter id="nuris-refract" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="7" result="n"/>' +
      '<feGaussianBlur in="n" stdDeviation="1.4" result="nb"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="nb" scale="9" xChannelSelector="R" yChannelSelector="G"/></filter>';
    document.body.append(s);
  }
  const luminance = (c) => { const m = c.match(/[\d.]+/g); if (!m) return 1; const [r, g, b] = m.map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
  function tone(el) {
    for (let n = el; n && n !== document; n = n.parentElement) {
      const cs = getComputedStyle(n), bg = cs.backgroundColor, a = (bg.match(/[\d.]+/g) || [])[3];
      if (bg && bg !== 'transparent' && !(a !== undefined && Number(a) < 0.5)) return luminance(bg) < 0.42 ? 'dark' : 'light';
    }
    return doc.classList.contains('dark') ? 'dark' : 'light';
  }

  class Lens {
    constructor(root) {
      this.root = root; this.el = document.createElement('span'); this.el.className = 'nuris-lens'; this.el.setAttribute('aria-hidden', 'true');
      this.el.innerHTML = '<i class="nuris-lens-shine"></i>';
      root.classList.add('nuris-glass-nav'); root.append(this.el);
      if (!root.dataset.nurisGlass) root.dataset.nurisGlass = root.matches('.nuris-bottom-nav, #mobile-nav') ? 'mobile' : root.closest('aside, .nuris-sidebar') ? 'side' : 'bar';
      this.p = null; this.v = { x: 0, y: 0, w: 0, h: 0 }; this.t = null; this.press = 0; this.pressT = 0; this.raf = 0; this.drag = null;
      this.ro = new ResizeObserver(() => this.sync(true)); this.ro.observe(root);
      root.addEventListener('scroll', () => this.sync(true), { passive: true });
      root.addEventListener('pointerdown', (e) => this.down(e));
      root.addEventListener('pointermove', (e) => this.move(e));
      root.addEventListener('pointerup', (e) => this.up(e));
      root.addEventListener('pointercancel', () => this.cancel());
      root.addEventListener('click', (e) => { if (this.swallow) { e.preventDefault(); e.stopPropagation(); this.swallow = false; } }, true);
    }
    box(item) {
      const nb = this.root.getBoundingClientRect(), b = item.getBoundingClientRect();
      return { x: b.left - nb.left + this.root.scrollLeft - this.root.clientLeft, y: b.top - nb.top + this.root.scrollTop - this.root.clientTop, w: b.width, h: b.height };
    }
    active() { const a = this.root.querySelector(ACTIVE); return a && a.offsetParent !== null ? a : null; }
    sync(immediate) {
      if (this.el.parentNode !== this.root) this.root.append(this.el);
      const a = this.drag ? null : this.active();
      if (!this.drag && !a) { this.el.style.opacity = '0'; this.p = null; return; }
      this.el.dataset.tone = this.toneCache ||= tone(this.root);
      if (a) { this.t = this.box(a); this.radius = getComputedStyle(a).borderRadius; if (!this.radius || this.radius === '0px') this.radius = '14px'; this.el.style.borderRadius = this.radius; }
      if (!this.p || immediate === 'jump' || reduce.matches) { this.p = { ...this.t }; this.v = { x: 0, y: 0, w: 0, h: 0 }; this.paint(0); }
      this.el.style.opacity = '1';
      this.kick();
    }
    kick() { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((t) => this.step(t)); } }
    step(now) {
      this.raf = 0; if (!this.p || !this.t) return; const dt = Math.min(0.032, (now - this.last) / 1000); this.last = now;
      const k = 430, c = 33; let moving = false;
      for (const key of ['x', 'y', 'w', 'h']) {
        const d = this.t[key] - this.p[key];
        this.v[key] += (k * d - c * this.v[key]) * dt; this.p[key] += this.v[key] * dt;
        if (Math.abs(d) > 0.2 || Math.abs(this.v[key]) > 0.6) moving = true; else { this.p[key] = this.t[key]; this.v[key] = 0; }
      }
      this.press += ((this.pressT) - this.press) * Math.min(1, dt * 22);
      if (Math.abs(this.pressT - this.press) > 0.01) moving = true;
      this.paint(Math.hypot(this.v.x, this.v.y));
      if (moving) this.kick();
    }
    paint(speed) {
      if (!this.p) return;
      const s = reduce.matches ? 0 : Math.min(0.2, speed / 2600);
      const dir = Math.abs(this.v.x) >= Math.abs(this.v.y);
      const lift = 1 + this.press * 0.07;
      const sx = (dir ? 1 + s : 1 - s * 0.5) * lift, sy = (dir ? 1 - s * 0.55 : 1 + s) * lift;
      const st = this.el.style;
      st.width = this.p.w + 'px'; st.height = this.p.h + 'px';
      st.transform = `translate3d(${this.p.x}px,${this.p.y}px,0) scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
      st.setProperty('--shine-x', `${50 - Math.max(-30, Math.min(30, this.v.x / 40))}%`);
      st.setProperty('--press', this.press.toFixed(3));
    }
    itemAt(x, y) {
      const el = document.elementFromPoint(x, y); const it = el && el.closest(ITEM);
      return it && this.root.contains(it) ? it : null;
    }
    down(e) {
      if (e.button !== 0) return;
      const it = e.target.closest(ITEM); if (!it || !this.root.contains(it) || it.closest('[data-nuris-pindah-list]')) return;
      this.pressT = 1; this.kick();
      const a = this.active(); this.start = { x: e.clientX, y: e.clientY, id: e.pointerId, onActive: a && (a === it || a.contains(e.target)) };
      if (!this.start.onActive && !reduce.matches && a && this.p) { this.t = this.box(it); this.kick(); } // antisipasi: lensa mulai bergeser
    }
    move(e) {
      if (!this.start || e.pointerId !== this.start.id) return;
      const dx = e.clientX - this.start.x;
      if (!this.drag && this.start.onActive && Math.abs(dx) > 8 && this.root.scrollWidth <= this.root.clientWidth + 2) {
        if (!this.p) return;
        this.drag = { offset: this.start.x - (this.root.getBoundingClientRect().left + this.p.x) };
        try { this.root.setPointerCapture(e.pointerId); } catch {}
      }
      if (this.drag && this.p) {
        const nb = this.root.getBoundingClientRect();
        const x = Math.max(0, Math.min(nb.width - this.p.w, e.clientX - nb.left - this.drag.offset));
        const over = this.itemAt(e.clientX, nb.top + this.p.y + this.p.h / 2);
        this.t = { ...this.t, x }; if (over) { const b = this.box(over); this.t.w = b.w; this.t.h = b.h; this.t.y = b.y; }
        this.kick();
      }
    }
    up(e) {
      const was = this.drag; this.pressT = 0; this.drag = null;
      if (was && this.p) {
        const nb = this.root.getBoundingClientRect();
        const target = this.itemAt(nb.left + this.p.x + this.p.w / 2, nb.top + this.p.y + this.p.h / 2);
        this.swallow = true; setTimeout(() => (this.swallow = false), 0);
        if (target && target !== this.active()) target.click();
      }
      this.start = null; requestAnimationFrame(() => this.sync());
    }
    cancel() { this.pressT = 0; this.drag = null; this.start = null; this.sync(); }
    destroy() { this.ro.disconnect(); this.el.remove(); }
  }

  /* Tab bar bawah: bar melayang hijau pinus dengan lekukan (notch) yang mengikuti tab aktif; ikon aktif naik ke
     gelembung bundar. Lekukan & gelembung bergerak dengan pegas. Tidak mengubah rute/pilihan tab; hanya tampilan. */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const memo = new Map(); // posisi gelembung terakhir per tab bar; dipakai bila aplikasi membuat ulang elemen nav
  const navKey = (root) => location.pathname + '|' + (root.getAttribute('aria-label') || root.id || '');
  const isMobile = (root) => root.dataset.nurisGlass === 'mobile' || root.matches('.nuris-bottom-nav, #mobile-nav');
  class Notch {
    constructor(root) {
      this.root = root; root.classList.add('nuris-glass-nav', 'nuris-notch');
      if (!root.dataset.nurisGlass) root.dataset.nurisGlass = 'mobile';
      this.svg = document.createElementNS(SVGNS, 'svg'); this.svg.setAttribute('class', 'nuris-notch-bar'); this.svg.setAttribute('aria-hidden', 'true');
      this.path = document.createElementNS(SVGNS, 'path'); this.svg.append(this.path);
      this.ball = document.createElement('span'); this.ball.className = 'nuris-notch-ball'; this.ball.setAttribute('aria-hidden', 'true');
      root.prepend(this.svg); root.append(this.ball);
      this.x = null; this.v = 0; this.t = 0; this.press = 0; this.pressT = 0; this.raf = 0;
      this.ro = new ResizeObserver(() => { const w = root.getBoundingClientRect().width; const j = this.w != null && Math.abs(w - this.w) > 1; this.w = w; this.sync(j ? 'jump' : undefined); }); this.ro.observe(root);
      // Nav dibuat ulang oleh aplikasi (mis. Yaumiyyah merender ulang seluruh layar): lanjutkan dari posisi lama
      // dan biarkan ikon aktif naik dengan animasi, bukan melompat.
      this.key = navKey(root); const m = memo.get(this.key), a0 = this.active();
      if (m) { this.x = m.x; this.v = m.v || 0; this.cont = true; }
      // Tab aktif berganti → ikon naik dengan animasi; tab sama → langsung di posisi akhir tanpa kedip.
      root.setAttribute(m && m.item !== this.itemId(a0) ? 'data-nn-enter' : 'data-nn-still', '');
      root.addEventListener('pointerdown', (e) => { const it = e.target.closest(ITEM); if (it && root.contains(it) && !it.closest('[data-nuris-pindah-list]')) { this.pressT = 1; const a = this.active(); if (a && it !== a && !reduce.matches) { this.t = this.cx(it); } this.kick(); } });
      const rel = () => { this.pressT = 0; this.kick(); requestAnimationFrame(() => this.sync()); };
      root.addEventListener('pointerup', rel); root.addEventListener('pointercancel', rel); root.addEventListener('pointerleave', () => { if (this.pressT) rel(); });
    }
    active() { const a = this.root.querySelector(ACTIVE); return a && a.offsetParent !== null ? a : null; }
    itemId(a) { return a ? (a.getAttribute('href') || a.getAttribute('data-nav') || a.textContent.trim()) : ''; }
    attach() { if (this.svg.parentNode !== this.root) this.root.prepend(this.svg); if (this.ball.parentNode !== this.root) this.root.append(this.ball); }
    cx(item) { const nb = this.root.getBoundingClientRect(), b = item.getBoundingClientRect(); return b.left - nb.left + b.width / 2; }
    geo() {
      // Posisi bar (SVG) di dalam nav: bar melayang di dalam elemen nav yang menempel di dasar layar.
      const nb = this.root.getBoundingClientRect(), sb = this.svg.getBoundingClientRect();
      return { nb, left: sb.left - nb.left, top: sb.top - nb.top, W: sb.width, H: sb.height };
    }
    sync(mode) {
      const a = this.active(), alive = this.root.getBoundingClientRect().width > 0;
      if (!alive) return;
      this.attach(); // aplikasi bisa mengganti isi nav (innerHTML) sehingga bar & gelembung ikut terhapus
      this.root.toggleAttribute('data-notch-none', !a);
      if (a) {
        this.t = this.cx(a);
        // Ikon aktif naik ke tengah gelembung (pusat gelembung = 5 px di bawah tepi atas bar).
        const ic = a.firstElementChild;
        if (ic) {
          const g = this.geo(), r = ic.getBoundingClientRect(), tr = getComputedStyle(ic).transform;
          const m = new DOMMatrixReadOnly(tr === 'none' ? undefined : tr);
          const natural = r.top + r.height / 2 - m.m42 - g.nb.top;
          this.root.style.setProperty('--nn-dy', Math.round(g.top + 5 - natural) + 'px');
        }
      }
      if (this.x == null || (mode === 'jump' && !this.cont) || reduce.matches) { this.x = this.t; this.v = 0; }
      if (this.root.hasAttribute('data-nn-enter') || this.root.hasAttribute('data-nn-still')) requestAnimationFrame(() => requestAnimationFrame(() => { this.root.removeAttribute('data-nn-enter'); this.root.removeAttribute('data-nn-still'); }));
      this.cont = false;
      memo.set(this.key, { x: this.x, v: this.v, item: this.itemId(a) });
      this.kick(); this.draw();
    }
    kick() { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((t) => this.step(t)); } }
    step(now) {
      this.raf = 0; const dt = Math.min(0.032, (now - this.last) / 1000); this.last = now;
      const d = this.t - this.x; this.v += (260 * d - 24 * this.v) * dt; this.x += this.v * dt;
      let moving = Math.abs(d) > 0.2 || Math.abs(this.v) > 0.5; if (!moving) { this.x = this.t; this.v = 0; }
      this.press += (this.pressT - this.press) * Math.min(1, dt * 20); if (Math.abs(this.pressT - this.press) > 0.01) moving = true;
      this.draw(); if (moving) this.kick();
    }
    draw() {
      if (this.x == null) return;
      const g = this.geo(), W = g.W, H = g.H; if (!W || !H) return;
      const none = this.root.hasAttribute('data-notch-none');
      // Lekukan membulat memeluk gelembung (jari-jari 27, pusat y 5) dengan bahu lembut di kedua sisi.
      const R = Math.min(20, H / 2), S = 35, cx = Math.max(S, Math.min(W - S, this.x - g.left));
      const L = Math.max(0, Math.min(R, cx - S)), Rr = Math.max(0, Math.min(R, W - cx - S));
      const top = none ? `H${W - Rr}` : `H${cx - S} Q${cx - 27} 0 ${cx - 25.37} 14.23 A27 27 0 0 0 ${cx + 25.37} 14.23 Q${cx + 27} 0 ${cx + S} 0 H${W - Rr}`;
      this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      this.path.setAttribute('d', `M0 ${L} A${L} ${L} 0 0 1 ${L} 0 ${top} A${Rr} ${Rr} 0 0 1 ${W} ${Rr} V${H - R} A${R} ${R} 0 0 1 ${W - R} ${H} H${R} A${R} ${R} 0 0 1 0 ${H - R} Z`);
      const sp = reduce.matches ? 0 : Math.min(0.16, Math.abs(this.v) / 2600), k = 1 - this.press * 0.08;
      this.ball.style.transform = `translate3d(${cx + g.left - this.root.clientLeft}px,${g.top + 5 - this.root.clientTop}px,0) translate(-50%,-50%) scale(${((1 + sp) * k).toFixed(3)},${((1 - sp * 0.6) * k).toFixed(3)})`;
      this.ball.style.opacity = none ? '0' : '1';
      const m = memo.get(this.key); if (m) { m.x = this.x; m.v = this.v; }
    }
    destroy() { this.ro.disconnect(); this.svg.remove(); this.ball.remove(); this.root.classList.remove('nuris-notch'); }
  }

  let queued = 0;
  function scan() {
    queued = 0; defs();
    for (const [root, lens] of roots) if (!root.isConnected) { lens.destroy(); roots.delete(root); }
    for (const root of document.querySelectorAll(SEL)) {
      if (root.closest('.nuris-lens, .nuris-notch-ball, [data-nuris-glass="off"]')) continue;
      let lens = roots.get(root);
      if (!lens) { lens = isMobile(root) && root.dataset.nurisNotch !== 'off' ? new Notch(root) : new Lens(root); roots.set(root, lens); lens.sync('jump'); }
      else lens.sync();
    }
  }
  const schedule = () => { if (!queued) queued = requestAnimationFrame(scan); };
  const start = () => {
    scan();
    // Perubahan struktur (nav baru/isi nav diganti) ditangani langsung sebelum layar digambar agar tidak berkedip;
    // perubahan lain cukup dikumpulkan per frame.
    new MutationObserver((recs) => {
      const now = recs.some((r) => r.type === 'childList' && ([...r.addedNodes].some((n) => n.nodeType === 1 && (n.matches(SEL) || n.querySelector(SEL))) || roots.has(r.target)));
      if (now) { if (queued) { cancelAnimationFrame(queued); queued = 0; } scan(); terang(); } else schedule();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current', 'aria-selected', 'hidden', 'class'] });
    addEventListener('resize', () => { for (const l of roots.values()) { l.toneCache = ''; l.sync('jump'); } }, { passive: true });
    addEventListener('nuris-theme', () => setTimeout(() => { for (const l of roots.values()) { l.toneCache = ''; l.sync(); } }, 380));
    document.fonts && document.fonts.ready.then(schedule);
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
