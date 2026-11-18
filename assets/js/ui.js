/* RONALL PROD · ui.js (V52) — efectos compartidos (tienda + páginas de beat).
   Reglas: ningún bucle rAF corre en reposo; el fondo se hornea UNA vez en canvas (oscuro + bloom);
   el motion blur direccional es un filtro SVG que solo existe durante la animación;
   si el equipo va justo de fps se activa solo el modo "lite". */
(() => {
  'use strict';
  const D = document, root = D.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const $ = (s, r = D) => r.querySelector(s), $$ = (s, r = D) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const absUrl = u => new URL(u, D.baseURI).href;   /* las URLs en variables CSS se resuelven respecto al .css: deben ser absolutas */
  const lite = () => root.classList.contains('lite');
  const vib = ms => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) {} };

  /* ───────── Motion blur direccional (filtro SVG, solo mientras dura el movimiento) ───────── */
  let mbNode = null, mbRaf = 0;
  function mbInit() {
    if (mbNode) return mbNode;
    const w = D.createElement('div');
    w.setAttribute('aria-hidden', 'true'); w.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    w.innerHTML = '<svg width="0" height="0"><filter id="ron-mb" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feGaussianBlur id="ron-mbg" stdDeviation="0 0"/></filter></svg>';
    D.body.appendChild(w); mbNode = $('#ron-mbg', w); return mbNode;
  }
  /* x/y = desenfoque inicial en px (solo en un eje = "velocidad"). Cae a 0 con ease-out fuerte. */
  function motionBlur(el, o = {}) {
    if (!el || reduce || lite()) return;
    const g = mbInit(), x = o.x ?? 18, y = o.y ?? 0, dur = o.dur || 800, t0 = performance.now(), mine = ++mbRaf;
    el.style.filter = 'url(#ron-mb)';
    const f = now => {
      if (mine !== mbRaf) { el.style.filter = ''; return; }
      const k = Math.min(1, (now - t0) / dur), e = Math.pow(1 - k, 3);
      g.setAttribute('stdDeviation', (x * e).toFixed(2) + ' ' + (y * e).toFixed(2));
      if (k < 1) requestAnimationFrame(f); else { el.style.filter = ''; g.setAttribute('stdDeviation', '0 0'); }
    };
    requestAnimationFrame(f);
  }

  /* Letras del título: entran escalonadas + motion blur horizontal en todo el bloque */
  function letters(el, text) {
    if (!el) return;
    const value = String(text ?? '');
    const seq = (el._ronLettersSeq || 0) + 1;
    el._ronLettersSeq = seq;
    el.setAttribute('aria-label', value);
    el.textContent = value;
    el.classList.toggle('long', value.length > 12);
    const render = () => {
      if (el._ronLettersSeq !== seq) return;
      let index = 0;
      const words = value.split(' ').map(word => {
        const chars = [...word].map(char => {
          const n = index++;
          return `<span class="l" style="--i:${n}">${esc(char)}</span>`;
        }).join('');
        return `<span class="w">${chars}</span>`;
      }).join(' ');
      el.classList.remove('swap');
      el.innerHTML = '<span aria-hidden="true">' + words + '</span>';
      requestAnimationFrame(() => { if (el._ronLettersSeq === seq) el.classList.add('swap'); });
    };
    const fontReady = D.fonts && D.fonts.load ? D.fonts.load('400 64px Kosmos').catch(() => []) : Promise.resolve();
    Promise.resolve(fontReady).then(render);
  }

  /* Contador de precio con ease-out fuerte */
  function count(el, to, o = {}) {
    if (!el) return;
    const money = window.RON ? RON.money : (n => '$' + n), from = el._v ?? 0;
    el._v = to; cancelAnimationFrame(el._r);
    if (reduce || from === to) { el.textContent = money(to); return; }
    const t0 = performance.now(), dur = o.dur || 900;
    const f = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4); el.textContent = money(Math.round(from + (to - from) * e)); if (k < 1) el._r = requestAnimationFrame(f); };
    el._r = requestAnimationFrame(f);
  }

  /* ───────── Fondo: la portada se hornea UNA vez (gris, MUY oscura, desenfocada) ───────── */
  let layer = 0, sceneSeq = 0;
  function bake(img) {
    const N = 192, c = D.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'); try { x.filter = 'blur(5px)'; } catch (e) {}
    x.drawImage(img, -12, -12, N + 24, N + 24); x.filter = 'none';
    const d = x.getImageData(0, 0, N, N), p = d.data, glow = D.createElement('canvas'); glow.width = glow.height = N;
    const gx = glow.getContext('2d'), gd = gx.createImageData(N, N), q = gd.data;
    for (let i = 0; i < p.length; i += 4) {
      const y0 = p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11;
      const y = Math.max(0, Math.min(255, (y0 - 100) * 1.5 + 100));
      p[i] = p[i + 1] = p[i + 2] = y * .29;                /* fondo: casi negro */
      q[i] = q[i + 1] = q[i + 2] = Math.min(255, y * 1.32); q[i + 3] = 255;   /* bloom: más luminoso */
    }
    x.putImageData(d, 0, 0); gx.putImageData(gd, 0, 0);
    return { bg: c.toDataURL('image/jpeg', .82), glow: glow.toDataURL('image/jpeg', .8) };
  }
  function scene(url) {
    const bg = $$('.bgc'); if (bg.length < 2 || !url) return;
    const my = ++sceneSeq, i = new Image(), abs = absUrl(url);
    i.onload = () => {
      if (my !== sceneSeq) return;
      let b; try { b = bake(i); } catch (e) { b = { bg: abs, glow: abs }; }
      layer ^= 1; const n = bg[layer], p = bg[layer ^ 1];
      n.style.setProperty('--img', `url("${b.bg}")`); n.classList.add('on'); p.classList.remove('on');
      root.style.setProperty('--glow', `url("${b.glow}")`);
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
      art.style.setProperty('--ry', (dx * 20).toFixed(2) + 'deg'); art.style.setProperty('--rx', (-dy * 14).toFixed(2) + 'deg');
    };
    addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; art.classList.add('tilting'); clearTimeout(idle); idle = setTimeout(() => art.classList.remove('tilting'), 160); if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
    D.addEventListener('pointerleave', () => { art.classList.remove('tilting'); art.style.setProperty('--rx', '0deg'); art.style.setProperty('--ry', '0deg'); });
  }

  /* Reflejo de cristal que sigue al cursor, tilt 3D de tarjetas e imán suave en play/botones rellenos */
  function sheen() {
    if (!fine) return; let raf = 0, ev = null, mag = null, tcard = null;
    const clearCard = () => { if (tcard) { tcard.classList.remove('tilting'); tcard.style.setProperty('--rx', '0deg'); tcard.style.setProperty('--ry', '0deg'); tcard = null; } };
    D.addEventListener('pointermove', e => { ev = e; if (!raf) raf = requestAnimationFrame(() => {
      raf = 0; if (!ev) return;
      const tg = ev.target.closest ? ev.target : null;
      const t = tg && tg.closest('.glass,.pane,.bc');
      if (t) { const r = t.getBoundingClientRect(); t.style.setProperty('--mx', (ev.clientX - r.left) + 'px'); t.style.setProperty('--my', (ev.clientY - r.top) + 'px'); }
      const c = !reduce && !lite() && tg && tg.closest('.bc');
      if (tcard && tcard !== c) clearCard();
      if (c && !c.closest('.list')) { const r = c.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width - .5, py = (ev.clientY - r.top) / r.height - .5; c.classList.add('tilting'); c.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg'); c.style.setProperty('--rx', (-py * 9).toFixed(2) + 'deg'); tcard = c; }
      const m = tg && tg.closest('.play,.btn.fill');
      if (mag && mag !== m) { mag.style.translate = ''; mag = null; }
      if (m && !reduce) { const r = m.getBoundingClientRect(); m.style.translate = ((ev.clientX - r.left - r.width / 2) * .16).toFixed(1) + 'px ' + ((ev.clientY - r.top - r.height / 2) * .22).toFixed(1) + 'px'; mag = m; }
    }); }, { passive: true });
    D.addEventListener('pointerleave', clearCard);
  }

  /* Aparición al hacer scroll DENTRO de una vista (root = el contenedor con scroll) */
  const ios = new WeakMap();
  function reveal(view) {
    const els = $$('.rvb:not(.in)', view);
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(e => e.classList.add('in')); return; }
    let io = ios.get(view);
    if (!io) { io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: view, rootMargin: '0px 0px -6% 0px', threshold: .06 }); ios.set(view, io); }
    els.forEach(e => io.observe(e));
    setTimeout(() => $$('.rvb:not(.in)', view).forEach(e => e.classList.add('in')), 4500);
  }

  /* Scroll ligado al movimiento: la portada flota más lento que el contenido (--sy) */
  function scrollFx(view) {
    if (!view || view._sfx || reduce) return; view._sfx = 1; let raf = 0;
    view.addEventListener('scroll', () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; view.style.setProperty('--sy', Math.min(view.scrollTop, 900)); }); }, { passive: true });
  }

  /* Indicador deslizante de navegación (resorte) — mide el botón activo */
  function indicator(nav) {
    const ind = $('.ind', nav); if (!ind) return () => {};
    const place = () => {
      const b = $('button.on,a.on', nav); if (!b || !b.offsetWidth) { ind.classList.remove('on'); return; }
      const par = ind.offsetParent || nav; let x = 0, y = 0, n = b;
      while (n && n !== par) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      ind.style.width = b.offsetWidth + 'px'; ind.style.height = b.offsetHeight + 'px';
      ind.style.transform = `translate3d(${x}px,${y}px,0)`; ind.classList.add('on');
    };
    addEventListener('resize', place);
    return place;
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
    return { on, off };
  }

  /* Activa lite solo si el equipo sigue por debajo de 18 fps tras estabilizar la interfaz. */
  function adaptive() {
    if (lite() || reduce) return;
    setTimeout(() => {
      if (D.hidden) return; let n = 0, t0 = 0;
      const f = t => { if (!t0) t0 = t; n++; if (t - t0 < 1400) return requestAnimationFrame(f); if (n / ((t - t0) / 1000) < 18) root.classList.add('lite'); };
      requestAnimationFrame(f);
    }, 3600);
  }

  window.RonUI = { reduce, fine, absUrl, vib, motionBlur, letters, count, scene, tilt, sheen, reveal, scrollFx, indicator, pulse, adaptive };
})();