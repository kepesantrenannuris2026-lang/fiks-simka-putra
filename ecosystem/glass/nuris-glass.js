/* Nuris Liquid Glass v2 — lensa kaca ala Apple untuk navigasi & tab.
   Progressive enhancement: tidak mengubah rute, data, atau pilihan tab. Satu lensa per navigasi mengikuti elemen aktif
   dengan animasi pegas (regang-memantul), umpan balik tekan, dan seret pada tab bar. Hormati reduced-motion/transparency. */
(() => {
  if (window.__nurisGlass) return; window.__nurisGlass = 2;
  const SEL = '[data-nuris-glass], [role="tablist"], .nuris-bottom-nav, #mobile-nav, #desktop-nav, .nuris-sidebar nav';
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
      const it = e.target.closest(ITEM); if (!it || !this.root.contains(it)) return;
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

  let queued = 0;
  function scan() {
    queued = 0; defs();
    for (const [root, lens] of roots) if (!root.isConnected) { lens.destroy(); roots.delete(root); }
    for (const root of document.querySelectorAll(SEL)) {
      if (root.closest('.nuris-lens, [data-nuris-glass="off"]')) continue;
      let lens = roots.get(root);
      if (!lens) { lens = new Lens(root); roots.set(root, lens); lens.sync('jump'); }
      else lens.sync();
    }
  }
  const schedule = () => { if (!queued) queued = requestAnimationFrame(scan); };
  const start = () => {
    scan();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current', 'aria-selected', 'hidden', 'class'] });
    addEventListener('resize', () => { for (const l of roots.values()) { l.toneCache = ''; l.sync('jump'); } }, { passive: true });
    addEventListener('nuris-theme', () => setTimeout(() => { for (const l of roots.values()) { l.toneCache = ''; l.sync(); } }, 380));
    document.fonts && document.fonts.ready.then(schedule);
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
