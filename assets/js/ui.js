(() => {
  'use strict';
  const D = document, root = D.documentElement;
  const reduce = !!window.__reduce;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const $ = (s, r = D) => r.querySelector(s), $$ = (s, r = D) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const absUrl = u => new URL(u, D.baseURI).href;
  const lite = () => root.classList.contains('lite');
  const vib = ms => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) {} };

  let mbNode = null, mbRaf = 0;
  function mbInit() {
    if (mbNode) return mbNode;
    const w = D.createElement('div');
    w.setAttribute('aria-hidden', 'true'); w.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    w.innerHTML = '<svg width="0" height="0"><filter id="ron-mb" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feGaussianBlur id="ron-mbg" stdDeviation="0 0"/></filter></svg>';
    D.body.appendChild(w); mbNode = $('#ron-mbg', w); return mbNode;
  }
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

  function count(el, to, o = {}) {
    if (!el) return;
    const money = window.RON ? RON.money : (n => '$' + n), from = el._v ?? 0;
    el._v = to; cancelAnimationFrame(el._r);
    if (reduce || from === to) { el.textContent = money(to); return; }
    const t0 = performance.now(), dur = o.dur || 620;
    const f = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4); el.textContent = money(Math.round(from + (to - from) * e)); if (k < 1) el._r = requestAnimationFrame(f); };
    el._r = requestAnimationFrame(f);
  }

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
      p[i] = p[i + 1] = p[i + 2] = y * .29;
      q[i] = q[i + 1] = q[i + 2] = Math.min(255, y * 1.32); q[i + 3] = 255;
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

  function tilt(art) {
    if (!art || !fine || reduce || art._t) return;
    art._t = 1;
    let raf = 0, px = 0, py = 0, rect = null;
    const measure = () => { rect = art.getBoundingClientRect(); };
    const reset = () => {
      cancelAnimationFrame(raf); raf = 0; rect = null;
      art.classList.remove('tilting');
      art.style.setProperty('--rx', '0deg');
      art.style.setProperty('--ry', '0deg');
    };
    art.addEventListener('pointerenter', measure, { passive: true });
    art.addEventListener('pointermove', e => {
      if (innerWidth < 900) return;
      if (!rect) measure();
      px = (e.clientX - (rect.left + rect.width / 2)) / Math.max(1, rect.width);
      py = (e.clientY - (rect.top + rect.height / 2)) / Math.max(1, rect.height);
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        art.classList.add('tilting');
        art.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg');
        art.style.setProperty('--rx', (-py * 5).toFixed(2) + 'deg');
      });
    }, { passive: true });
    art.addEventListener('pointerleave', reset, { passive: true });
    addEventListener('resize', () => { rect = null; }, { passive: true });
  }

  function sheen() {
    if (!fine) return;
    let raf = 0, target = null, point = null;
    const surface = el => el && el.closest ? el.closest('.glass,.pane,.bc') : null;
    const reset = el => {
      if (!el) return;
      el.style.setProperty('--mx', '50%');
      el.style.setProperty('--my', '50%');
      if (target === el) target = null;
    };
    D.addEventListener('pointermove', e => {
      const next = surface(e.target);
      if (!next) { if (target) reset(target); return; }
      target = next; point = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!target || !point) return;
        const r = target.getBoundingClientRect();
        target.style.setProperty('--mx', (point.clientX - r.left) + 'px');
        target.style.setProperty('--my', (point.clientY - r.top) + 'px');
      });
    }, { passive: true });
    D.addEventListener('pointerout', e => {
      const el = surface(e.target);
      if (el && (!e.relatedTarget || !el.contains(e.relatedTarget))) reset(el);
    }, { passive: true });
  }

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

  function scrollFx(view) {
    if (!view || view._sfx || reduce) return; view._sfx = 1; let raf = 0;
    view.addEventListener('scroll', () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; view.style.setProperty('--sy', Math.min(view.scrollTop, 900)); }); }, { passive: true });
  }

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

  function pulse(audio, o = {}) {
    let raf = 0, lastKick = 0, bassS = 0, avg = 0, last = 0, prevE = 0, fluxAvg = 0;
    const art = o.art;
    const setup = () => {
      if (!audio || audio._ron) return audio && audio._ron;
      try {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        const ctx = new AC(), src = ctx.createMediaElementSource(audio), an = ctx.createAnalyser();
        an.fftSize = 2048; an.smoothingTimeConstant = .2; src.connect(an); an.connect(ctx.destination);
        const hz = ctx.sampleRate / an.fftSize, bin = f => Math.max(1, Math.round(f / hz));
        audio._ron = { ctx, an, bins: new Uint8Array(an.frequencyBinCount), s0: bin(35), s1: bin(140), p1: bin(260) };
      } catch (e) { audio._ron = null; }
      return audio._ron;
    };
    const band = (bins, a, b) => { let s = 0; for (let i = a; i <= b; i++) s += bins[i]; return s / ((b - a + 1) * 255); };
    const tick = t => {
      raf = requestAnimationFrame(tick);
      const A = audio && audio._ron; let v;
      if (A) {
        A.an.getByteFrequencyData(A.bins);
        const e = Math.min(1, band(A.bins, A.s0, A.s1) * .85 + band(A.bins, A.s1 + 1, A.p1) * .3);
        const flux = Math.max(0, e - prevE); prevE = e;
        fluxAvg += (flux - fluxAvg) * .08; avg += (e - avg) * .035;
        if (e > .22 && e > avg * 1.1 && flux > fluxAvg * 2.2 + .025 && t - lastKick > 110) {
          lastKick = t;
          if (window.RonFX && RonFX.kick) RonFX.kick(Math.min(1.1, .5 + (e - avg) * 2 + flux * 3));
        }
        bassS += (e - bassS) * .5;
        v = Math.min(1, bassS * 1.25);
      } else {
        if (t - last < 33) return; last = t; const k = t / 1000;
        v = Math.min(1, Math.max(0, .5 + .32 * Math.sin(k * 5.4) + .2 * Math.sin(k * 2.3 + 1.2) * Math.sin(k * 9.1)));
      }
      if (art) art.style.setProperty('--lv', v.toFixed(3));
    };
    const on = () => {
      root.classList.add('live'); const A = setup(); if (A && A.ctx.state === 'suspended') A.ctx.resume().catch(() => {});
      if (!raf && !reduce && !D.hidden) raf = requestAnimationFrame(tick);
    };
    const off = () => { root.classList.remove('live'); cancelAnimationFrame(raf); raf = 0; prevE = 0; if (art) art.style.setProperty('--lv', 0); };
    if (audio) { audio.addEventListener('play', on); audio.addEventListener('playing', on); audio.addEventListener('pause', off); audio.addEventListener('ended', off); }
    D.addEventListener('visibilitychange', () => { if (D.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (audio && !audio.paused) on(); });
    if (audio && !audio.paused) on();
    return { on, off };
  }

  function adaptive() {
    if (lite() || reduce) return;
    setTimeout(() => {
      if (D.hidden) return; let n = 0, t0 = 0;
      const f = t => { if (!t0) t0 = t; n++; if (t - t0 < 1400) return requestAnimationFrame(f); if (n / ((t - t0) / 1000) < 12) root.classList.add('lite'); };
      requestAnimationFrame(f);
    }, 3600);
  }

  window.RonUI = { reduce, fine, absUrl, vib, motionBlur, letters, count, scene, tilt, sheen, reveal, scrollFx, indicator, pulse, adaptive };
})();