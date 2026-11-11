/* RONALL PROD · MOTION ENGINE (V12 / V17)
   Un solo bucle rAF que SOLO corre mientras algún resorte se mueve.
   Resortes sub-amortiguados = péndulo natural al soltar. Sin librerías. */
(() => {
  'use strict';
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const D = document, $ = (s, r = D) => r.querySelector(s), $$ = (s, r = D) => [...r.querySelectorAll(s)];

  /* ── resortes ── */
  const live = new Set(); let raf = 0, last = 0;
  class Spring {
    /* Amortiguación subcrítica: llega rápido, sobrepasa un poco y aterriza sin golpe seco. */
    constructor(k = 180, c = 14) { this.x = 0; this.v = 0; this.t = 0; this.k = k; this.c = c; }
    step(dt) {
      /* Substeps pequeños mantienen estable el resorte incluso a 30 fps. */
      const n = Math.max(1, Math.ceil(dt / .008)), h = dt / n;
      for (let i = 0; i < n; i++) { const a = -this.k * (this.x - this.t) - this.c * this.v; this.v += a * h; this.x += this.v * h; }
    }
    get rest() { return Math.abs(this.x - this.t) < .0012 && Math.abs(this.v) < .0015; }
  }
  const wake = o => { live.add(o); if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  function loop(now) {
    const dt = Math.min(.032, (now - last) / 1000); last = now;
    for (const o of live) { o.tick(dt); if (o.done()) { live.delete(o); o.end && o.end(); } }
    raf = live.size ? requestAnimationFrame(loop) : 0;
  }

  /* ── magnético + pendulo + brillo que sigue al cursor ── */
  function magnetic(el, o = {}) {
    if (el._mag) return; el._mag = 1;
    /* Reduced motion keeps tactile feedback, but uses a much smaller travel and overshoot. */
    const factor = reduce ? .28 : 1;
    const m = (o.mag ?? .32) * factor, rot = (o.rot ?? 8) * factor, sc = reduce ? Math.min(o.scale ?? 1.045, 1.012) : (o.scale ?? 1.045), press = o.press !== false, pressScale = reduce ? .985 : .9;
    const sx = new Spring(185, 16), sy = new Spring(185, 16), sr = new Spring(150, 15), ss = new Spring(220, 18);
    ss.x = ss.t = 1;
    const obj = {
      tick(dt) { for (const s of [sx, sy, sr, ss]) s.step(dt); el.style.transform = `translate3d(${sx.x.toFixed(2)}px,${sy.x.toFixed(2)}px,0) rotate(${sr.x.toFixed(2)}deg) scale(${ss.x.toFixed(4)})`; },
      done() { return sx.rest && sy.rest && sr.rest && ss.rest; },
      end() { el.style.transform = ''; el.style.willChange = ''; }
    };
    if (fine) {
      el.addEventListener('pointerenter', () => { el.style.willChange = 'transform'; ss.t = sc; wake(obj); });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        sx.t = clamp(dx * m, -22, 22); sy.t = clamp(dy * m, -14, 14); sr.t = clamp(dx / Math.max(1,r.width) * rot, -rot, rot);
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px'); wake(obj);
      }, { passive: true });
      el.addEventListener('pointerleave', () => { sx.t = sy.t = 0; sr.t = 0; ss.t = 1; wake(obj); }); /* patada aleatoria → péndulo */
    }
    if (o.hot && fine) { el.style.willChange = 'transform'; ss.t = sc; wake(obj); }
    el.addEventListener('pointerdown', () => { if (press) ss.t = pressScale; wake(obj); });
    el.addEventListener('pointerup', () => { ss.t = fine ? sc : 1; wake(obj); });
  }

  /* ── inclinación 3D + reflejo (cards, licencias, compra) ── */
  function tilt(el, o = {}) {
    if (el._tilt || !fine) return; el._tilt = 1;
    const factor = reduce ? .24 : 1;
    const max = (o.max ?? 8) * factor, lift = reduce ? Math.min(o.lift ?? 1.035, 1.01) : (o.lift ?? 1.035);
    const rx = new Spring(190, 15), ry = new Spring(190, 15), sc = new Spring(230, 18), gl = new Spring(135, 17); sc.x = sc.t = 1;
    const obj = {
      tick(dt) { for (const s of [rx, ry, sc, gl]) s.step(dt); el.style.transform = `perspective(800px) rotateX(${rx.x.toFixed(2)}deg) rotateY(${ry.x.toFixed(2)}deg) scale(${sc.x.toFixed(4)})`; el.style.setProperty('--gl', clamp(gl.x, 0, 1).toFixed(3)); },
      done() { return rx.rest && ry.rest && sc.rest && gl.rest; },
      end() { el.style.transform = ''; el.style.willChange = ''; }
    };
    el.addEventListener('pointerenter', () => { el.style.willChange = 'transform'; sc.t = lift; gl.t = 1; wake(obj); });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(), px = clamp((e.clientX - r.left) / Math.max(1,r.width),0,1), py = clamp((e.clientY - r.top) / Math.max(1,r.height),0,1);
      ry.t = (px - .5) * 2 * max; rx.t = -(py - .5) * 2 * max;
      el.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      el.style.setProperty('--px', (px * 100).toFixed(1) + '%'); el.style.setProperty('--py', (py * 100).toFixed(1) + '%'); wake(obj);
    }, { passive: true });
    el.addEventListener('pointerleave', () => { rx.t = ry.t = 0; sc.t = 1; gl.t = 0; ry.v += (Math.random() < .5 ? -1 : 1) * 18; rx.v += (Math.random() - .5) * (reduce ? 2 : 10); wake(obj); });
    if (o.hot) { el.style.willChange = 'transform'; sc.t = lift; gl.t = 1; wake(obj); }
    el.addEventListener('pointerdown', () => { sc.t = reduce ? .993 : .965; wake(obj); });
    el.addEventListener('pointerup', () => { sc.t = lift; sc.v += 3; wake(obj); });
  }

  /* ── letras que huyen del cursor y vuelven con rebote ── */
  function letters(h) {
    if (!fine || reduce || h._lt) return; h._lt = 1;
    let items = [], cached = 0;
    const build = () => { items = $$('.l', h).map(el => { const r = el.getBoundingClientRect(); return { el, cx: r.left + r.width / 2, cy: r.top + r.height / 2, x: new Spring(120, 8), y: new Spring(120, 8), r: new Spring(90, 6), s: new Spring(170, 10) }; }); cached = performance.now(); };
    const obj = {
      tick(dt) { for (const it of items) { it.x.step(dt); it.y.step(dt); it.r.step(dt); it.s.step(dt); it.el.style.translate = `${it.x.x.toFixed(2)}px ${it.y.x.toFixed(2)}px`; it.el.style.rotate = it.r.x.toFixed(2) + 'deg'; it.el.style.scale = it.s.x.toFixed(3); } },
      done() { return items.every(it => it.x.rest && it.y.rest && it.r.rest && it.s.rest); },
      end() { for (const it of items) { it.el.style.translate = it.el.style.rotate = it.el.style.scale = ''; } }
    };
    h.addEventListener('pointerenter', build);
    h.addEventListener('pointermove', e => {
      if (!items.length || performance.now() - cached > 2500) build();
      for (const it of items) {
        const dx = it.cx - e.clientX, dy = it.cy - e.clientY, d = Math.hypot(dx, dy), R = 170;
        if (d < R) { const f = (1 - d / R) ** 2; it.x.t = dx / (d || 1) * f * 44; it.y.t = dy / (d || 1) * f * 26 - f * 14; it.r.t = (dx > 0 ? 1 : -1) * f * 24; it.s.t = 1 + f * .3; }
        else { it.x.t = it.y.t = it.r.t = 0; it.s.t = 1; }
      }
      wake(obj);
    }, { passive: true });
    h.addEventListener('pointerleave', () => { for (const it of items) { it.x.t = it.y.t = it.r.t = 0; it.s.t = 1; it.r.v += (Math.random() - .5) * 60; } wake(obj); });
  }

  /* ── contador tipo odómetro con motion blur vertical ──
     Cada dígito es una columna que rueda (0-9) mientras el valor sube/baja con easeOutExpo.
     El desenfoque vertical (SVG feGaussianBlur 0×v) sigue a la velocidad: borroso al arrancar, nítido al aterrizar.
     Al terminar se devuelve texto plano al elemento (DOM limpio, seleccionable, accesible). */
  const svgNS = 'http://www.w3.org/2000/svg'; let fid = 0; const pool = [];
  function blurFilter() {
    if (pool.length) return pool.pop();
    const s = D.createElementNS(svgNS, 'svg'); s.setAttribute('width', 0); s.setAttribute('height', 0); s.setAttribute('aria-hidden', 'true'); s.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    const id = 'mb' + (++fid);
    s.innerHTML = `<filter id="${id}" x="-30%" y="-90%" width="160%" height="280%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0"/></filter>`;
    D.body.append(s); return { id, node: s.querySelector('feGaussianBlur') };
  }
  const fmtD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const STRIP = '<i>0</i><i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i><i>0</i>';
  /* count(el, from, to, {fmt, dur}) */
  function count(el, from, to, o = {}) {
    const fmt = o.fmt || (n => fmtD.format(n)), dur = o.dur || 1150;
    const prev = el._cnt;
    if (prev && !prev.dead) { from = prev.v; prev.dead = 1; }          /* continúa desde donde iba, sin saltos */
    if (reduce || from === to || !isFinite(from) || !isFinite(to) || !el.isConnected) { el.classList.remove('counting'); el.textContent = fmt(to); if (el._mb) { pool.push(el._mb); el._mb = null; } return; }
    const f = el._mb || (el._mb = blurFilter());
    const tmpl = fmt(Math.max(Math.abs(from), Math.abs(to)));
    const nd = (tmpl.match(/\d/g) || []).length;
    /* columnas */
    let place = nd, firstD = tmpl.search(/\d/), lastD = tmpl.length - 1 - [...tmpl].reverse().join('').search(/\d/);
    const cols = [], seps = []; let html = '';
    for (let c = 0; c < tmpl.length; c++) {
      const ch = tmpl[c];
      if (/\d/.test(ch)) { place--; html += `<span class="odc" data-p="${place}"><span class="odr">${STRIP}</span></span>`; }
      else if (c > firstD && c < lastD) html += `<span class="ods" data-p="${place}">${ch}</span>`;
      else html += `<span class="odf">${ch}</span>`;
    }
    const sizePx = parseFloat(getComputedStyle(el).fontSize) || 40;
    el.innerHTML = `<span class="od" aria-hidden="true">${html}</span>`;
    el.setAttribute('aria-label', fmt(to));
    const od = el.firstChild;
    od.style.filter = `url(#${f.id})`;
    const colEls = $$('.odc', od).map(e => ({ e, r: e.firstChild, p: +e.dataset.p, last: -1 }));
    const sepEls = $$('.ods', od).map(e => ({ e, p: +e.dataset.p }));
    el.classList.add('counting');
    const t0 = performance.now(), job = el._cnt = { dead: 0, v: from }; let pv = from, lastB = -1;
    const step = now => {
      if (job.dead) return;
      if (!el.isConnected) { job.dead = 1; if (el._mb) { pool.push(el._mb); el._mb = null; } return; }
      const k = Math.min(1, (now - t0) / dur), e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k), v = from + (to - from) * e; job.v = v;
      const av = Math.abs(v);
      for (const c of colEls) {
        const x = (av / Math.pow(10, c.p)) % 10;                                 /* posición continua del rodillo */
        const vis = c.p === 0 || av >= Math.pow(10, c.p) - .5;                   /* ceros a la izquierda ocultos */
        if (vis !== c.vis) { c.vis = vis; c.e.style.display = vis ? '' : 'none'; }
        if (vis) c.r.style.transform = `translate3d(0,${(-x * 1.1).toFixed(3)}em,0)`;   /* 1.1em = alto de cada dígito */
      }
      for (const sp of sepEls) { const vis = av >= Math.pow(10, sp.p) - .5; if (vis !== sp.vis) { sp.vis = vis; sp.e.style.display = vis ? '' : 'none'; } }
      /* velocidad → desenfoque vertical (px). Rápido = barrido largo; al frenar se afila */
      const vel = Math.abs(v - pv); pv = v;
      const b = clamp(vel * sizePx * .55, 0, sizePx * .34);
      if (Math.abs(b - lastB) > .12) { f.node.setAttribute('stdDeviation', `0 ${b.toFixed(2)}`); lastB = b; }
      od.style.opacity = (1 - Math.min(.22, b / sizePx * .6)).toFixed(3);
      if (k < 1) requestAnimationFrame(step);
      else {
        job.dead = 1; el.classList.remove('counting'); el.removeAttribute('aria-label'); el.textContent = fmt(to);
        pool.push(f); el._mb = null; el._cnt = null;
        el.classList.remove('land'); void el.offsetWidth; el.classList.add('land');       /* destello al aterrizar */
      }
    };
    requestAnimationFrame(step);
  }

  /* ── revelado al hacer scroll (blur + subida + escala, escalonado) ── */
  let io;
  function reveal(root, sel) {
    if (reduce) return;
    const scroller = D.getElementById('main');
    io = io || new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const t = e.target; t.classList.add('in'); io.unobserve(t); setTimeout(() => t.classList.remove('rv2', 'in'), 1500 + parseInt(t.style.getPropertyValue('--d')) || 0); } }), { root: scroller, rootMargin: '0px 0px -6% 0px', threshold: .05 });
    $$(sel, root).forEach((el, i) => { if (el.classList.contains('rv2')) return; el.classList.add('rv2'); el.style.setProperty('--d', Math.min(i % 8, 7) * 55 + 'ms'); io.observe(el); });
  }

  /* ── marquee: se inclina y acelera con la velocidad del scroll ── */
  function scrollSkew(scroller, el) {
    if (reduce || !el) return;
    let lastY = scroller.scrollTop, v = 0, sk = new Spring(120, 14);
    const obj = { tick(dt) { sk.t = clamp(v, -14, 14); v *= .86; sk.step(dt); el.style.transform = `skewX(${(-sk.x).toFixed(2)}deg) translate3d(0,${(sk.x * -1.2).toFixed(1)}px,0)`; }, done() { return sk.rest && Math.abs(v) < .05; }, end() { el.style.transform = ''; } };
    scroller.addEventListener('scroll', () => { const y = scroller.scrollTop; v = clamp(v + (y - lastY) * .05, -16, 16); lastY = y; wake(obj); }, { passive: true });
  }

  /* ── flotación idle con péndulo aleatorio (portada, etc.) ── */
  function idleSwing(el, o = {}) {
    if (reduce || !el) return;
    const A = o.a ?? 1.1, p = Math.random() * 6.28, w = 6.28 / (o.t ?? 11), w2 = 6.28 / (o.t2 ?? 5.3), py = o.y ?? 5;
    return t => { el.style.rotate = (Math.sin(t * w + p) * A + Math.sin(t * w2 + p * 2) * A * .35).toFixed(3) + 'deg'; el.style.translate = `0 ${(Math.sin(t * w * 1.3 + p) * py).toFixed(2)}px`; };
  }

  window.RonMotion = { Spring, wake, magnetic, tilt, letters, count, reveal, scrollSkew, idleSwing, fine, reduce };
})();
