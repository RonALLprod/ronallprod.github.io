/* Build: RONALL-VISUAL-2026-11-11-V12 */
/* RONALL PROD V9 · FX ENGINE
   Reactor del motor original v5 + escena de fondo basada en la arquitectura REAL
   del Private Catalog: cover + cámara 2D + bloom independiente + luz WebGL + scan/flash.
   La portada no se deforma con un shader; el movimiento es de cámara, como en Private. */
(() => {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const follow = (v, t, dt, up, down) => v + (t - v) * (1 - Math.exp(-dt / (t > v ? up : down)));

  class Reactor {
    constructor(audio) {
      this.audio = audio; this.ac = null; this.an = null; this.data = null;
      this.bass = 0; this.mid = 0; this.high = 0; this.hit = 0; this.energy = 0;
      this.bins = new Float32Array(5); this._avg = 0; this._t = 0;
    }
    wake() {
      if (this.an) { this.ac && this.ac.state === 'suspended' && this.ac.resume(); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ac = new AC();
        const src = this.ac.createMediaElementSource(this.audio);
        this.an = this.ac.createAnalyser(); this.an.fftSize = 1024; this.an.smoothingTimeConstant = .84;
        src.connect(this.an); this.an.connect(this.ac.destination);
        this.data = new Uint8Array(this.an.frequencyBinCount);
      } catch (e) { this.an = null; }
      this.ac && this.ac.state === 'suspended' && this.ac.resume();
    }
    _band(a, b) { let s = 0, n = 0; for (let i = a; i < b && i < this.data.length; i++) { s += this.data[i]; n++; } return n ? s / n / 255 : 0; }
    update(dt, playing) {
      this._t += dt;
      let rb = 0, rm = 0, rh = 0; const g = [0, 0, 0, 0, 0];
      if (playing) {
        if (this.an) {
          this.an.getByteFrequencyData(this.data);
          rb = this._band(1, 5); rm = this._band(5, 40); rh = this._band(40, 200);
          g[0] = this._band(1, 3); g[1] = this._band(3, 8); g[2] = this._band(8, 24); g[3] = this._band(24, 70); g[4] = this._band(70, 200);
        } else {
          const t = this._t; rb = .2 + .08 * Math.sin(t * 3.1); rm = .14 + .05 * Math.sin(t * 1.7 + 1); rh = .09 + .03 * Math.sin(t * 2.3);
          for (let i = 0; i < 5; i++) g[i] = .16 + .08 * Math.sin(t * (1.2 + i * .55) + i);
        }
      }
      rb = clamp(Math.pow(rb, 1.32) * 1.75, 0, 1); rm = clamp(rm * 1.32, 0, 1); rh = clamp(rh * 1.75, 0, 1);
      const trans = Math.max(0, rb - this._avg - .035);
      this._avg = follow(this._avg, rb, dt, .55, .55);
      this.bass = follow(this.bass, rb, dt, .10, .42);
      this.mid = follow(this.mid, rm, dt, .14, .50);
      this.high = follow(this.high, rh, dt, .09, .34);
      this.hit = follow(this.hit, clamp(trans * 7, 0, 1), dt, .055, .36);
      for (let i = 0; i < 5; i++) this.bins[i] = follow(this.bins[i], clamp(g[i] * 1.25, 0, 1), dt, .08, .30);
      this.energy = follow(this.energy, (rb + rm + rh) / 3, dt, .2, .6);
      return this;
    }
  }

  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  // Luz volumétrica basada en el shader del Private Catalog (sin dibujar ni retorcer la portada).
  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  uniform vec2 R; uniform float T,bass,high,hit,pz;
  uniform vec3 cA,cB;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
  void main(){
    vec2 uv=(gl_FragCoord.xy-.5*R)/R.y; vec2 q=uv*1.6;
    float w=fbm(q+vec2(T*.04,-T*.03)); float f=fbm(q+w*1.5+vec2(-T*.05,T*.02));
    vec2 lp=vec2(sin(T*.20)*.12,.05+bass*.05+hit*.025);
    float d=length((uv-lp)*vec2(1.,1.15));
    float core=.012/(d*d+.004)*(.42+bass*1.35+hit*1.1);
    float halo=exp(-d*4.8)*(.16+bass*.65+hit*.48);
    float shaft=pow(max(0.,1.-abs(uv.x-lp.x)*2.5),3.)*smoothstep(-1.,.2,uv.y)*.055*(.35+high*1.25+hit*.45);
    float fogm=(.025+f*.24)*(.26+bass*.38);
    vec3 tint=mix(cA,cB,.35);
    vec3 c=tint*(halo*(.48+w*.42)+shaft+fogm)+mix(tint,vec3(.92),.72)*core*.46;
    c*=1.-smoothstep(.3,1.05,length(uv*vec2(.9,1.)))*.82;
    c=1.-exp(-c*1.6); c*=1.-pz*.32;
    gl_FragColor=vec4(max(c,0.),.82);
  }`;

  class PrivateBackdrop {
    constructor(nodes, audio) {
      this.n = nodes; this.audio = audio; this.reactor = new Reactor(audio);
      this.image = null; this.acc = [.8,.8,.8]; this.time = 0; this.last = 0; this.lastCamera = 0;
      this.visible = true; this.pointer = [0,0]; this.pointerTo = [0,0]; this.pz = .25;
      this.flash = 0; this.q = 0; this.fn = 0; this.slow = 0; this.lastGL = 0; this._o = {}; this.ready = false; this.gl = null; this.uniforms = {};
      this.ctx = this.n.camera?.getContext('2d', { alpha: true, desynchronized: true }) || null;
      this._initGL(); this._resize(); this._bind();
      this._tick = this._tick.bind(this); requestAnimationFrame(this._tick);
    }
    _initGL() {
      const c = this.n.light; if (!c) return;
      try {
        const g = this.gl = c.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
        if (!g) throw new Error('WebGL no disponible');
        const shader = (type, source) => { const s = g.createShader(type); g.shaderSource(s, source); g.compileShader(s); if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s)); return s; };
        const p = g.createProgram(); g.attachShader(p, shader(g.VERTEX_SHADER, VS)); g.attachShader(p, shader(g.FRAGMENT_SHADER, FS)); g.linkProgram(p);
        if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(p));
        g.useProgram(p); g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer());
        g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), g.STATIC_DRAW);
        const a = g.getAttribLocation(p, 'p'); g.enableVertexAttribArray(a); g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
        this.uniforms = {}; ['R','T','bass','high','hit','pz','cA','cB'].forEach(k => this.uniforms[k] = g.getUniformLocation(p,k));
        this.program = p; c.classList.add('fx-webgl-on');
      } catch (e) { this.gl = null; c.classList.add('fx-webgl-off'); console.info('[RONALL FX] luz WebGL en fallback:', e.message); }
    }
    _bind() {
      addEventListener('resize', () => this._resize(), { passive: true });
      document.addEventListener('visibilitychange', () => { this.visible = !document.hidden; this.last = 0; if (this.visible) requestAnimationFrame(this._tick); });
      const stage = this.n.stage;
      if (stage && matchMedia('(hover:hover)').matches) {
        stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); this.pointerTo = [((e.clientX-r.left)/r.width-.5)*2, ((e.clientY-r.top)/r.height-.5)*2]; }, { passive: true });
        stage.addEventListener('pointerleave', () => { this.pointerTo = [0,0]; }, { passive: true });
      }
      this.n.light?.addEventListener('webglcontextlost', e => { e.preventDefault(); this.gl = null; this.n.light.classList.add('fx-webgl-off'); });
    }
    _resize() {
      const k = [.36,.28,.22,.18][this.q||0], gk = [.24,.18,.14,.1][this.q||0];
      const cw = Math.max(2, Math.round(innerWidth*k)), ch = Math.max(2, Math.round(innerHeight*k));
      const gw = Math.max(2, Math.round(innerWidth*gk)), gh = Math.max(2, Math.round(innerHeight*gk));
      const cam = this.n.camera, li = this.n.light;
      if (cam && (cam.width!==cw || cam.height!==ch)) { cam.width=cw; cam.height=ch; }
      if (li && (li.width!==gw || li.height!==gh)) { li.width=gw; li.height=gh; }
      if (this.gl && this.n.light) this.gl.viewport(0,0,this.n.light.width,this.n.light.height);
    }
    setImage(img, accent) {
      if (!img) return;
      this.image = img;
      /* V12: la luz es SIEMPRE blanca. El color de la portada ya no tiñe el bloom. */
      this._bake(img);
      this.n.cover.classList.add('on');
      this.ready = true; this.flash = Math.max(this.flash,.08);
    }
    _bake(img) {
      /* UNA vez por portada y reutilizando los mismos canvas (no se acumulan en memoria). Todo en escala de grises. */
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height; if (!iw || !ih) return;
      const sc = Math.min(1, 640 / Math.max(iw, ih));
      const a = this._ba || (this._ba = document.createElement('canvas')); a.width = Math.round(iw*sc); a.height = Math.round(ih*sc);
      const x = a.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.filter = 'grayscale(1) contrast(1.08) brightness(.6)'; x.drawImage(img,0,0,a.width,a.height);
      if (!('filter' in x)) { x.globalCompositeOperation = 'saturation'; x.fillStyle = '#808080'; x.fillRect(0,0,a.width,a.height); x.globalCompositeOperation = 'source-over'; }
      const b = this._bg || (this._bg = document.createElement('canvas')); b.width = Math.max(2, Math.round(a.width/5)); b.height = Math.max(2, Math.round(a.height/5));
      const y = b.getContext('2d'); y.filter = 'grayscale(1) blur(4px) brightness(1.3) contrast(1.9)'; y.drawImage(a,0,0,b.width,b.height);
      this.base = a; this.glow = b;
    }
    pointer(x,y) { this.pointerTo = [x,y]; }
    wake() { this.reactor.wake(); }
    get state() { return this.reactor; }
    onFrame(fn) { this.callbacks = this.callbacks || new Set(); this.callbacks.add(fn); return () => this.callbacks.delete(fn); }
    _camera(st) {
      const src = this.base || this.image;
      if (!this.ctx || !src) return;
      const c=this.n.camera,ctx=this.ctx,W=c.width,H=c.height,iw=src.width,ih=src.height;
      if (!W||!H||!iw) return;
      const base=Math.max(W/iw,H/ih),zoom=1.62+Math.sin(this.time*.075)*.02+Math.sin(this.time*.027+1.2)*.01+st.bass*.03+st.hit*.02;
      const scale=base*zoom,dw=iw*scale,dh=ih*scale;
      const driftX=Math.sin(this.time*.17+.7)*W*.02+this.pointer[0]*W*.01;
      const driftY=Math.cos(this.time*.14+.2)*H*.016-this.pointer[1]*H*.008;
      const tilt=Math.sin(this.time*.13)*.12+st.hit*.03;
      ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      ctx.fillStyle='#030303';ctx.fillRect(0,0,W,H);
      ctx.translate(W/2+driftX,H/2+driftY);ctx.rotate(tilt*Math.PI/180);
      ctx.globalAlpha=.55;ctx.drawImage(src,-dw/2,-dh/2,dw,dh);
      /* bloom: bright-pass borroso sumado (postproceso real, reactivo al bajo) */
      if(this.glow){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.06+st.bass*.1+st.hit*.08;ctx.drawImage(this.glow,-dw*.52,-dh*.52,dw*1.04,dh*1.04);}
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.setTransform(1,0,0,1,0,0);
    }
    _drawLight(st, playing) {
      const g=this.gl,c=this.n.light;if(!g||!c)return;
      const u=this.uniforms;
      g.viewport(0,0,c.width,c.height);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);
      g.uniform2f(u.R,c.width,c.height);g.uniform1f(u.T,this.time);
      g.uniform1f(u.bass,st.bass);g.uniform1f(u.high,st.high);g.uniform1f(u.hit,st.hit);g.uniform1f(u.pz,this.pz);
      g.uniform3f(u.cA,.82,.82,.82);g.uniform3f(u.cB,.82,.82,.82);
      g.drawArrays(g.TRIANGLES,0,3);
    }
    _set(el, key, val, step) {
      /* escribe en el DOM solo si el valor cambió de verdad */
      if (!el) return; const o = this._o, q = Math.round(val / step) * step;
      if (o[key] !== q) { o[key] = q; el.style.opacity = q.toFixed(3); }
    }
    _govern(raw) {
      /* Gobernador: si ≥ 12% de los últimos 90 frames tardaron más de 19 ms, baja un nivel de calidad. Nunca sube (evita vaivenes). */
      this.fn++; if (raw > 19) this.slow++;
      if (this.fn >= 90) {
        if (this.slow / this.fn > .12 && this.q < 3) { this.q++; this._resize(); if (this.q >= 3 && this.gl) { this.n.light.style.display = 'none'; } }
        this.fn = 0; this.slow = 0;
      }
    }
    _tick(now) {
      if (!this.visible) return;
      requestAnimationFrame(this._tick);
      const raw = this.last ? (now - this.last) : 16.7; const dt = clamp(raw/1000,.001,.05); this.last = now;
      if (this.last0) this._govern(raw); this.last0 = 1;
      const playing = !this.audio.paused && !this.audio.ended;
      const st = this.reactor.update(dt, playing);
      this.time += dt*(playing?1:.42); this.pz = follow(this.pz, playing?0:.26, dt, .75, .95);
      const kp = 1-Math.exp(-dt/.55);
      this.pointer[0] += (this.pointerTo[0]-this.pointer[0])*kp; this.pointer[1] += (this.pointerTo[1]-this.pointer[1])*kp;
      this.flash = Math.max(0, this.flash-dt*1.65);
      if (st.hit > .12) this.flash = Math.max(this.flash, Math.min(.07, st.hit*.07));
      this._set(this.n.light, 'l', .13 + st.bass*.05 + st.hit*.04, .004);
      this._set(this.n.flash, 'f', this.flash, .004);
      /* cámara y luz en frames ALTERNOS: nunca se suman en el mismo frame → sin picos */
      this._f = (this._f||0) + 1;
      const camEvery = this.q >= 2 ? 3 : 2;
      if (this._f % camEvery === 0) { if (this.q < 3 || this._f % 12 === 0) this._camera(st); }
      else if (this.gl && this.q < 3 && this._f % camEvery === 1 && (playing || this._f % 4 === 1)) this._drawLight(st, playing);
      this.callbacks?.forEach(fn=>{try{fn(dt,st,this.time,playing)}catch(e){console.warn('[RONALL FX callback]',e)}});
    }
  }
  window.RonFX = { create:(nodes,audio)=>new PrivateBackdrop(nodes,audio), follow, clamp };
})();
