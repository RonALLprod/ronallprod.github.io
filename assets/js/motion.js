/* V73 · pulso de contadores, blur de transición adaptativo y liquid glass */
(() => {
  'use strict';
  const D = document, root = D.documentElement;
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ── pulso al cambiar contador / precio ── */
  const pop = el => {
    if (!el || !('MutationObserver' in window)) return;
    let last = el.textContent;
    new MutationObserver(() => {
      if (el.textContent === last) return;
      last = el.textContent;
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    }).observe(el, { childList: true, characterData: true, subtree: true });
  };
  pop(D.getElementById('count')); pop(D.getElementById('tot'));

  /* ── blur de transición adaptativo ──
     Arranca fuerte (16px; 8px en equipos modestos), mide los frames reales de cada cambio de
     sección y, si van lentos dos veces seguidas, baja el blur a la mitad y luego lo apaga. */
  const weak = matchMedia('(pointer:coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  let tb = +LS.get('ron_tb') || (weak ? 8 : 16), strikes = 0, sampling = false;
  const setTb = v => { tb = v; root.style.setProperty('--tb', v + 'px'); };
  if (LS.get('ron_tb0') === '1') root.classList.add('tb0'); else setTb(tb);

  const sample = () => {
    if (sampling || root.classList.contains('tb0') || D.hidden) return;
    sampling = true;
    let n = 0, t0 = 0, last = 0, long = 0;
    const f = t => {
      if (!t0) t0 = last = t; else { const d = t - last; last = t; n++; if (d > 34) long++; }
      if (t - t0 < 700) { requestAnimationFrame(f); return; }
      sampling = false;
      if (D.hidden) return;
      const avg = (t - t0) / Math.max(n, 1);
      if (avg > 24 || long > 5) {
        if (++strikes < 2) return;
        strikes = 0;
        if (tb > 6) { setTb(Math.round(tb / 2)); LS.set('ron_tb', String(tb)); }
        else { root.classList.add('tb0'); LS.set('ron_tb0', '1'); }
      } else strikes = 0;
    };
    requestAnimationFrame(f);
  };

  /* ── liquid glass: mapa de refracción para el borde del panel (solo Chromium) ── */
  const brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
  const chromium = brands.some(b => /Chrom|Edge|Opera|Brave/i.test(b.brand));
  /* refracción desactivada: cristal limpio */

  const NS = 'http://www.w3.org/2000/svg';
  let fImg, fEl, lw = 0, lh = 0;
  const ensureFilter = () => {
    if (fEl) return true;
    try {
      const svg = D.createElementNS(NS, 'svg');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:absolute;pointer-events:none';
      svg.innerHTML = '<defs><filter id="lqd" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="10" height="10" color-interpolation-filters="sRGB">' +
        '<feImage id="lqdMap" x="0" y="0" width="10" height="10" preserveAspectRatio="none" result="m"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="m" scale="46" xChannelSelector="R" yChannelSelector="G"/></filter></defs>';
      D.body.appendChild(svg);
      fEl = svg.querySelector('filter'); fImg = svg.querySelector('#lqdMap');
      return true;
    } catch (e) { return false; }
  };
  const buildMap = () => {
    const win = D.querySelector('.license-window');
    if (!win || !root.classList.contains('lq') || !ensureFilter()) return;
    const W = win.offsetWidth, H = win.offsetHeight;
    if (!W || !H || (W === lw && H === lh)) return;
    lw = W; lh = H;
    const c = D.createElement('canvas'), w = c.width = Math.ceil(W / 2), h = c.height = Math.ceil(H / 2);
    const ctx = c.getContext('2d'), img = ctx.createImageData(w, h), px = img.data;
    const R = Math.min(30, Math.min(w, h) / 2) / 2 * 1, bezel = Math.min(w, h) * .13;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = x + .5 - w / 2, Y = y + .5 - h / 2, sx = X < 0 ? -1 : 1, sy = Y < 0 ? -1 : 1;
      const qx = Math.abs(X) - (w / 2 - R), qy = Math.abs(Y) - (h / 2 - R);
      const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - R;
      const d = -sd; let r = 128, g = 128;
      if (d < bezel) {
        const t = 1 - Math.max(d, 0) / bezel, m = t * t * (3 - 2 * t);
        let nx, ny;
        if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = sx * qx / l; ny = sy * qy / l; }
        else if (qx > qy) { nx = sx; ny = 0; } else { nx = 0; ny = sy; }
        r = 128 - 127 * nx * m; g = 128 - 127 * ny * m;
      }
      const i = (y * w + x) * 4; px[i] = r; px[i + 1] = g; px[i + 2] = 128; px[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const url = c.toDataURL('image/png');
    for (const n of [fEl, fImg]) { n.setAttribute('width', W); n.setAttribute('height', H); }
    fImg.setAttribute('href', url); fImg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url);
  };

  /* brillo especular que sigue al puntero */
  let raf = 0, specOn = false;
  const specular = () => {
    const win = D.querySelector('.license-window');
    if (!win || specOn) return; specOn = true;
    win.addEventListener('pointermove', e => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0; const r = win.getBoundingClientRect();
        win.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        win.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
    }, { passive: true });
  };

  let wasOpen = false;
  new MutationObserver(() => {
    if (root.classList.contains('vt')) sample();
    const open = root.classList.contains('license-window-open');
    if (open && !wasOpen) { specular(); buildMap(); }
    wasOpen = open;
  }).observe(root, { attributes: true, attributeFilter: ['class'] });
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => wasOpen && buildMap(), 200); });
})();
