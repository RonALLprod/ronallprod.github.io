/* V73 · movimiento idle: péndulos, deriva y ondas.
   Web Animations API sobre rotate/translate (compositor) → no pisa las animaciones CSS de entrada.
   Amplitudes pequeñas y fases aleatorias: se siente orgánico, no caótico. */
(() => {
  'use strict';
  const root = document.documentElement;
  if (!Element.prototype.animate || root.classList.contains('rm') || root.classList.contains('lite')) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let seed = (Math.random() * 1e9) | 0;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const between = (a, b) => a + (b - a) * rnd();
  const MAX = 200;
  let live = [];

  const kinds = {
    // péndulo colgando del borde superior
    swing(el, k = 1) {
      el.style.transformOrigin = '50% 0';
      const a = between(1.1, 2.3) * k;
      return { kf: [{ rotate: `${-a}deg` }, { rotate: `${a}deg` }], o: { duration: between(3.8, 6.4) * 1000, direction: 'alternate' } };
    },
    // flotar arriba/abajo
    bob(el, k = 1) {
      const y = between(1.6, 3.6) * k;
      return { kf: [{ translate: `0 ${y}px` }, { translate: `0 ${-y}px` }], o: { duration: between(3.2, 5.8) * 1000, direction: 'alternate' } };
    },
    // deriva lenta con leve giro (portada)
    drift(el, k = 1) {
      const x = 3 * k, y = 7 * k, r = .5 * k;
      return { kf: [
        { translate: '0 0', rotate: '0deg' }, { translate: `${x}px ${-y}px`, rotate: `${r}deg` },
        { translate: `${-x}px ${-y * .4}px`, rotate: `${-r}deg` }, { translate: '0 0', rotate: '0deg' }
      ], o: { duration: between(9, 13) * 1000 } };
    },
    // campana: suena un momento y descansa
    ring(el) {
      el.style.transformOrigin = '50% 8%';
      const f = [[0, 0], [.03, 13], [.07, -10], [.11, 7], [.15, -5], [.19, 2.5], [.23, 0], [1, 0]];
      return { kf: f.map(([offset, d]) => ({ offset, rotate: `${d}deg` })), o: { duration: between(7, 11) * 1000 } };
    }
  };

  // [selector, tipo, intensidad]
  const SINGLE = [
    ['#tgs span', 'swing'], ['#meta span', 'bob', .8], ['.acts .ib', 'bob', .9], ['.art img', 'drift'],
    ['.chip', 'bob', .6], ['.bc-ty', 'swing', .8], ['.bc-pr', 'bob', .7],
    ['.lockbg', 'swing', 1.6], ['.priv .btn', 'bob'], ['.ctc .btn', 'bob'],
    ['[data-i="bell"] svg', 'ring'], ['.cartb svg', 'swing', 1.8]
  ];
  // títulos: onda ordenada letra por letra
  const WAVE = ['#v-catalogo .h2', '#v-privado .h2', '#v-contacto .h2', '#ttl'];

  const add = (el, spec, delay) => {
    if (live.length >= MAX) return;
    const a = el.animate(spec.kf, Object.assign({ iterations: Infinity, easing: 'ease-in-out', delay }, spec.o));
    el._alive = 1; live.push(a);
    if (hold()) a.pause();
  };
  const hold = () => root.classList.contains('vt') || root.classList.contains('license-window-open');

  function apply() {
    live = live.filter(a => a.effect && a.effect.target && a.effect.target.isConnected);
    for (const [sel, kind, k] of SINGLE) {
      for (const el of document.querySelectorAll(sel)) {
        if (el._alive) continue;
        const s = kinds[kind](el, k);
        add(el, s, -rnd() * s.o.duration);
      }
    }
    for (const sel of WAVE) {
      for (const h of document.querySelectorAll(sel)) {
        h.querySelectorAll('.l').forEach((l, i) => {
          if (l._alive) return;
          add(l, { kf: [{ translate: '0 -2.6px' }, { translate: '0 2.6px' }], o: { duration: 3600, direction: 'alternate' } }, -i * 170);
        });
      }
    }
  }

  let t = 0;
  const later = () => { clearTimeout(t); t = setTimeout(apply, 140); };
  const sync = () => live.forEach(a => hold() ? a.pause() : a.play());

  const start = () => {
    apply();
    const mo = new MutationObserver(later);
    ['#grid', '#tgs', '#meta', '#ttl', '.rail', '.dock', '#v-catalogo', '#v-privado', '#v-contacto', '#v-home .acts']
      .forEach(s => { const n = document.querySelector(s); if (n) mo.observe(n, { childList: true, subtree: true }); });
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
    addEventListener('hashchange', later);
  };
  if (document.readyState === 'complete') setTimeout(start, 400);
  else addEventListener('load', () => setTimeout(start, 700));
})();
