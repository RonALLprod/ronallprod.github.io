(() => {
  'use strict';
  const D = document, root = D.documentElement;
  const reduce = !!window.__reduce;
  const osReduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const $ = (s, r = D) => r.querySelector(s), $$ = (s, r = D) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  const S = {
    punch: 0,
    kick: 0,
    lv: 0,
    px: 0, py: 0,
    tx: 0, ty: 0,
    vel: 0,
    mix: 1, mixT: 1,
    shock: 1, shockA: 0,
  };
  const sp = () => ({ x: 0, v: 0 });
  const M = { X: sp(), Y: sp(), R: sp(), Z: sp(), heat: 0, flash: 0, flashS: 0, dir: 1, ik: 1, ikT: 1, lastHit: 0,
    nz: 0, tA: 0, rate: .6, fade: 0, fadeOn: false, tr: 1 };
  const AMP = .6, DIM = .9;
  const NT = new Float32Array(256); for (let i = 0; i < 256; i++) NT[i] = Math.random() * 2 - 1;
  const vn = x => { const i = Math.floor(x), f = x - i, u = f * f * f * (f * (f * 6 - 15) + 10); return NT[i & 255] + (NT[(i + 1) & 255] - NT[i & 255]) * u; };
  const nz2 = x => vn(x) * .72 + vn(x * 2.03 + 17.3) * .28;
  const sstep = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const Wu = () => clamp(innerWidth / Math.max(1, innerHeight), .4, 2.2);
  // Impulso físico con resorte suave y amortiguado.
  function hit(a) {
    const now = performance.now();
    if (M.lastHit) M.ikT = clamp((now - M.lastHit) / 1000 / 1.15, 1, 2.8);
    M.lastHit = now;
    const strength = Math.min(1, a * 1.1 + .05), W = Wu(), ik = M.ik;
    const imp = (.45 + strength * .55) * AMP;
    M.dir = -M.dir;
    M.heat += (1 - M.heat) * (.45 + strength * .55);
    M.Z.x = Math.min(.1, M.Z.x); M.Z.v = Math.min(2.4, M.Z.v + imp * .28 / ik);
    M.X.x += M.dir * W * .022 * imp; M.X.v += M.dir * W * 1.55 * imp / ik;
    M.Y.x += (Math.random() - .5) * W * .015 * imp; M.Y.v += (Math.random() * 2 - 1) * W * 1.1 * imp / ik;
    M.R.v += M.dir * (55 + Math.random() * 28) * imp / ik;
    M.flash = Math.max(M.flash, .55 + strength * .45);
  }
  const P1 = { a: 0, w: 0 };
  const P2 = { a: 0, w: 0 };

  let artEl = null;
  const el = {
    art: null, info: null, marq: null, img: null, artImg: null,
  };
  const grab = () => {
    el.art = $('.art-w'); el.info = $('.hero .info'); el.marq = $('#marq');
    el.artImg = $('.art img'); el.img = $('#cimg') || el.artImg; artEl = $('.art');
  };
  grab();

  const FX = window.RonFX = {
    kick(a = 1) {
      S.kick = Math.min(1.2, Math.max(S.kick, a)); hit(a);
      S.shock = 0; S.shockA = Math.min(1.2, a); P1.w += (Math.random() < .5 ? -1 : 1) * a * 5;
    },
    punch(a = 1) { hit(a * .5); },
    push(v) { P1.w += v; P2.w += v * .6; },
    flare() { const a = $('.art'); if (!a) return; a.classList.remove('flare'); void a.offsetWidth; a.classList.add('flare'); setTimeout(() => a.classList.remove('flare'), 1500); },
  };

  let gl = null, prog = null, uni = {}, texA = null, texB = null, canvas = null, glOK = false;
  const lite = () => root.classList.contains('lite');

  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
uniform sampler2D uA,uB;
uniform vec2 uRes,uPtr,uOff;
uniform float uT,uMix,uLv,uFlash,uVel,uShock,uShockA,uRot,uScl,uFade,uSettled,uDim,uTaps;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){
  vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);
}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.03+7.1;a*=.5;}return s;}
vec3 art(vec2 uv,float liquid){
  vec3 b=texture2D(uB,uv).rgb;
  if(uSettled>.5) return b;
  return mix(texture2D(uA,uv).rgb,b,liquid);
}
void main(){
  float asp=uRes.x/uRes.y;
  vec2 sp=(v-.5)*vec2(asp,1.);
  float cz=min(1.,1./asp)*.86;
  float zoom=cz/uScl;
  float sl=length(sp);
  float ring=exp(-pow((sl-uShock*.95)*7.5,2.))*(1.-uShock)*uShockA;
  vec2 p=sp+normalize(sp+1e-4)*ring*.04-uOff;
  p*=zoom;
  float c=cos(uRot),s=sin(uRot);p=mat2(c,-s,s,c)*p;
  vec2 q=vec2(fbm(p*1.7+vec2(uT*.03,0.)),fbm(p*1.7+vec2(5.2,uT*.034)));
  p+=(q-.5)*(.03+uLv*.02+uFlash*.03);
  vec2 ptr=uPtr*vec2(asp,1.)*.5*zoom;
  vec2 d=p-ptr;float dl=length(d);
  p+=normalize(d+1e-4)*sin(dl*16.-uT*2.6)*exp(-dl*4.2)*(uVel*.012);
  vec2 uv=p+.5+vec2(.03,0.);
  float liquid=1.;
  if(uSettled<.5){
    float w=fbm(uv*3.+uT*.05);
    liquid=smoothstep(0.,1.,clamp(uMix*1.7-w*.7,0.,1.));
    uv+=(q-.5)*sin(uMix*3.14159)*.18;
  }
  vec2 ctr=vec2(.56,.5);
  vec3 col=vec3(0.);float tw=0.;
  float rev=1.-uFade;
  float amt=.018+uFlash*.08+uVel*.012+rev*rev*.035;
  float nT=max(uTaps,2.);
  for(int i=0;i<9;i++){
    if(float(i)>=nT)break;
    float f=float(i)/(nT-1.);
    vec2 u2=ctr+(uv-ctr)*(1.-amt*f);
    float wgt=1.-f*.6;
    col+=art(u2,liquid)*wgt;tw+=wgt;
  }
  col/=tw;
  float ca=.002+uFlash*.014;
  col.r=mix(col.r,art(uv+(uv-ctr)*ca,liquid).r,.55);
  col.b=mix(col.b,art(uv-(uv-ctr)*ca,liquid).b,.55);
  float l=dot(col,vec3(.3,.59,.11));
  float base=clamp((l-.18)*1.25,0.,1.);
  vec3 g=vec3(base)*vec3(.94,.96,1.);
  float bloom=pow(base,2.6)*(.55+uLv*.5+uFlash*.9);
  g=g*(.19+uLv*.06+ring*.5)+bloom*.24+ring*.06;
  float sw=smoothstep(.55,1.,sin((p.x*1.3+p.y*.7)*3.1+uT*.22+q.x*2.4));
  g+=sw*.022*(.6+uLv);
  float vg=1.-smoothstep(.18,1.05,length((v-vec2(.56,.48))*vec2(asp*.62,1.)));
  g*=.06+.94*vg;
  g*=uDim*uFade;
  g+=(h(gl_FragCoord.xy+fract(uT)*91.)-.5)*.05*uFade;
  g*=.97+.03*sin(gl_FragCoord.y*1.6);
  gl_FragColor=vec4(g,1.);
}`;


  function sh(t, src) { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function mkTex() {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return t;
  }
  function initGL() {
    const scene = $('.scene'); if (!scene || reduce || lite()) return false;
    canvas = D.createElement('canvas'); canvas.className = 'fx-canvas'; canvas.setAttribute('aria-hidden', 'true');
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl) { canvas = null; return false; }
    try {
      prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
      gl.useProgram(prog);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['uA', 'uB', 'uRes', 'uPtr', 'uOff', 'uT', 'uMix', 'uLv', 'uFlash', 'uVel', 'uShock', 'uShockA', 'uRot', 'uScl', 'uFade', 'uSettled', 'uDim', 'uTaps'].forEach(n => uni[n] = gl.getUniformLocation(prog, n));
      texA = mkTex(); texB = mkTex();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA); gl.uniform1i(uni.uA, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB); gl.uniform1i(uni.uB, 1);
    } catch (e) { canvas = null; gl = null; return false; }
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); glOK = false; root.classList.remove('fx-on'); canvas.style.display = 'none'; });
    scene.insertBefore(canvas, scene.firstChild);
    root.classList.add('fx-on');
    size(); let rz = 0; addEventListener('resize', () => { if (!rz) rz = requestAnimationFrame(() => { rz = 0; size(); }); }, { passive: true });
    return true;
  }
  const DPR = Math.min(devicePixelRatio || 1, 1.5), TIERS = [.3, .4, .5, .6, .72];
  let tier = 2, qk = DPR * TIERS[tier], qCool = 120, ema = 16.7, slow = 0, base = 16.7, good = 0, lastDown = -1e9, half = false;
  function adapt(dt) {
    if (root.classList.contains('vt')) { qCool = Math.max(qCool, 40); return; }
    const ms = dt * 1000; ema += (ms - ema) * .05; if (ms < base) base += (ms - base) * .05; else base += (ms - base) * .002;
    if (--qCool > 0) return;
    if (ema > Math.max(24, base * 1.45) && tier > 0) { tier--; lastDown = T; good = 0; qCool = 90; qk = DPR * TIERS[tier]; size(); }
    else if (ema < base * 1.12 && tier < TIERS.length - 1 && T - lastDown > 25) { if (++good > 300) { good = 0; tier++; qCool = 90; qk = DPR * TIERS[tier]; size(); } }
    else good = 0;
    half = tier === 0 && ema > 28;
    if (ema > 42 && tier === 0) { if (++slow > 240) root.classList.add('lite'); } else slow = 0;
  }
  function size() {
    if (!canvas) return;
    const k = qk;
    const w = Math.max(2, Math.round(innerWidth * k)), h = Math.max(2, Math.round(innerHeight * k));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  let curSrc = '', hasTex = false;
  let upTok = 0;
  function upload(img) {
    if (!glOK || !img || !img.complete || !img.naturalWidth) return;
    const tok = ++upTok, go = () => { if (tok === upTok) doUpload(img); };
    if (img.decode) img.decode().then(go, go); else go();
  }
  function doUpload(img) {
    if (!glOK || !img || !img.complete || !img.naturalWidth) return;
    const src = img.currentSrc || img.src; if (src === curSrc) return;
    try {
      if (hasTex) swapTex();
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    } catch (e) { glOK = false; root.classList.remove('fx-on'); return; }
    curSrc = src;
    if (!hasTex) { hasTex = true; S.mix = 1; S.mixT = 1; M.fadeOn = true; M.fade = 0; }
    else { S.mix = 0; S.mixT = 1; M.tr = 0; hit(.8); FX.push(rnd(-14, 14)); FX.flare(); }
  }
  function swapTex() {
    const t = texA; texA = texB; texB = t;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB);
  }

  function watchCover() {
    if (!el.img) return;
    const go = () => upload(el.img);
    el.img.addEventListener('load', go);
    if ('MutationObserver' in window) new MutationObserver(go).observe(el.img, { attributes: true, attributeFilter: ['src'] });
    if (el.img.complete) go();
  }

  function stepPendulum(P, k, c, drive, dt) {
    const acc = -k * Math.sin(P.a * Math.PI / 180) * 57.2958 - c * P.w + drive;
    P.w += acc * dt; P.a += P.w * dt; P.a = clamp(P.a, -6, 6);
  }

  let sceneNow = { ox: 0, oy: 0, rot: 0, scl: 1.04 };
  function camera(dt) {
    const d = Math.max(dt, .004), W = Wu();
    M.rate += ((root.classList.contains('live') ? 1 : .6) - M.rate) * (1 - Math.exp(-d * 1.2));
    M.tA += d * M.rate;
    M.ik += (M.ikT - M.ik) * (1 - Math.exp(-d * 40));
    if (performance.now() - M.lastHit > 3000) M.ikT = 1;
    const ik = M.ik;
    for (let i = 0; i < 5; i++) {
      const h = d / 5;
      for (const k of [M.X, M.Y, M.R]) { k.v += (-125 / (ik * ik) * k.x - 22.4 / ik * k.v) * h; k.x += k.v * h; }
      M.Z.v += (-2.5 / (ik * ik) * M.Z.x - 3.16 / ik * M.Z.v) * h; M.Z.x += M.Z.v * h;
    }
    M.X.x = clamp(M.X.x, -W * .06, W * .06); M.Y.x = clamp(M.Y.x, -W * .045, W * .045);
    M.heat = Math.max(0, M.heat * Math.exp(-d * 1.45 / ik) - d * .02 / ik);
    M.flash *= Math.exp(-d * 4.2 / ik);
    M.flashS += (M.flash - M.flashS) * (1 - Math.exp(-d * (M.flash > M.flashS ? 70 : 5 / ik)));
    const e = M.heat * M.heat;
    M.nz += Math.min(.5, (7 + Math.pow(M.heat, 4.4) * 23) * d);
    const tt = M.tA * 2.4;
    const ax = Math.sin(tt * .37) + Math.sin(tt * .91 + 1.7) * .5 + Math.sin(tt * 1.73 + .3) * .25;
    const ay = Math.sin(tt * .43 + 2.1) + Math.sin(tt * 1.07 + .4) * .5 + Math.sin(tt * 1.91 + 1.1) * .25;
    const ar = Math.sin(tt * .29 + .7) * .35 + Math.sin(tt * .83) * .15;
    sceneNow.ox = ax * W * .007 + M.X.x + nz2(M.nz) * e * W * .05 * AMP;
    sceneNow.oy = ay * W * .006 + M.Y.x + nz2(M.nz + 31.7) * e * W * .04 * AMP;
    sceneNow.rot = (ar + M.R.x + nz2(M.nz * .8 + 67.3) * e * 2.2 * AMP) * Math.PI / 180;
    if (M.fadeOn && M.fade < 1) M.fade = Math.min(1, M.fade + d / 2.4);
    if (M.tr < 1) M.tr = Math.min(1, M.tr + d / 1.8);
    sceneNow.scl = 1.04 + Math.sin(tt * .21) * .006 + M.Z.x + e * .012 + S.lv * .018 + (1 - sstep(M.fade)) * .06 + (1 - sstep(M.tr)) * .05;
  }
  const q = (v, st) => v < st ? '0' : (Math.round(v / st) * st).toFixed(2);
  const put = (e, k, v) => { const c = e._c || (e._c = {}); if (c[k] !== v) { c[k] = v; e.style.setProperty(k, v); } };
  const ease = (dt, k) => 1 - Math.exp(-dt * k);
  let last = 0, T = 0, raf = 0, mxAcc = 0, vtN = 0, skip = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000 || .016); last = now; T += dt;
    adapt(dt);
    if (mxAcc) { P1.w += mxAcc * .05; mxAcc = 0; }

    const ox = S.px, oy = S.py;
    const ep = ease(dt, 4.4); S.px += (S.tx - S.px) * ep; S.py += (S.ty - S.py) * ep;
    const sp = Math.hypot(S.px - ox, S.py - oy) / Math.max(dt, .001);
    S.vel += (clamp(sp * .5, 0, 1) - S.vel) * ease(dt, 6);
    S.kick *= Math.pow(.0008, dt);
    const lvRaw = artEl ? parseFloat(artEl.style.getPropertyValue('--lv')) || 0 : 0;
    S.lv += (lvRaw - S.lv) * ease(dt, 7);
    if (S.mix < S.mixT) S.mix = Math.min(S.mixT, S.mix + dt / 1.9);
    camera(dt);

    const amb = Math.sin(T * .71) * .9 + Math.sin(T * 1.37 + 1.3) * .6 + Math.sin(T * .29 + 4.1) * 1.1;
    stepPendulum(P1, 8.5, .6, amb * .2 * (1 + S.lv * .8), dt);
    stepPendulum(P2, 15, .95, -P1.w * .9 - P1.a * 1.8, dt);

    S.shock = Math.min(1, S.shock + dt / .62);
    if (el.art) {
      put(el.art, '--pend', P1.a.toFixed(2) + 'deg');
      put(el.art, '--ptx', (S.px * 6).toFixed(1) + 'px');
      put(el.art, '--pty', (S.py * 4).toFixed(1) + 'px');
      put(el.art, '--mb', q(clamp(Math.abs(P1.w) * .02 + S.vel * .5, 0, 1.2), .2));
      put(el.art, '--kk', S.kick > .01 ? S.kick.toFixed(2) : '0');
    }
    if (el.info) {
      const m2 = q(clamp(Math.abs(P2.w) * .012, 0, .8), .2);
      put(el.info, '--pend2', (P2.a * .35).toFixed(2) + 'deg');
      put(el.info, '--ptx', (S.px * -8).toFixed(1) + 'px');
      put(el.info, '--pty', (S.py * -4).toFixed(1) + 'px');
      put(el.info, '--mb2', m2);
      el.info.classList.toggle('mb', +m2 > 0);
    }
    if (el.marq) put(el.marq, '--skew', (P1.w * -.02 - S.px * .5).toFixed(2) + 'deg');

    if (glOK && hasTex) {
      half = half || (root.classList.contains('vt') && ++vtN % 2 === 0); // 30 fps durante transiciones de sección
      if (half && ++skip % 2 === 0) { half = tier === 0 && ema > 28; return; }
      const mixE = S.mix >= 1 ? 1 : sstep(S.mix);
      const flash = M.flashS, amtHi = flash > .15 || S.vel > .4 || M.fade < .98;
      gl.uniform2f(uni.uRes, canvas.width, canvas.height);
      gl.uniform2f(uni.uPtr, S.px, -S.py); gl.uniform2f(uni.uOff, sceneNow.ox, sceneNow.oy);
      gl.uniform1f(uni.uT, T % 628.3185); gl.uniform1f(uni.uMix, mixE); gl.uniform1f(uni.uLv, S.lv);
      gl.uniform1f(uni.uFlash, flash); gl.uniform1f(uni.uVel, S.vel);
      gl.uniform1f(uni.uShock, S.shock); gl.uniform1f(uni.uShockA, S.shockA);
      gl.uniform1f(uni.uRot, sceneNow.rot); gl.uniform1f(uni.uScl, sceneNow.scl);
      gl.uniform1f(uni.uFade, sstep(M.fade)); gl.uniform1f(uni.uSettled, S.mix >= 1 ? 1 : 0);
      gl.uniform1f(uni.uDim, DIM); gl.uniform1f(uni.uTaps, amtHi ? 9 : 5);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  function pointer() {
    addEventListener('pointermove', e => {
      S.tx = clamp((e.clientX / innerWidth) * 2 - 1, -1, 1);
      S.ty = clamp((e.clientY / innerHeight) * 2 - 1, -1, 1);
      mxAcc += clamp(e.movementX || 0, -40, 40);
    }, { passive: true });
    D.addEventListener('click', e => {
      if (e.target.closest('[data-go]')) { FX.punch(.6); FX.push(rnd(-10, 10)); }
      else if (e.target.closest('#b-add,#bp-add')) { FX.punch(1); FX.flare(); }
      else if (e.target.closest('.play,.bc-pl,#mpp')) { FX.punch(.55); FX.push(rnd(-8, 8)); }
    }, true);
  }

  function lane() {
    const g = $('#grid'); if (!g) return;
    let target = 0, raf2 = 0, lastL = g.scrollLeft, v = 0, braf = 0;
    const blurLoop = () => {
      v *= .86;
      const b = q(clamp(Math.abs(v) * .05, 0, 2.5), .25);
      put(g, '--sb', b); g.classList.toggle('mb', +b > 0);
      braf = +b > 0 ? requestAnimationFrame(blurLoop) : 0;
    };
    g.addEventListener('scroll', () => {
      if (g.classList.contains('list')) return;
      const l = g.scrollLeft; v = v * .5 + (l - lastL); lastL = l;
      if (!braf) braf = requestAnimationFrame(blurLoop);
    }, { passive: true });
    const tick = () => {
      const d = target - g.scrollLeft;
      if (Math.abs(d) < .5) { raf2 = 0; return; }
      g.scrollLeft += d * .14; raf2 = requestAnimationFrame(tick);
    };
    g.addEventListener('wheel', e => {
      if (g.classList.contains('list')) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      if (!raf2) target = g.scrollLeft;
      target = clamp(target + e.deltaY * 1.15, 0, g.scrollWidth - g.clientWidth);
      P1.w += clamp(e.deltaY, -80, 80) * .012;
      if (!raf2) raf2 = requestAnimationFrame(tick);
    }, { passive: false });
  }

  function chaos() {
    const next = () => setTimeout(() => {
      if (!D.hidden) {
        const r = Math.random();
        if (r < .5) FX.push(rnd(-12, 12));
        else if (r < .8) FX.punch(rnd(.2, .35));
        else { FX.flare(); }
      }
      next();
    }, rnd(9000, 16000));
    next();
  }

  function letters() {
    const live = () => $$('.view.active :is(h1,.h2) .l, body.pg h1 .l').filter(l => l.offsetParent);
    const hot = (l, ms = 750) => { l.classList.add('hot'); setTimeout(() => l.classList.remove('hot'), ms); };
    const run = () => {
      if (!D.hidden) {
        const ls = live();
        if (ls.length) {
          if (Math.random() < .55) {
            const n = 1 + Math.floor(Math.random() * 3);
            for (let i = 0; i < n; i++) hot(ls[Math.floor(Math.random() * ls.length)], rnd(600, 900));
          } else {
            ls.forEach((l, i) => setTimeout(() => hot(l, 620), i * 70));
          }
        }
      }
      setTimeout(run, rnd(1600, 3600));
    };
    setTimeout(run, 2600);
  }

  function motionToggle() {
    if (!osReduce) return;
    const b = D.createElement('button'); b.type = 'button'; b.className = 'motion-toggle';
    b.textContent = reduce ? 'Activar movimiento' : 'Reducir movimiento';
    b.addEventListener('click', () => { try { localStorage.setItem('ronMotion', reduce ? 'on' : 'off'); } catch (e) {} location.reload(); });
    D.body.appendChild(b);
  }
  function boot() {
    motionToggle();
    grab();
    glOK = initGL();
    if (glOK) watchCover();
    if (reduce) return;
    pointer(); lane(); chaos(); letters();
    raf = requestAnimationFrame(frame);
    D.addEventListener('visibilitychange', () => {
      if (D.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
    new MutationObserver(() => {
      if (lite() && glOK) { glOK = false; root.classList.remove('fx-on'); if (canvas) canvas.remove(); }
    }).observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
