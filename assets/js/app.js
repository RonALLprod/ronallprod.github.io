
(async () => {
const R = RON, { $, $$, esc, money, S, P } = R, D = document;
const app = $('#app'), main = $('#main');
R.boot();
const fx = window.RonFX ? RonFX.create({ root: $('#fx-scene'), stage: main, cover: $('#fx-cover'), streak: $('#fx-streak'), camera: $('#fx-camera'), light: $('#gl'), flash: $('#fx-flash') }, P.audio) : null;

$('#ct-wa').href = $('#ft-wa').href = R.wa('Hola Ronall Prod 👋 Quiero más información.');
['#ct-wa', '#ft-wa'].forEach(q => $(q).addEventListener('click', () => R.track('wa')));
const isM = () => matchMedia('(max-width:899px)').matches;

const intro = $('#intro'), t0 = performance.now(), ifill = $('#in-f'), ipct = $('#in-p'), istat = $('#in-s');
$('#in-t').innerHTML = [...'ronall prod'].map((c, i) => `<span class="l" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
let prog = 0, target = .1, introDone = false; const bump = v => { target = Math.max(target, v); };
(function ip() { if (introDone) return; prog += (target - prog) * .07; if (target - prog < .002) prog = target; ifill.style.transform = `scaleX(${prog.toFixed(4)})`; ipct.textContent = Math.round(prog * 100) + '%'; istat.textContent = prog < .35 ? 'Cargando' : prog < .7 ? 'Afinando' : prog < .98 ? 'Casi listo' : 'Listo'; requestAnimationFrame(ip); })();
(D.fonts && D.fonts.ready || Promise.resolve()).then(() => bump(.4)).catch(() => {});
const hideIntro = async () => { const w = 520 - (performance.now() - t0); if (w > 0) await new Promise(r => setTimeout(r, w)); introDone = true; ifill.style.transform = 'scaleX(1)'; ipct.textContent = '100%'; istat.textContent = 'Listo'; setTimeout(() => { intro.classList.add('out'); setTimeout(() => intro.remove(), 650); }, 100); };

const imgs = new Map();
const loadImg = u => {
  if (imgs.has(u)) { const p = imgs.get(u); imgs.delete(u); imgs.set(u, p); return p; }
  const p = new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = no; i.src = u; });
  imgs.set(u, p); while (imgs.size > 3) imgs.delete(imgs.keys().next().value);   
  return p;
};

let beats = [];
bump(.58);

try {
  const r = (await window.__cat) || await fetch('data/beats.public.json', { cache: 'default' });  
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
const sub = b => [b.type, b.bpm && b.bpm + ' BPM', b.key].filter(Boolean).map(esc).concat(R.ago ? [`<span class="ag">${esc(R.ago(b))}</span>`] : []).join(' · ');

const tagsOf = () => [], heroTags = () => [];

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
  $('#ttl').textContent = b.name; $('#top-t').textContent = b.name;
  $('#meta').innerHTML = [b.genre, b.bpm && b.bpm + ' BPM', b.key, b.duration && R.fmt(b.duration), R.ago && R.ago(b)].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('');
  $('#tgs').innerHTML = heroTags(b).map(x => `<button type="button" data-t="${esc(x)}">#${esc(x)}</button>`).join('');
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

function shelf() {
  const o = beats.filter(b => sel && b.id !== sel.id).slice(0, 12), box = $('#more');
  box.hidden = !o.length; if (!o.length) return;
  $('#more-l').innerHTML = o.map(b => { const fp = R.fromPrice(b); return `<button class="card" data-id="${esc(b.id)}"><img src="${esc(b.thumb)}" alt="" loading="lazy" width="160" height="160"><b>${esc(b.name)}</b><small>${fp == null ? 'No disponible' : 'Desde ' + money(fp)}</small></button>`; }).join('');
}
$('#more-l').onclick = e => { const c = e.target.closest('.card'); if (!c) return; select(beats.find(x => x.id === c.dataset.id)); main.scrollTo({ top: 0, behavior: 'smooth' }); };

const genres = [...new Set(beats.map(b => b.genre).filter(Boolean))].sort();
$('#chips').innerHTML = ['Todos', ...genres].map((g, i) => `<button class="chip ${i ? '' : 'on'}" data-g="${i ? esc(g) : ''}">${esc(g)}</button>`).join('');

const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9# ]+/g, ' ').replace(/\s+/g, ' ').trim();
const near = (a, b) => { if (Math.abs(a.length - b.length) > 1) return false; let i = 0, j = 0, e = 0; while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++e > 1) return false; if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; } } return e + (a.length - i) + (b.length - j) <= 1; };
const idx = b => { const f = (a, w) => ({ w, t: norm(a) }); const tg = (b.tags || []).map(x => norm(x)).filter(Boolean);
  return { tg, f: [f(b.name, 4), f(b.type, 2), f(b.genre, 2), f([b.bpm && b.bpm + ' bpm', b.key].filter(Boolean).join(' '), 1)], all: '' }; };
