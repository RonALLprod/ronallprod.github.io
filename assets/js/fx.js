/* Build: RONALL-VISUAL-2026-11-11-V20 · FX LITE
   Fondo minimalista: portada en grises (se dibuja UNA vez, a baja resolución) + 3 luces suaves.
   Movimiento aleatorio lento solo con transform/transition (GPU). Sin WebGL, sin analizador de audio, sin shake. */
(() => {
  'use strict';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function create(n, audio) {
    const state = { an: false, bass: 0, mid: 0, high: 0, hit: 0, energy: 0, bins: new Float32Array(5) };
    const cbs = [], cam = n.camera, cx = cam && cam.getContext('2d');
    const api = { state, pointerTo: [0, 0], wake() {}, onFrame(f) { cbs.push(f); }, setImage };

    /* Portada: 96×54 en grises y oscurecida → escalada a 640×360 (el escalado ya es el desenfoque). */
    const tiny = document.createElement('canvas'); tiny.width = 96; tiny.height = 54;
    const tx = tiny.getContext('2d', { willReadFrequently: true });
    let seq = 0;
    function setImage(img) {
      if (!cx || !img) return;
      const my = ++seq; cam.classList.remove('on');
      setTimeout(() => {
        if (my !== seq) return;
        try {
          const W = 96, H = 54, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
          const s = Math.max(W / iw, H / ih), w = iw * s, h = ih * s;
          tx.drawImage(img, (W - w) / 2, (H - h) * .4, w, h);
          const d = tx.getImageData(0, 0, W, H), p = d.data;
          for (let i = 0; i < p.length; i += 4) p[i] = p[i + 1] = p[i + 2] = (p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) * .62;
          tx.putImageData(d, 0, 0);
          cam.width = 640; cam.height = 360; cx.imageSmoothingQuality = 'high'; cx.drawImage(tiny, 0, 0, 640, 360);
          cam.classList.add('on');
        } catch (e) { /* sin portada: queda el fondo negro con luces */ }
      }, 380);
    }

    /* Luces ambientales */
    const field = document.createElement('div'); field.className = 'fx-ambient'; field.setAttribute('aria-hidden', 'true');
    const blobs = [0, 1, 2].map(() => field.appendChild(document.createElement('i')));
    n.root && n.root.appendChild(field);

    /* Deriva aleatoria suave: un destino nuevo cada pocos segundos; la transición CSS hace el resto. */
    const drift = () => {
      if (cam) cam.style.transform = `translate3d(${rnd(-3, 3).toFixed(2)}%,${rnd(-2.5, 2.5).toFixed(2)}%,0) scale(${rnd(1.02, 1.09).toFixed(3)}) rotate(${rnd(-.7, .7).toFixed(2)}deg)`;
      blobs.forEach(b => { b.style.transitionDuration = rnd(16, 26).toFixed(1) + 's'; b.style.transform = `translate3d(${rnd(-14, 14).toFixed(1)}vw,${rnd(-12, 12).toFixed(1)}vh,0) scale(${rnd(.9, 1.2).toFixed(2)})`; b.style.opacity = rnd(.55, 1).toFixed(2); });
    };
    let timer = 0;
    const go = () => { if (still || timer) return; drift(); timer = setInterval(drift, 15000); };
    const stop = () => { clearInterval(timer); timer = 0; };

    /* Bucle a 30 fps solo mientras la pestaña esté visible (lo usa la interfaz para su balanceo suave).
       El medidor de 5 barras se anima con una onda suave mientras suena el preview, sin analizar el audio. */
    let raf = 0, last = 0;
    const tick = t => {
      if (document.hidden) { raf = 0; return; }
      raf = requestAnimationFrame(tick);
      if (t - last < 33) return;
      const dt = Math.min(.1, (t - last) / 1000 || .033); last = t;
      const on = audio && !audio.paused && !audio.ended, k = t * .001;
      for (let i = 0; i < 5; i++) {
        const g = on ? .2 + .7 * Math.abs(Math.sin(k * (1.1 + i * .53) + i * 2.1) * Math.cos(k * .7 * (i + 1))) : 0;
        state.bins[i] += (g - state.bins[i]) * .18;
      }
      for (const f of cbs) f(dt, state, k);
    };
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else { go(); last = 0; raf || (raf = requestAnimationFrame(tick)); } });
    go(); raf = requestAnimationFrame(tick);
    return api;
  }
  window.RonFX = { create };
})();
