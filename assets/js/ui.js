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
    const N = 128, c = D.createElement('canvas'); c.width = c.height = N;
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

  const revealStates = new WeakMap();
  function reveal(view, replay = false) {
    if (!view) return;
    let state = revealStates.get(view);
    if (!state) {
      state = { io: null, timer: 0, seq: 0 };
      revealStates.set(view, state);
    }

    // Re-arm entrance reveals when the user returns to a section.
    if (replay) {
      state.seq++;
      clearTimeout(state.timer);
      if (state.io) { state.io.disconnect(); state.io = null; }
      $$('.rvb', view).forEach(e => e.classList.remove('in'));
    }

    const els = $$('.rvb:not(.in)', view);
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || reduce) {
      els.forEach(e => e.classList.add('in'));
      return;
    }

    if (!state.io) {
      const io = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      }), { root: view, rootMargin: '0px 0px -6% 0px', threshold: .06 });
      state.io = io;
    }
    els.forEach(e => state.io.observe(e));

    const seq = state.seq;
    clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      if (state.seq !== seq) return;
      $$('.rvb:not(.in)', view).forEach(e => e.classList.add('in'));
    }, 4500);
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
    let rz = 0; addEventListener('resize', () => { if (!rz) rz = requestAnimationFrame(() => { rz = 0; place(); }); }, { passive: true });
    return place;
  }

  function pulse(audio, o = {}) {
    let raf = 0, lastFrame = 0, bassS = 0, eqs = [], eqT = -1e9;
    let armed = true, quietMs = 0, hitPeak = 0, lastHit = -Infinity;
    const art = o.art, lv5 = [0, 0, 0, 0, 0]; window.RonBands = lv5;
    const EQB = [[35, 120], [120, 300], [300, 1000], [1000, 4000], [4000, 12000]];
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const makeEnv = () => ({ fast: 0, slow: 0, noise: 0, rise: 0, prevFast: 0 });
    let subEnv = makeEnv(), bodyEnv = makeEnv();

    const eqList = t => {
      if (t - eqT > 400) {
        eqT = t;
        eqs = $$('.eq').filter(e => { const c = e.closest('.bc'); return !c || c.classList.contains('playing'); });
        eqs.forEach(e => e.classList.add('rx'));
      }
      return eqs;
    };
    const eqOff = () => {
      eqs.forEach(e => { e.classList.remove('rx'); [...e.children].forEach(x => { x.style.transform = ''; x._s = null; }); });
      eqs = []; eqT = -1e9;
    };
    const makeBandTap = (ctx, source, low, high) => {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = low; hp.Q.value = .707;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = high; lp.Q.value = .707;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;
      const mute = ctx.createGain();
      mute.gain.value = 0;
      source.connect(hp); hp.connect(lp); lp.connect(analyser);
      analyser.connect(mute); mute.connect(ctx.destination);
      return { analyser, data: new Float32Array(analyser.fftSize) };
    };
    const setup = () => {
      if (!audio || audio._ron) return audio && audio._ron;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        const ctx = new AC(), source = ctx.createMediaElementSource(audio), analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = .12;
        source.connect(analyser); analyser.connect(ctx.destination);
        let detectors = null;
        try {
          detectors = {
            sub: makeBandTap(ctx, source, 24, 145),
            body: makeBandTap(ctx, source, 85, 280),
          };
        } catch (e) { detectors = null; }
        const hz = ctx.sampleRate / analyser.fftSize, bin = f => Math.max(1, Math.round(f / hz));
        audio._ron = {
          ctx, analyser, bins: new Uint8Array(analyser.frequencyBinCount),
          eq: EQB.map(([x, y]) => [bin(x), Math.max(bin(x), bin(y))]),
          detectors,
        };
      } catch (e) { audio._ron = null; }
      return audio._ron;
    };
    const band = (bins, a, b) => {
      let sum = 0;
      for (let i = a; i <= b; i++) sum += bins[i];
      return sum / ((b - a + 1) * 255);
    };
    const rms = tap => {
      tap.analyser.getFloatTimeDomainData(tap.data);
      let sum = 0;
      for (let i = 0; i < tap.data.length; i++) sum += tap.data[i] * tap.data[i];
      return Math.sqrt(sum / tap.data.length);
    };
    const updateEnv = (state, value, dt) => {
      const fastTau = value > state.fast ? .018 : .075;
      const slowTau = value > state.slow ? .11 : .22;
      state.fast += (value - state.fast) * (1 - Math.exp(-dt / fastTau));
      state.slow += (value - state.slow) * (1 - Math.exp(-dt / slowTau));
      if (value < state.noise * 2.2 + .012) {
        state.noise += (value - state.noise) * (value < state.noise ? .12 : .012);
      }
      state.rise = Math.max(0, state.fast - state.prevFast);
      state.prevFast = state.fast;
      return state.fast - state.slow;
    };
    const resetDetector = () => {
      subEnv = makeEnv(); bodyEnv = makeEnv();
      armed = true; quietMs = 0; hitPeak = 0; lastHit = -Infinity;
      bassS = 0; lastFrame = 0;
    };
    const detect808 = (A, t, dt) => {
      const subRms = rms(A.detectors.sub);
      const bodyRms = rms(A.detectors.body);
      const prominence = updateEnv(subEnv, subRms, dt);
      const bodyProminence = updateEnv(bodyEnv, bodyRms, dt);

      // Adaptive gates follow the noise floor and the sustained bass level.
      const gate = Math.max(.012, subEnv.noise * 2.6 + .004, subEnv.slow * .22);
      const promGate = Math.max(.006, subEnv.slow * .25, subEnv.noise * 1.5);
      const riseGate = Math.max(.0035, subEnv.slow * .085, subEnv.noise * .8);

      // Re-arm only after the low-frequency envelope has genuinely fallen.
      if (!armed) {
        hitPeak = Math.max(hitPeak, subEnv.fast);
        const releaseGate = Math.max(gate * 1.15, hitPeak * .52);
        if (subEnv.fast < releaseGate && subRms < hitPeak * .65) quietMs += dt * 1000;
        else quietMs = 0;
        if (quietMs >= 36) { armed = true; quietMs = 0; hitPeak = 0; }
      }

      if (armed && t - lastHit >= 145 && subRms > gate &&
          prominence > promGate && subEnv.rise > riseGate) {
        const pScore = clamp((prominence - promGate) / (promGate * 3), 0, 1);
        const aScore = clamp((subEnv.rise - riseGate) / (riseGate * 4), 0, 1);
        const bScore = clamp(bodyProminence / Math.max(.01, prominence * 1.6), 0, 1);
        const strength = clamp(.22 + pScore * .18 + aScore * .18 + bScore * .10, .22, .70);
        lastHit = t; armed = false; quietMs = 0; hitPeak = subEnv.fast;
        if (window.RonFX && RonFX.kick) RonFX.kick(strength);
      }

      // Smooth low-end intensity drives the continuous visual response, not hit counting.
      const level = clamp((subEnv.fast - subEnv.noise * 1.4) * 13.5 + bodyEnv.fast * 1.8, 0, 1);
      bassS += (level - bassS) * (level > bassS ? .42 : .18);
      return bassS;
    };
    const tick = t => {
      raf = requestAnimationFrame(tick);
      const A = audio && audio._ron;
      if (!A) return;
      A.analyser.getByteFrequencyData(A.bins);
      const dt = lastFrame ? clamp((t - lastFrame) / 1000, .004, .05) : 1 / 60;
      lastFrame = t;
      let v = 0;

      if (A.detectors && A.detectors.sub && A.detectors.body) {
        v = detect808(A, t, dt);
      } else {
        // Graceful visual fallback on browsers without filter-node support; no kick triggers.
        const low = band(A.bins, A.eq[0][0], A.eq[0][1]);
        bassS += (clamp(low * 1.4, 0, 1) - bassS) * .18;
        v = bassS;
      }

      for (let i = 0; i < 5; i++) {
        const target = Math.min(1, band(A.bins, A.eq[i][0], A.eq[i][1]) * (1.1 + i * .4));
        lv5[i] += (target - lv5[i]) * (target > lv5[i] ? .6 : .2);
      }
      for (const q of eqList(t)) {
        for (let i = 0; i < 5 && i < q.children.length; i++) {
          const sc = (.12 + lv5[i] * .88).toFixed(2), c = q.children[i];
          if (c._s !== sc) { c._s = sc; c.style.transform = 'scaleY(' + sc + ')'; }
        }
      }
      if (art) art.style.setProperty('--lv', v.toFixed(3));
    };
    const on = () => {
      root.classList.add('live');
      const A = setup();
      if (A && A.ctx.state === 'suspended') A.ctx.resume().catch(() => {});
      if (!raf && !reduce && !D.hidden) {
        resetDetector();
        raf = requestAnimationFrame(tick);
      }
    };
    const off = () => {
      root.classList.remove('live');
      cancelAnimationFrame(raf); raf = 0;
      resetDetector(); eqOff();
      if (art) art.style.setProperty('--lv', 0);
    };
    if (audio) {
      audio.addEventListener('play', on);
      audio.addEventListener('playing', on);
      audio.addEventListener('pause', off);
      audio.addEventListener('ended', off);
    }
    D.addEventListener('visibilitychange', () => {
      if (D.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (audio && !audio.paused) on();
    });
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

  window.RonUI = { reduce, fine, absUrl, vib, letters, count, scene, tilt, sheen, reveal, indicator, pulse, adaptive };
})();