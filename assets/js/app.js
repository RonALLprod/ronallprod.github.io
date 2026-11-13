/* RONALL-VISUAL-2026-11-11-V22 · app.js — catálogo rápido, datos remotos sin bloqueo */
(async () => {
const R = RON, { $, $$, esc, money, S, P } = R, D = document;
const app = $('#app'), main = $('#main');
R.boot();
const fx = window.RonFX ? RonFX.create({ root: $('#fx-scene'), stage: main, cover: $('#fx-cover'), streak: $('#fx-streak'), camera: $('#fx-camera'), light: $('#gl'), flash: $('#fx-flash') }, P.audio) : null;

/* Texto: palabras con péndulo suave + letras que entran */
const rnd = (a, b) => a + Math.random() * (b - a), TAU = Math.PI * 2;
function wrap(el, text) {
  el.innerHTML = text.split(' ').map((w, wi) => `<span class="w">${[...w].map((c, i) => `<span class="l" style="--i:${i + wi * 3}">${esc(c)}</span>`).join('')}</span>`).join(' ');
  return [...el.querySelectorAll('.w')].map(e => ({ el: e, a1: rnd(.55, 1.25) * (Math.random() < .5 ? -1 : 1), w1: TAU / rnd(8, 13), p1: rnd(0, TAU), a2: rnd(.16, .42), w2: TAU / rnd(4.2, 7.2), p2: rnd(0, TAU), ax: rnd(1.8, 5), wx: TAU / rnd(8, 15), px: rnd(0, TAU), ay: rnd(1.2, 3.8), wy: TAU / rnd(9, 16), py: rnd(0, TAU) }));
}
const sway = { hero: [], cats: [], priv: [], ct: [] }, viewKey = { beats: 'hero', cats: 'cats', priv: 'priv', ct: 'ct' };
['cats', 'priv', 'ct'].forEach(k => { const h = $('#v-' + k + ' h2'); if (h) sway[k] = wrap(h, h.textContent.trim()); });
let metaSway = [];
const seedMeta = () => { metaSway = [...$('#meta').children].map(el => ({ el, a: rnd(.12, .36) * (Math.random() < .5 ? -1 : 1), w: TAU / rnd(6.5, 12), p: rnd(0, TAU), x: rnd(.5, 1.8), wx: TAU / rnd(8, 14), px: rnd(0, TAU), y: rnd(.3, 1.1), wy: TAU / rnd(9, 15), py: rnd(0, TAU) })); };
$('#ct-wa').href = $('#ft-wa').href = R.wa('Hola Ronall Prod 👋 Quiero más información.');
['#ct-wa', '#ft-wa'].forEach(q => $(q).addEventListener('click', () => R.track('wa')));
const isM = () => matchMedia('(max-width:899px)').matches;

/* ───────── Intro corto ───────── */
const intro = $('#intro'), t0 = performance.now(), ifill = $('#in-f'), ipct = $('#in-p'), istat = $('#in-s');
$('#in-t').innerHTML = [...'ronall prod'].map((c, i) => `<span class="l" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
let prog = 0, target = .1, introDone = false; const bump = v => { target = Math.max(target, v); };
(function ip() { if (introDone) return; prog += (target - prog) * .07; if (target - prog < .002) prog = target; ifill.style.transform = `scaleX(${prog.toFixed(4)})`; ipct.textContent = Math.round(prog * 100) + '%'; istat.textContent = prog < .35 ? 'Cargando' : prog < .7 ? 'Afinando' : prog < .98 ? 'Casi listo' : 'Listo'; requestAnimationFrame(ip); })();
(D.fonts && D.fonts.ready || Promise.resolve()).then(() => bump(.4)).catch(() => {});
const hideIntro = async () => { const w = 520 - (performance.now() - t0); if (w > 0) await new Promise(r => setTimeout(r, w)); introDone = true; ifill.style.transform = 'scaleX(1)'; ipct.textContent = '100%'; istat.textContent = 'Listo'; setTimeout(() => { intro.classList.add('out'); setTimeout(() => intro.remove(), 650); }, 100); };

/* ───────── Imágenes y acento ───────── */
const imgs = new Map();
const loadImg = u => {
  if (imgs.has(u)) { const p = imgs.get(u); imgs.delete(u); imgs.set(u, p); return p; }
  const p = new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = no; i.src = u; });
  imgs.set(u, p); while (imgs.size > 3) imgs.delete(imgs.keys().next().value);   /* LRU: libera portadas viejas */
  return p;
};
const setAccent = () => {};   /* V12: el bloom es siempre blanco; no se extrae color de la portada */

/* ───────── Datos ───────── */
let beats = [];
bump(.58);
/* El JSON es estático: deja que el navegador/CDN lo almacene. La consulta de ventas jamás bloquea el catálogo. */
try {
  const r = (await window.__cat) || await fetch('data/beats.public.json?t=' + Date.now(), { cache: 'no-store' });  /* siempre el catálogo más reciente */
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const data = await r.json(); beats = (data.beats || []).filter(b => b.active !== false);
} catch (e) {
  console.warn('[RONALL] No se pudo cargar el catálogo público:', e);
  const off = document.createElement('div'); off.className = 'offline'; off.setAttribute('role', 'alert');
  off.innerHTML = '<span>No se pudo cargar el catálogo.</span><button class="btn" type="button">Reintentar</button>';
  off.querySelector('button').onclick = () => location.reload(); document.body.appendChild(off);
}
const soldPromise = Promise.resolve().then(() => R.sold()).then(x => Array.isArray(x) ? x : []).catch(() => []);
const st = { q: '', g: '', sort: 'new' };
let cur = [], sel = null, ui = null, shown = 0, coverP = Promise.resolve();
const sub = b => [b.type, b.bpm && b.bpm + ' BPM', b.key].filter(Boolean).map(esc).join(' · ');

/* ───────── Vista de beat ───────── */
const tot = $('#tot');
const count = to => { const f = shown; shown = to; RonMotion.count(tot, f, to, { dur: 1000 }); };
function refreshBuy(key) {
  const k = key !== undefined ? key : ui && ui.value, btn = $('#b-add'); if (!btn) return;
  btn.disabled = !k; const bb = $('#b-buy'); if (bb) bb.disabled = !k;
  const inCart = k && sel && R.Cart.has(sel.id, k);
  btn.innerHTML = inCart ? `${R.svg('check', 18)}En el carrito · Ver` : `${R.svg('cart', 18)}Añadir al carrito`;
  btn.classList.toggle('in', !!inCart);
}
function select(b, first, track = true) {
  sel = b; if (track) R.track('beat', { beat: b.id });
  $('#ty').textContent = b.type || 'Beat';
  sway.hero = wrap($('#ttl'), b.name); $('#top-t').textContent = b.name;
  $('#meta').innerHTML = [b.genre, b.bpm && b.bpm + ' BPM', b.key, b.duration && R.fmt(b.duration)].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('');
  seedMeta();
  const im = $('#cimg'); $('#aglow').style.backgroundImage = `url("${b.thumb || b.cover}")`; im.src = b.cover || b.thumb; im.alt = 'Portada de ' + b.name;
  const h = $('.hero'); h.classList.remove('swap'); void h.offsetWidth; h.classList.add('swap');
  $('#sold').hidden = !b.exclusiveSold; $('#b-pg').href = 'beats/' + b.slug + '/';
  if (first) coverP = loadImg(b.cover).catch(() => {});
  loadImg(b.cover).then(img => { if (sel === b) { bump(.95); fx && fx.setImage(img); } }).catch(() => {});
  ui = R.licUI(b, $('#lics'), k => {
    k ? count(R.price(b, k)) : (tot.textContent = '—');
    const L = k && S.licenses[k];
    $('#b-lic').innerHTML = L ? `Licencia ${L.name} · ${L.formats.join(' + ')}${R.was(sel, k) ? ` · <s class="wp">${R.money(R.was(sel, k))}</s>` : ''}` : 'No disponible';
    $('#ldet').innerHTML = k ? R.licDetails(k) : '';
    refreshBuy(k);
  });
  $$('#lics .lp').forEach(el => { const n = +el.textContent.replace(/\D/g, ''); n && RonMotion.count(el, 0, n, { dur: 900 }); });
  RonMotion.reveal($('#v-beats'), '.sec-h,.lic,.ldet>div,.sold');

  $$('.row').forEach(r => { const on = r.dataset.id === b.id; r.classList.toggle('on', on); on && r.scrollIntoView({ block: 'nearest' }); });
  shelf(); RonMotion.reveal($('#more'), '.sec-h,.card');
  try { history.replaceState(null, '', '#' + b.slug); } catch (e) {}
  R.P.preload(b); sync();
}
$('#cplay').onclick = () => sel && P.play(sel, cur.length ? cur : beats);
$('#b-add').onclick = () => { if (!ui || !ui.value) return; if (R.Cart.has(sel.id, ui.value)) R.openCart(); else R.Cart.add(sel, ui.value, $('#cimg')); };
$('#b-buy').onclick = () => { if (!sel || !ui || !ui.value) return; R.track('wa',{beat:sel.id,lic:ui.value}); window.open(R.waRequest(sel,ui.value),'_blank','noopener'); };
$('#b-sh').onclick = () => sel && R.share(sel);
R.Cart.ev.addEventListener('change', () => refreshBuy());

/* ───────── Más beats (estantería) ───────── */
function shelf() {
  const o = beats.filter(b => sel && b.id !== sel.id).slice(0, 12), box = $('#more');
  box.hidden = !o.length; if (!o.length) return;
  $('#more-l').innerHTML = o.map(b => { const fp = R.fromPrice(b); return `<button class="card" data-id="${esc(b.id)}"><img src="${esc(b.thumb)}" alt="" loading="lazy" width="160" height="160"><b>${esc(b.name)}</b><small>${fp == null ? 'No disponible' : 'Desde ' + money(fp)}</small></button>`; }).join('');
}
$('#more-l').onclick = e => { const c = e.target.closest('.card'); if (!c) return; select(beats.find(x => x.id === c.dataset.id)); main.scrollTo({ top: 0, behavior: 'smooth' }); };

/* ───────── Catálogo (lista lateral) ───────── */
const genres = [...new Set(beats.map(b => b.genre).filter(Boolean))].sort();
$('#chips').innerHTML = ['Todos', ...genres].map((g, i) => `<button class="chip ${i ? '' : 'on'}" data-g="${i ? esc(g) : ''}">${esc(g)}</button>`).join('');
const view = () => beats.filter(b => (!st.g || b.genre === st.g) && (!st.q || (b.name + ' ' + b.type + ' ' + b.genre + ' ' + (b.tags || []).join(' ')).toLowerCase().includes(st.q)))
  .sort({ new: (a, b) => b.created.localeCompare(a.created), pa: (a, b) => (R.fromPrice(a) ?? 1e9) - (R.fromPrice(b) ?? 1e9), pd: (a, b) => (R.fromPrice(b) ?? -1) - (R.fromPrice(a) ?? -1), bpm: (a, b) => (a.bpm || 0) - (b.bpm || 0), az: (a, b) => a.name.localeCompare(b.name) }[st.sort]);
const draw = () => {
  cur = view(); $('#count').textContent = cur.length + ' beat' + (cur.length === 1 ? '' : 's'); P.setList(cur);
  $('#list').innerHTML = cur.length ? cur.map((b, i) => { const fp = R.fromPrice(b); return `<button class="row ${sel && sel.id === b.id ? 'on' : ''}" data-id="${esc(b.id)}" style="--i:${Math.min(i, 10)}"><span class="n"><em>${i + 1}</em><i class="eq"><b></b><b></b><b></b></i></span><img src="${esc(b.thumb)}" alt="" loading="lazy" width="44" height="44"><span class="t"><b>${esc(b.name)}</b><small>${sub(b) || 'Beat'}</small></span><span class="p">${fp == null ? '—' : money(fp)}</span></button>`; }).join('') : '<div class="none">Sin resultados. Prueba otra búsqueda.</div>';
  sync();
};
$('#list').onclick = e => { const r = e.target.closest('.row'); if (!r) return; const b = beats.find(x => x.id === r.dataset.id); if (!sel || sel.id !== b.id) select(b); P.play(b, cur); if (isM()) go('beats'); };
const setG = g => { st.g = g; $$('#chips .chip').forEach(x => x.classList.toggle('on', x.dataset.g === g)); draw(); };
$('#chips').onclick = e => { const c = e.target.closest('.chip'); c && setG(c.dataset.g); };
$('#f-q').oninput = e => { st.q = e.target.value.trim().toLowerCase(); draw(); };
$('#f-sort').onchange = e => { st.sort = e.target.value; draw(); };

/* ───────── Navegación ───────── */
let curView = 'beats';
const go = v => {
  if (v === 'lib' && !isM()) { v = 'beats'; setTimeout(() => $('#f-q').focus(), 0); }
  curView = v; app.dataset.v = v;
  $$('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + v));
  $$('[data-v]').forEach(x => x.classList.toggle('on', x.dataset.v === v));
  main.scrollTo({ top: 0 });
};
$$('[data-v]').forEach(x => x.onclick = () => go(x.dataset.v));
addEventListener('resize', () => { if (!isM() && curView === 'lib') go('beats'); });
main.addEventListener('scroll', () => main.classList.toggle('sc', main.scrollTop > 200), { passive: true });
$('#cats').innerHTML = genres.map((g, i) => `<button class="tile" style="--h:${(i * 53 + 210) % 360}" data-g="${esc(g)}"><b>${esc(g)}</b><small>${beats.filter(b => b.genre === g).length} beat(s)</small></button>`).join('') || '<p class="mute">Los géneros aparecerán con los primeros beats.</p>';
$('#cats').onclick = e => { const t = e.target.closest('.tile'); if (t) { setG(t.dataset.g); go(isM() ? 'lib' : 'beats'); } };

/* ───────── Sincronía con el reproductor ───────── */
function sync() {
  const on = P.cur && !P.audio.paused ? P.cur.id : null;
  $$('.row').forEach(r => r.classList.toggle('pl', r.dataset.id === on)); app.classList.toggle('live', !!on);
  $('#cplay').innerHTML = R.svg(sel && on === sel.id ? 'pause' : 'play', 24);
  $('#cplay').setAttribute('aria-label', sel && on === sel.id ? 'Pausar' : 'Reproducir');
}
P.ev.addEventListener('state', () => { sync(); fx && fx.state.an && fx.wake(); });
['pointerdown', 'keydown'].forEach(t => addEventListener(t, () => fx && fx.wake(), { once: true }));
P.ev.addEventListener('load', e => { const b = beats.find(x => x.id === e.detail.id); if (b && (!sel || sel.id !== b.id)) select(b); sync(); });
addEventListener('keydown', e => { if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) { if (e.key === 'Escape') e.target.blur(); return; } if (e.key === ' ') { e.preventDefault(); $('#cplay').click(); } });

/* ───────── Bucle único: todo lo reactivo lee valores ya suavizados del motor ───────── */
let lastSc = 1, fr = 0, hx = 0, hy = 0, tx = 0, ty = 0, ox = 0, oy = 0; const meters = $$('.meter i'), heroEl = $('.hero'), artw = $('#artw'), aglow = $('#aglow'), hglow = $('#hglow'), swing = RonMotion.idleSwing(artw, { a: 1.1, y: 4, t: 11 });
fx && fx.onFrame((dt, s, time) => {
  const now = performance.now() / 1000, k = 1 + s.bass * .5 + s.hit * .3;
  hx += (tx - hx) * (1 - Math.exp(-dt / .5)); hy += (ty - hy) * (1 - Math.exp(-dt / .5));
  if (Math.abs(hx - ox) + Math.abs(hy - oy) > .002) { ox = hx; oy = hy; heroEl.style.transform = `translate3d(${(hx * -9).toFixed(2)}px,${(hy * -6).toFixed(2)}px,0)`; }
  { const sc = 1 + s.bass * .035 + s.hit * .02; if (Math.abs(sc - lastSc) > .0007) { lastSc = sc; artw.style.scale = sc.toFixed(4); } }
    if ((fr++ & 1) === 0) for (let i = 0; i < 5; i++) meters[i].style.transform = `scaleY(${(.16 + .84 * s.bins[i]).toFixed(3)})`;
});
main.addEventListener('pointerleave', () => { tx = ty = 0; });
main.addEventListener('pointermove', e => { const r = main.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width) * 2 - 1; ty = ((e.clientY - r.top) / r.height) * 2 - 1; if (!fx) return; fx.pointerTo = [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)]; }, { passive: true });

/* ───────── Motion graphics: resortes, magnetismo y tilt 3D ───────── */
const M = RonMotion;
const MAG = '.btn,.play,.ctl button,.cartb,.ib,.chip,.snav button,.tabs button,.lnk,.lic-info summary';
const TILT = '.card,.tile,.lic';
function bindMotion(root) {
  if (!root || root.nodeType !== 1) return;
  const bind = el => {
    if (el.matches(MAG)) M.magnetic(el, { mag: .16, rot: 4.5, scale: 1.035, press: true });
    if (el.matches(TILT)) M.tilt(el, { max: el.matches('.row') ? 3.5 : 7, lift: el.matches('.row') ? 1.012 : 1.035 });
  };
  bind(root);
  root.querySelectorAll(`${MAG},${TILT}`).forEach(bind);
}
/* El observador cubre filas, licencias, tarjetas y drawer que se crean después del load. */
bindMotion(D.body);
const motionObserver = new MutationObserver(records => {
  for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) bindMotion(node);
});
motionObserver.observe(D.body, { childList: true, subtree: true });
M.scrollSkew(main, $('.marq'));
{ let lt = 0; new MutationObserver(() => { const b = $('.drawer .tr b'); if (!b || b._m) return; b._m = 1; const to = +b.textContent.replace(/\D/g, ''); M.count(b, lt, to, { dur: 900 }); lt = to; }).observe($('.drawer'), { childList: true }); }
M.reveal($('#v-cats'), '.tile');

/* ───────── Arranque ───────── */
if (!beats.length) { $('#ttl').textContent = 'Sin beats'; $('#meta').innerHTML = '<span>No se pudieron cargar los beats. Si estás en local, abre el sitio con un servidor (python3 -m http.server), no con doble clic.</span>'; draw(); await hideIntro(); return; }
const h0 = location.hash.slice(1); if (h0 === 'categorias') go('cats');
draw(); select(beats.find(b => b.slug === h0) || cur[0] || beats[0], true);
/* Las exclusividades se aplican cuando responda Supabase; el primer render nunca espera esta consulta. */
soldPromise.then(sold => {
  if (!sold.length) return;
  let changed = false;
  const ids = new Set(sold);
  for (const b of beats) if (ids.has(b.id) && !b.exclusiveSold) { b.exclusiveSold = true; changed = true; }
  if (changed) { if (sel && ids.has(sel.id)) select(sel, false, false); shelf(); }
}).catch(() => {});
await Promise.race([coverP, new Promise(r => setTimeout(r, 800))]);
hideIntro();
})();

/* ───────── Atajos de teclado: ←/→ ±5 s · N/P siguiente/anterior · M silencio · / buscar ───────── */
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  const a = R.P.audio, k = e.key.toLowerCase();
  if ((k === 'arrowright' || k === 'arrowleft') && R.P.cur && a.duration) a.currentTime = Math.max(0, Math.min(a.duration, a.currentTime + (k === 'arrowright' ? 5 : -5)));
  else if (k === 'n') R.P.step(1);
  else if (k === 'p') R.P.step(-1);
  else if (k === 'm') a.muted = !a.muted;
  else if (k === '/') { const q = $('#f-q'); if (q) { e.preventDefault(); q.focus(); } }
});