const score = (b, qt) => { const ix = b._ix || (b._ix = idx(b)); let s = 0;
  for (const q of qt) { const raw = q.replace(/^#/, ''); if (!raw) continue; let best = 0;
    for (const f of ix.f) { const ws = f.t.split(' '); if (f.t === raw) best = Math.max(best, f.w * 3); else if (ws.some(w => w === raw)) best = Math.max(best, f.w * 2); else if (ws.some(w => w.startsWith(raw))) best = Math.max(best, f.w * 1.5); else if (raw.length > 3 && ws.some(w => near(w, raw))) best = Math.max(best, f.w * .7); }
    for (const tg of ix.tg) { if (tg === raw) best = Math.max(best, 7); else if (tg.split(' ').includes(raw)) best = Math.max(best, 5); else if (tg.startsWith(raw)) best = Math.max(best, 4.5); else if (raw.length > 3 && (tg.includes(raw) || tg.split(' ').some(w => near(w, raw)))) best = Math.max(best, 2); }
    if (!best) return 0; s += best; }
  const full = norm(qt.join(' ')); if (full && ix.tg.includes(full)) s += 4; return s; };
const view = () => { const qt = norm(st.q).split(' ').filter(Boolean), srt = { new: (a, b) => (R.at ? R.at(b) - R.at(a) : 0) || String(b.created || '').localeCompare(String(a.created || '')), pa: (a, b) => (R.fromPrice(a) ?? 1e9) - (R.fromPrice(b) ?? 1e9), pd: (a, b) => (R.fromPrice(b) ?? -1) - (R.fromPrice(a) ?? -1), bpm: (a, b) => (a.bpm || 0) - (b.bpm || 0), az: (a, b) => a.name.localeCompare(b.name) }[st.sort];
  let l = beats.filter(b => !st.g || b.genre === st.g);
  if (!qt.length) return l.sort(srt);
  l = l.map(b => [b, score(b, qt)]).filter(x => x[1] > 0);
  return l.sort((a, b) => b[1] - a[1] || srt(a[0], b[0])).map(x => x[0]); };
const draw = () => {
  cur = view(); $('#count').textContent = cur.length + ' beat' + (cur.length === 1 ? '' : 's'); P.setList(cur);
  $('#list').innerHTML = cur.length ? cur.map((b, i) => { const fp = R.fromPrice(b); return `<button class="row ${sel && sel.id === b.id ? 'on' : ''}" data-id="${esc(b.id)}" style="--i:${Math.min(i, 10)}"><span class="n"><em>${i + 1}</em><i class="eq"><b></b><b></b><b></b></i></span><img src="${esc(b.thumb)}" alt="" loading="lazy" width="44" height="44"><span class="t"><b>${esc(b.name)}</b><small>${sub(b) || 'Beat'}</small></span><span class="p">${fp == null ? '—' : money(fp)}</span></button>`; }).join('') : '<div class="none">Sin resultados. Prueba otra búsqueda.</div>';
  sync();
};
$('#list').onclick = e => { const r = e.target.closest('.row'); if (!r) return; const b = beats.find(x => x.id === r.dataset.id); if (!sel || sel.id !== b.id) select(b); P.play(b, cur); if (isM()) go('beats'); };
const setG = g => { st.g = g; $$('#chips .chip').forEach(x => x.classList.toggle('on', x.dataset.g === g)); draw(); };
const syncTags = () => $$('#chips .chip.tg').forEach(x => x.classList.toggle('on', norm(x.dataset.tg) === norm(st.q.replace(/^#/, ''))));
$('#chips').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; if (c.dataset.tg) { const on = norm(st.q.replace(/^#/, '')) === norm(c.dataset.tg); st.q = on ? '' : c.dataset.tg; $('#f-q').value = st.q; draw(); syncTags(); return; } setG(c.dataset.g); };
$('#f-q').addEventListener('input', () => setTimeout(syncTags));
$('#f-q').oninput = e => { st.q = e.target.value.trim(); draw(); };
$('#tgs').onclick = e => { const x = e.target.closest('[data-t]'); if (!x) return; const q = $('#f-q'); q.value = x.dataset.t; st.q = x.dataset.t; draw(); if (isM()) go('lib'); else q.focus(); };
$('#f-sort').onchange = e => { st.sort = e.target.value; draw(); };

addEventListener('ron:newbeats', e => { const ids = new Set(beats.map(b => b.id)), nb = (e.detail || []).filter(b => !ids.has(b.id)); if (!nb.length) return; beats.unshift(...nb); draw(); shelf(); });

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

function sync() {
  const on = P.cur && !P.audio.paused ? P.cur.id : null;
  $$('.row').forEach(r => r.classList.toggle('pl', r.dataset.id === on)); app.classList.toggle('live', !!on); document.documentElement.classList.toggle('live', !!on);
  $('#cplay').innerHTML = R.svg(sel && on === sel.id ? 'pause' : 'play', 24);
  $('#cplay').setAttribute('aria-label', sel && on === sel.id ? 'Pausar' : 'Reproducir');
}
P.ev.addEventListener('state', () => { sync(); fx && fx.state.an && fx.wake(); });
['pointerdown', 'keydown'].forEach(t => addEventListener(t, () => fx && fx.wake(), { once: true }));
P.ev.addEventListener('load', e => { const b = beats.find(x => x.id === e.detail.id); if (b && (!sel || sel.id !== b.id)) select(b); sync(); });
addEventListener('keydown', e => { if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) { if (e.key === 'Escape') e.target.blur(); return; } if (e.key === ' ') { e.preventDefault(); $('#cplay').click(); } });

let lastSc = 1;
const meters = $$('.meter i'), artw = $('#artw');
fx && fx.onFrame((dt, s) => {
  const sc = 1 + s.bass * .024 + s.hit * .012;
  if (Math.abs(sc - lastSc) > .0012) {
    lastSc = sc;
    artw.style.scale = sc.toFixed(4);
  }
  for (let i = 0; i < meters.length; i++) {
    meters[i].style.transform = `scaleY(${(.16 + .84 * s.bins[i]).toFixed(3)})`;
  }
});

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

bindMotion(D.body);
const motionObserver = new MutationObserver(records => {
  for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) bindMotion(node);
});
motionObserver.observe(D.body, { childList: true, subtree: true });
{ let lt = 0; new MutationObserver(() => { const b = $('.drawer .tr b'); if (!b || b._m) return; b._m = 1; const to = +b.textContent.replace(/\D/g, ''); M.count(b, lt, to, { dur: 900 }); lt = to; }).observe($('.drawer'), { childList: true }); }
M.reveal($('#v-cats'), '.tile');

if (!beats.length) { $('#ttl').textContent = 'Sin beats'; $('#meta').innerHTML = '<span>No se pudieron cargar los beats. Si estás en local, abre el sitio con un servidor (python3 -m http.server), no con doble clic.</span>'; draw(); await hideIntro(); return; }
const h0 = location.hash.slice(1); if (h0 === 'categorias') go('cats');
draw(); select(beats.find(b => b.slug === h0) || cur[0] || beats[0], true);

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

addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  const a = R.P.audio, k = e.key.toLowerCase();
  if ((k === 'arrowright' || k === 'arrowleft') && R.P.cur && a.duration) a.currentTime = Math.max(0, Math.min(a.duration, a.currentTime + (k === 'arrowright' ? 5 : -5)));
  else if (k === 'n') R.P.step(1);
  else if (k === 'p') R.P.step(-1);
  else if (k === 'm') a.muted = !a.muted;
  else if (k === '/') { const q = $('#f-q'); if (q) { e.preventDefault(); q.focus(); } }
});
