/* RONALL PROD · fx.js (V65) — motor de motion graphics.
   · Fondo WebGL con postprocesado: portada líquida (domain warp), zoom-blur, bloom, aberración cromática, grano.
   · Péndulos amortiguados (portada + título) con ruido ambiental perpetuo, motion blur por velocidad.
   · Vidrio líquido (filtro SVG de desplazamiento) para rail, player, carrito y licencias.
   · Eventos aleatorios (golpe de zoom, destello, empujón de péndulo) y rueda → carril horizontal del catálogo.
   Un solo bucle rAF. Se pausa con la pestaña oculta. Sin dependencias. Respeta reduced-motion y modo lite. */
(() => {
  'use strict';
  const D = document, root = D.documentElement;
  const reduce = !!window.__reduce;
  const osReduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const $ = (s, r = D) => r.querySelector(s), $$ = (s, r = D) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ───────── Estado compartido ───────── */
  const S = {
    punch: 0,          // golpe de zoom/aberración (decae)
    kick: 0,           // golpe de 808 (decae rápido)
    lv: 0,             // nivel de audio simulado (lee --lv de la portada)
    px: 0, py: 0,      // puntero suavizado (-1..1)
    tx: 0, ty: 0,      // puntero objetivo
    vel: 0,            // velocidad del puntero suavizada
    mix: 1, mixT: 1,   // transición líquida entre portadas
  };
  const P1 = { a: 0, w: 0 };   // péndulo de la portada (grados, grados/s)
  const P2 = { a: 0, w: 0 };   // péndulo del título (arrastrado por el primero)

  let artEl = null;
  const el = {
    art: null, info: null, marq: null, img: null, artImg: null,
  };
  const grab = () => {
    el.art = $('.art-w'); el.info = $('.hero .info'); el.marq = $('#marq');
    el.artImg = $('.art img'); el.img = $('#cimg') || el.artImg; artEl = $('.art');
  };
  grab();

  /* ───────── API pública ───────── */
  const FX = window.RonFX = {
    kick(a = 1) { S.kick = Math.min(1.2, Math.max(S.kick, a)); },
    punch(a = 1) { S.punch = Math.min(1.4, Math.max(S.punch, a)); },
    push(v) { P1.w += v; P2.w += v * .6; },
    flare() { const a = $('.art'); if (!a) return; a.classList.remove('flare'); void a.offsetWidth; a.classList.add('flare'); setTimeout(() => a.classList.remove('flare'), 1500); },
  };

  /* ───────── WebGL ───────── */
  let gl = null, prog = null, uni = {}, texA = null, texB = null, canvas = null, glOK = false;
  const lite = () => root.classList.contains('lite');

  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
uniform sampler2D uA,uB;
uniform vec2 uRes,uPtr;
uniform float uT,uMix,uLv,uPunch,uVel,uKick;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.03+7.1;a*=.5;}return s;}
vec3 art(vec2 uv,float liquid){
  vec3 a=texture2D(uA,uv).rgb;
  vec3 b=texture2D(uB,uv).rgb;
  return mix(a,b,liquid);
}
void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=(v-.5)*vec2(asp,1.);
  float zoom=1.7-uPunch*.14-uLv*.03-uKick*.26;
  p*=zoom;
  float c=cos(uT*.006),s=sin(uT*.006);p=mat2(c,-s,s,c)*p;
  /* domain warp líquido */
  vec2 q=vec2(fbm(p*1.7+vec2(uT*.03,0.)),fbm(p*1.7+vec2(5.2,uT*.034)));
  p+=(q-.5)*(.10+uLv*.04+uPunch*.04+uKick*.05);
  /* onda del puntero */
  vec2 ptr=uPtr*vec2(asp,1.)*.5*zoom;
  vec2 d=p-ptr;float dl=length(d);
  p+=normalize(d+1e-4)*sin(dl*16.-uT*2.6)*exp(-dl*4.2)*(.006+uVel*.012);
  vec2 uv=p+.5+vec2(.06,0.);
  /* transición líquida entre portadas */
  float w=fbm(uv*3.+uT*.05);
  float liquid=smoothstep(0.,1.,clamp(uMix*1.7-w*.7,0.,1.));
  uv+=(q-.5)*sin(uMix*3.14159)*.18;
  /* zoom blur radial + chroma */
  vec2 ctr=vec2(.56,.5);
  vec3 col=vec3(0.);float tw=0.;
  float amt=.018+uPunch*.06+uVel*.012+uKick*.12;
  for(int i=0;i<9;i++){
    float f=float(i)/8.;
    vec2 u2=ctr+(uv-ctr)*(1.-amt*f);
    float wgt=1.-f*.6;
    col+=art(u2,liquid)*wgt;tw+=wgt;
  }
  col/=tw;
  float ca=.002+uPunch*.010+uKick*.014;
  col.r=mix(col.r,art(uv+(uv-ctr)*ca,liquid).r,.55);
  col.b=mix(col.b,art(uv-(uv-ctr)*ca,liquid).b,.55);
  float l=dot(col,vec3(.3,.59,.11));
  /* niveles: negro profundo, plata */
  float base=clamp((l-.18)*1.25,0.,1.);
  vec3 g=vec3(base)*vec3(.94,.96,1.);
  float bloom=pow(base,2.6)*(.55+uLv*.5+uPunch*.4+uKick*.9);
  g=g*(.15+uLv*.05)+bloom*.22;
  /* haces de luz que barren la escena */
  float sw=smoothstep(.55,1.,sin((p.x*1.3+p.y*.7)*3.1+uT*.22+q.x*2.4));
  g+=sw*.022*(.6+uLv);
  /* viñeta + scanlines + grano */
  float vg=smoothstep(1.05,.18,length((v-vec2(.56,.48))*vec2(asp*.62,1.)));
  g*=.06+.94*vg;
  g+=(h(gl_FragCoord.xy+fract(uT)*91.)-.5)*.05;
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
    if (!gl) return false;
    try {
      prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
      gl.useProgram(prog);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['uA', 'uB', 'uRes', 'uPtr', 'uT', 'uMix', 'uLv', 'uPunch', 'uVel', 'uKick'].forEach(n => uni[n] = gl.getUniformLocation(prog, n));
      texA = mkTex(); texB = mkTex();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA); gl.uniform1i(uni.uA, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB); gl.uniform1i(uni.uB, 1);
    } catch (e) { return false; }
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); glOK = false; root.classList.remove('fx-on'); canvas.style.display = 'none'; });
    scene.insertBefore(canvas, scene.firstChild);
    root.classList.add('fx-on');
    size(); addEventListener('resize', size, { passive: true });
    return true;
  }
  function size() {
    if (!canvas) return;
    const k = Math.min(devicePixelRatio || 1, 1.5) * .42;
    const w = Math.max(2, Math.round(innerWidth * k)), h = Math.max(2, Math.round(innerHeight * k));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  let curSrc = '', hasTex = false;
  function upload(img) {
    if (!glOK || !img || !img.complete || !img.naturalWidth) return;
    const src = img.currentSrc || img.src; if (src === curSrc) return;
    try {
      /* B = portada nueva; A = la anterior. Antes de subir, lo visible (B) pasa a A. */
      if (hasTex) swapTex();
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    } catch (e) { glOK = false; root.classList.remove('fx-on'); return; }
    curSrc = src;
    if (!hasTex) { hasTex = true; S.mix = 1; S.mixT = 1; }
    else { S.mix = 0; S.mixT = 1; FX.punch(1); FX.push(rnd(-14, 14)); FX.flare(); }
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

  /* ───────── Péndulos ───────── */
  function stepPendulum(P, k, c, drive, dt) {
    const acc = -k * Math.sin(P.a * Math.PI / 180) * 57.2958 - c * P.w + drive;
    P.w += acc * dt; P.a += P.w * dt; P.a = clamp(P.a, -6, 6);
  }

  /* ───────── Bucle único ───────── */
  let last = 0, T = 0, raf = 0, glTog = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000 || .016); last = now; T += dt;

    /* puntero suavizado + velocidad */
    const ox = S.px, oy = S.py;
    S.px += (S.tx - S.px) * Math.min(1, dt * 4.2); S.py += (S.ty - S.py) * Math.min(1, dt * 4.2);
    const sp = Math.hypot(S.px - ox, S.py - oy) / Math.max(dt, .001);
    S.vel += (clamp(sp * .5, 0, 1) - S.vel) * Math.min(1, dt * 6);
    S.punch *= Math.pow(.04, dt);       // decae ~ .8s
    S.kick *= Math.pow(.0008, dt);      // 808: decae en ~.25s
    const lvRaw = artEl ? parseFloat(artEl.style.getPropertyValue('--lv')) || 0 : 0;
    S.lv += (lvRaw - S.lv) * Math.min(1, dt * 5);
    if (S.mix < S.mixT) S.mix = Math.min(S.mixT, S.mix + dt / 1.5);

    /* ruido ambiental: movimiento aleatorio perpetuo (suma de senos incommensurables) */
    const amb = Math.sin(T * .71) * .9 + Math.sin(T * 1.37 + 1.3) * .6 + Math.sin(T * .29 + 4.1) * 1.1;
    stepPendulum(P1, 8.5, .6, amb * .2 * (1 + S.lv * .8), dt);
    stepPendulum(P2, 15, .95, -P1.w * .9 - P1.a * 1.8, dt);

    /* aplicar transformaciones (solo escribe si cambió lo suficiente) */
    if (el.art) {
      el.art.style.setProperty('--pend', P1.a.toFixed(3) + 'deg');
      el.art.style.setProperty('--ptx', (S.px * 6).toFixed(2) + 'px');
      el.art.style.setProperty('--pty', (S.py * 4).toFixed(2) + 'px');
      el.art.style.setProperty('--mb', clamp(Math.abs(P1.w) * .02 + S.vel * .5, 0, 1.2).toFixed(2));
    }
    if (el.info) {
      el.info.style.setProperty('--pend2', (P2.a * .35).toFixed(3) + 'deg');
      el.info.style.setProperty('--ptx', (S.px * -8).toFixed(2) + 'px');
      el.info.style.setProperty('--pty', (S.py * -4).toFixed(2) + 'px');
    }
    if (el.marq) el.marq.style.setProperty('--skew', (P1.w * -.02 - S.px * .5).toFixed(3) + 'deg');

    /* WebGL */
    glTog ^= 1;
    if (glOK && hasTex && glTog) {
      gl.uniform2f(uni.uRes, canvas.width, canvas.height);
      gl.uniform2f(uni.uPtr, S.px, -S.py);
      gl.uniform1f(uni.uT, T % 600); gl.uniform1f(uni.uMix, S.mix); gl.uniform1f(uni.uLv, S.lv);
      gl.uniform1f(uni.uPunch, S.punch); gl.uniform1f(uni.uKick, S.kick); gl.uniform1f(uni.uVel, S.vel);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  /* ───────── Entradas ───────── */
  function pointer() {
    addEventListener('pointermove', e => {
      S.tx = clamp((e.clientX / innerWidth) * 2 - 1, -1, 1);
      S.ty = clamp((e.clientY / innerHeight) * 2 - 1, -1, 1);
      const mx = e.movementX || 0;
      if (mx) { P1.w += clamp(mx, -40, 40) * .05; }
    }, { passive: true });
    D.addEventListener('click', e => {
      if (e.target.closest('[data-go]')) { FX.punch(.8); FX.push(rnd(-10, 10)); }
      else if (e.target.closest('#b-add,#bp-add')) { FX.punch(1); FX.flare(); }
      else if (e.target.closest('.play,.bc-pl,#mpp')) { FX.punch(.55); FX.push(rnd(-8, 8)); }
    }, true);
  }

  /* Rueda → desplazamiento horizontal suave del carril del catálogo */
  function lane() {
    const g = $('#grid'); if (!g) return;
    let target = 0, raf2 = 0;
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

  /* Eventos aleatorios, espaciados y suaves: la escena respira, no se agita */
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

  /* Letras: el efecto del hover (brillo + salto) se dispara solo, a ratos: alguna letra suelta o una ola */
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

  /* Si el sistema pide menos movimiento, la app se muestra completa igualmente y ofrece este interruptor. */
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
    /* si el equipo va justo, ui.js añade .lite: se apaga el fondo GL y vuelve el horneado */
    new MutationObserver(() => {
      if (lite() && glOK) { glOK = false; root.classList.remove('fx-on'); if (canvas) canvas.remove(); }
    }).observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
