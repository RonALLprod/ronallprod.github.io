/* RONALL PROD · ui.js (V50) — efectos compartidos entre la tienda y las páginas de beat.
   Reglas: ningún bucle rAF corre en reposo; solo se escriben variables CSS en 1-2 elementos;
   el fondo desenfocado se hornea UNA vez en canvas (sin filter:blur gigante);
   si el equipo va justo de fps se activa solo el modo "lite" (mismo diseño, menos GPU). */
(() => {
  'use strict';
  const D = document, root = D.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const $ = (s, r = D) => r.querySelector(s), $$ = (s, r = D) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const absUrl = u => new URL(u, D.baseURI).href;   /* las URLs dentro de variables CSS se resuelven respecto al .css: deben ser absolutas */

  /* Letras que entran con motion blur */
  function letters(el, text) {
    if (!el) return;
    el.setAttribute('aria-label', text);
    el.innerHTML = '<span aria-hidden="true">' + text.split(' ').map((w, wi) =>
      `<span class="w">${[...w].map((c, i) => `<span class="l" style="--i:${i + wi * 3}">${esc(c)}</span>`).join('')}</span>`).join(' ') + '</span>';
    el.classList.toggle('long', text.length > 12);
    el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap');
  }

  /* Contador de precio con ease-out fuerte */
  function count(el, to, o = {}) {
    if (!el) return;
    const money = window.RON ? RON.money : (n => '$' + n), from = el._v ?? 0;
    el._v = to; cancelAnimationFrame(el._r);
    if (reduce || from === to) { el.textContent = money(to); return; }
    const t0 = performance.now(), dur = o.dur || 850;
    const f = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4); el.textContent = money(Math.round(from + (to - from) * e)); if (k < 1) el._r = requestAnimationFrame(f); };
    el._r = requestAnimationFrame(f);
  }

  /* Fondo: la portada se hornea UNA vez en un canvas pequeño, gris, contrastado y desenfocado.
     El navegador solo escala esa imagen (barato). Dos capas que se cruzan al cambiar de beat. */
  let layer = 0, sceneSeq = 0;
  function bake(img) {
    const N = 96, c = D.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'); try { x.filter = 'blur(5px)'; } catch (e) {}
    x.drawImage(img, -6, -6, N + 12, N + 12); x.filter = 'none';
    const d = x.getImageData(0, 0, N, N), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      let y = p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11;
      y = Math.max(0, Math.min(255, (y - 105) * 1.55 + 105)) * .62; p[i] = p[i + 1] = p[i + 2] = y;
    }
    x.putImageData(d, 0, 0); return c.toDataURL('image/jpeg', .82);
  }
  function scene(url) {
    const bg = $$('.bgc'); if (bg.length < 2 || !url) return;
    const my = ++sceneSeq, i = new Image(), abs = absUrl(url);
    i.onload = () => {
      if (my !== sceneSeq) return;
      let src; try { src = bake(i); } catch (e) { src = abs; }
      layer ^= 1; const n = bg[layer], p = bg[layer ^ 1];
      n.style.setProperty('--img', `url("${src}")`); n.classList.add('on'); p.classList.remove('on');
    };
    i.src = abs;
  }

  /* Inclinación 3D suave de la portada con el puntero */
  function tilt(art) {
    if (!art || !fine || reduce || art._t) return; art._t = 1;
    let raf = 0, px = 0, py = 0, idle = 0;
    const apply = () => {
      raf = 0; if (innerWidth < 900) return;
      const r = art.getBoundingClientRect();
      const dx = (px - (r.left + r.width / 2)) / innerWidth, dy = (py - (r.top + r.height / 2)) / innerHeight;
      art.style.setProperty('--ry', (dx * 22).toFixed(2) + 'deg'); art.style.setProperty('--rx', (-dy * 16).toFixed(2) + 'deg');
    };
    addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; art.classList.add('tilting'); clearTimeout(idle); idle = setTimeout(() => art.classList.remove('tilting'), 160); if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
    D.addEventListener('pointerleave', () => { art.classList.remove('tilting'); art.style.setProperty('--rx', '0deg'); art.style.setProperty('--ry', '0deg'); });
  }

  /* Reflejo de cristal que sigue al cursor (paneles .glass / .pane y tarjetas .bc) + imán suave en play y botones rellenos */
  function sheen() {
    if (!fine) return; let raf = 0, ev = null, mag = null;
    D.addEventListener('pointermove', e => { ev = e; if (!raf) raf = requestAnimationFrame(() => {
      raf = 0; if (!ev) return;
      const t = ev.target.closest && ev.target.closest('.glass,.pane,.bc');
      if (t) { const r = t.getBoundingClientRect(); t.style.setProperty('--mx', (ev.clientX - r.left) + 'px'); t.style.setProperty('--my', (ev.clientY - r.top) + 'px'); }
      const m = ev.target.closest && ev.target.closest('.play,.btn.fill');
      if (mag && mag !== m) { mag.style.translate = ''; mag = null; }
      if (m && !reduce) { const r = m.getBoundingClientRect(); m.style.translate = ((ev.clientX - r.left - r.width / 2) * .16).toFixed(1) + 'px ' + ((ev.clientY - r.top - r.height / 2) * .22).toFixed(1) + 'px'; mag = m; }
    }); }, { passive: true });
  }

  /* Aparición al hacer scroll (con red de seguridad: nunca deja contenido oculto) */
  let io = null;
  function reveal(scope) {
    const els = $$('.rvb:not(.in)', scope || D);
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(e => e.classList.add('in')); return; }
    io = io || new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    els.forEach(e => io.observe(e));
    setTimeout(() => $$('.rvb:not(.in)').forEach(e => e.classList.add('in')), 5000);
  }

  /* Pulso: solo corre mientras suena el audio. Escribe --lv en la portada (bloom que respira). */
  function pulse(audio, o = {}) {
    let raf = 0, last = 0;
    const art = o.art, tick = t => {
      raf = requestAnimationFrame(tick); if (t - last < 33) return; last = t; const k = t / 1000;
      const v = Math.min(1, Math.max(0, .5 + .32 * Math.sin(k * 5.4) + .2 * Math.sin(k * 2.3 + 1.2) * Math.sin(k * 9.1)));
      if (art) art.style.setProperty('--lv', v.toFixed(3));
    };
    const on = () => { root.classList.add('live'); if (!raf && !reduce && !D.hidden) raf = requestAnimationFrame(tick); };
    const off = () => { root.classList.remove('live'); cancelAnimationFrame(raf); raf = 0; if (art) art.style.setProperty('--lv', 0); };
    if (audio) { audio.addEventListener('play', on); audio.addEventListener('playing', on); audio.addEventListener('pause', off); audio.addEventListener('ended', off); }
    D.addEventListener('visibilitychange', () => { if (D.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (audio && !audio.paused) on(); });
    if (audio && !audio.paused) on();
    return { on, off, wake() {} };
  }

  /* Progreso de scroll en la cabecera */
  function progress() {
    const top = $('.top'); if (!top) return; let raf = 0;
    const f = () => { raf = 0; const h = D.documentElement.scrollHeight - innerHeight; top.style.setProperty('--sp', h > 0 ? Math.min(1, scrollY / h).toFixed(4) : 0); };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(f); }, { passive: true }); f();
  }

  /* Modo lite automático si el equipo va justo (mide ~1.4 s tras cargar) */
  function adaptive() {
    if (root.classList.contains('lite') || reduce) return;
    setTimeout(() => {
      if (D.hidden) return; let n = 0, t0 = 0;
      const f = t => { if (!t0) t0 = t; n++; if (t - t0 < 1400) return requestAnimationFrame(f); if (n / ((t - t0) / 1000) < 28) root.classList.add('lite'); };
      requestAnimationFrame(f);
    }, 1800);
  }

  window.RonUI = { reduce, fine, absUrl, letters, count, scene, tilt, sheen, reveal, pulse, progress, adaptive };
})();
