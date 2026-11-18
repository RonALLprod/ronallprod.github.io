/* RONALL PROD · store.js (V50) — tienda pública.
   Reutiliza core.js (carrito, checkout, audio cifrado, analítica), lic.js (licencias), news.js (campana + avisos) y ui.js (efectos). */
(async () => {
'use strict';
const R = RON, U = RonUI, { $, $$, esc, money, S, P } = R, D = document, root = D.documentElement;
const SHOW_TAGS = true;   /* false = oculta los #tags en pantalla (el buscador sigue usándolos) */
R.boot();
const LS = { get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

/* ───────── Intro corto ───────── */
const intro = $('#intro'), t0 = performance.now(), ifill = $('#in-f');
$('#in-t').innerHTML = [...'RONALL PROD'].map((c, i) => `<span class="l" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
let prog = 0, target = .15, introDone = false, hid = false;
const bump = v => { target = Math.max(target, v); };
(function ip() { if (introDone) return; prog += (target - prog) * .09; ifill.style.transform = `scaleX(${prog.toFixed(3)})`; requestAnimationFrame(ip); })();
const hideIntro = async () => {
  if (hid) return; hid = true;
  const w = 800 - (performance.now() - t0); if (w > 0) await new Promise(r => setTimeout(r, w));
  introDone = true; ifill.style.transform = 'scaleX(1)';
  setTimeout(() => { intro.classList.add('out'); setTimeout(() => intro.remove(), 1000); U.adaptive(); }, 140);
};
setTimeout(hideIntro, 4500);   /* red de seguridad: nunca se queda cargando */
(D.fonts && D.fonts.ready || Promise.resolve()).then(() => bump(.45)).catch(() => {});

/* ───────── Datos ───────── */
let beats = [];
bump(.55);
try {
  const r = (await window.__cat) || await fetch('data/beats.public.json', { cache: 'default' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  beats = ((await r.json()).beats || []).filter(b => b.active !== false);
} catch (e) {
  console.warn('[RONALL] No se pudo cargar el catálogo público:', e);
  const off = D.createElement('div'); off.className = 'offline'; off.setAttribute('role', 'alert');
  off.innerHTML = '<span>No se pudo cargar el catálogo.</span><button class="btn" type="button">Reintentar</button>';
  off.querySelector('button').onclick = () => location.reload(); D.body.appendChild(off);
}
const at = b => (R.at ? R.at(b) : 0);
beats.sort((a, b) => at(b) - at(a));
bump(.8);
const soldPromise = Promise.resolve().then(() => R.sold()).then(x => Array.isArray(x) ? x : []).catch(() => []);

/* ───────── Texto / tags ───────── */
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9# ]+/g, ' ').replace(/\s+/g, ' ').trim();
const tc = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
/* Tags visibles: sin alias duplicados ("ynjay" si ya existe "yn jay") ni los que repiten nombre, tipo o género */
const tagsOf = b => {
  const seen = new Set([tc(b.name), tc(b.type), tc(b.genre)]), out = [];
  for (const t of (b.tags || [])) { const s = String(t).trim().replace(/^#/, ''), k = tc(s); if (!k || seen.has(k)) continue; seen.add(k); out.push(s); }
  return out;
};
const ago = b => (R.ago ? R.ago(b) : '');
const sub = b => [b.type, b.bpm && b.bpm + ' BPM', b.key].filter(Boolean).map(esc).concat(ago(b) ? [`<span class="ag">${esc(ago(b))}</span>`] : []).join(' · ');

/* ───────── Buscador: sin tildes, palabras sueltas, prefijos, tags, 1 error de tecleo, #tag y bpm:130-150 ───────── */
const near = (a, b) => {
  if (Math.abs(a.length - b.length) > 1) return false; let i = 0, j = 0, e = 0;
  while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++e > 1) return false; if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; } }
  return e + (a.length - i) + (b.length - j) <= 1;
};
const idx = new Map();
const index = b => { let x = idx.get(b.id); if (x) return x; const text = norm([b.name, b.type, b.genre, b.key, b.bpm && b.bpm + 'bpm', ...(b.tags || [])].filter(Boolean).join(' ')); x = { text, words: [...new Set(text.split(' ').filter(Boolean))] }; idx.set(b.id, x); return x; };
const parseQ = q => {
  let bpm = null; const rest = norm(q).replace(/bpm ?: ?(\d{2,3})(?: ?[- ] ?(\d{2,3}))?/, (m, a, c) => { bpm = [+a, +(c || a)].sort((x, y) => x - y); return ' '; });
  return { bpm, words: rest.replace(/#/g, ' ').split(' ').filter(Boolean) };
};
const matches = (b, p) => {
  if (p.bpm && !(b.bpm && b.bpm >= p.bpm[0] && b.bpm <= p.bpm[1])) return false;
  const x = index(b);
  return p.words.every(w => x.text.includes(w) || (w.length >= 4 && x.words.some(v => near(w, v))));
};

/* ───────── Estado ───────── */
const st = { q: '', g: '', sort: 'new', view: LS.get('ron_view', 'grid') === 'list' ? 'list' : 'grid' };
let cur = null, view = beats.slice(), lui = null, firstDraw = true;
const sortFns = {
  new: (a, b) => at(b) - at(a),
  pa: (a, b) => (R.fromPrice(a) ?? 1e9) - (R.fromPrice(b) ?? 1e9),
  pd: (a, b) => (R.fromPrice(b) ?? -1) - (R.fromPrice(a) ?? -1),
  bpm: (a, b) => (a.bpm ?? 1e9) - (b.bpm ?? 1e9),
  az: (a, b) => a.name.localeCompare(b.name, 'es')
};
const compute = () => {
  const p = parseQ(st.q);
  view = beats.filter(b => (!st.g || b.genre === st.g) && matches(b, p)).sort(sortFns[st.sort] || sortFns.new);
  return view;
};

/* ───────── Catálogo ───────── */
const grid = $('#grid'), playIc = R.svg('play', 22), pauseIc = R.svg('pause', 22);
const isPlaying = b => !!(P.cur && P.cur.id === b.id && !P.audio.paused);
const card = (b, i) => {
  const from = R.fromPrice(b), pl = isPlaying(b);
  return `<article class="bc${cur && cur.id === b.id ? ' sel' : ''}${pl ? ' playing' : ''}" data-id="${esc(b.id)}" tabindex="0" style="--i:${Math.min(i, 9)}" aria-label="${esc(b.name)}">
<div class="bc-i"><img src="${esc(b.thumb || b.cover)}" alt="" width="640" height="640" loading="lazy" decoding="async"><span class="bc-ty">${esc(b.genre || b.type || 'Beat')}</span><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><button class="bc-pl" type="button" data-pl aria-label="${pl ? 'Pausar' : 'Reproducir'} ${esc(b.name)}">${pl ? pauseIc : playIc}</button></div>
<div class="bc-b"><h3>${esc(b.name)}</h3><p>${sub(b)}</p><div class="bc-f"><span class="bc-pr">${from != null ? `<small>Desde</small>${money(from)}` : '<small>Vendido</small>'}</span><span class="bc-go">Ver beat →</span></div></div></article>`;
};
function draw() {
  compute();
  grid.classList.toggle('list', st.view === 'list'); grid.classList.toggle('again', !firstDraw); firstDraw = false;
  grid.innerHTML = view.length ? view.map(card).join('') : `<div class="empty-s"><b>Sin resultados</b><span>Prueba con otra palabra, un género o un rango como bpm:130-150.</span><button class="btn" type="button" data-reset>Ver todo el catálogo</button></div>`;
  $('#count').textContent = (st.q || st.g) ? `${view.length} de ${beats.length}` : `${beats.length} ${beats.length === 1 ? 'beat' : 'beats'}`;
  $('#f-clr').hidden = !st.q; P.setList(view.length ? view : beats);
  $$('#seg button').forEach(x => x.classList.toggle('on', x.dataset.view === st.view));
  syncChips();
}
function chipsBuild() {
  const genres = [...new Set(beats.map(b => b.genre).filter(Boolean))];
  const freq = new Map(); const skip = new Set(genres.map(tc));
  beats.forEach(b => tagsOf(b).forEach(t => { const k = tc(t); if (skip.has(k)) return; const o = freq.get(k) || { t, n: 0 }; o.n++; freq.set(k, o); }));
  const tags = SHOW_TAGS ? [...freq.values()].sort((a, b) => b.n - a.n).slice(0, 8) : [];
  $('#chips').innerHTML = `<button class="chip" type="button" data-g="">Todos</button>` +
    genres.map(g => `<button class="chip" type="button" data-g="${esc(g)}">${esc(g)}</button>`).join('') +
    tags.map(o => `<button class="chip tg" type="button" data-tg="${esc(o.t)}">#${esc(o.t)}</button>`).join('');
}
function syncChips() {
  const q = norm(st.q.replace(/^#/, ''));
  $$('#chips .chip').forEach(c => c.classList.toggle('on', c.dataset.tg != null ? (!!q && norm(c.dataset.tg) === q) : (c.dataset.g || '') === st.g));
}
const setQ = (v, focus) => { st.q = v; $('#f-q').value = v; draw(); if (focus) $('#f-q').focus(); };
$('#chips').onclick = e => {
  const c = e.target.closest('.chip'); if (!c) return;
  if (c.dataset.tg != null) { setQ(norm(st.q.replace(/^#/, '')) === norm(c.dataset.tg) ? '' : c.dataset.tg); return; }
  st.g = c.dataset.g || ''; draw();
};
let qt = 0;
$('#f-q').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { st.q = e.target.value; draw(); }, 90); });
$('#f-clr').onclick = () => setQ('', true);
$('#f-sort').onchange = e => { st.sort = e.target.value; draw(); };
$('#seg').onclick = e => { const b = e.target.closest('[data-view]'); if (!b) return; st.view = b.dataset.view; LS.set('ron_view', st.view); draw(); };
grid.onclick = e => {
  if (e.target.closest('[data-reset]')) { st.g = ''; setQ(''); return; }
  const c = e.target.closest('.bc'); if (!c) return; const b = beats.find(x => x.id === c.dataset.id); if (!b) return;
  if (e.target.closest('[data-pl]')) { select(b, { keepScroll: true }); P.play(b, view); }
  else { select(b); P.play(b, view); }
};
grid.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('bc')) { e.preventDefault(); e.target.click(); } });

/* ───────── Beat seleccionado (hero + compra) ───────── */
const art = $('#art'), im = $('#cimg'), tot = $('#tot'), add = $('#b-add'), buy = $('#b-buy'), cplay = $('#cplay');
const refresh = k => {
  add.disabled = !k || !cur; buy.disabled = !k || !cur;
  const inC = !!(k && cur && R.Cart.has(cur.id, k));
  add.innerHTML = inC ? `${R.svg('check', 18)}En el carrito · Ver` : `${R.svg('cart', 18)}Añadir al carrito`; add.classList.toggle('in', inC);
};
const paintBuy = k => {
  if (k) {
    U.count(tot, R.price(cur, k)); const L = S.licenses[k];
    $('#b-lic').innerHTML = `Licencia ${esc(L.name)} · ${L.formats.map(esc).join(' + ')}${R.was(cur, k) ? ` · <s class="wp">${money(R.was(cur, k))}</s>` : ''}`;
    $('#ldet').innerHTML = R.licDetails(k);
  } else { tot._v = 0; tot.textContent = '—'; $('#b-lic').textContent = ''; $('#ldet').innerHTML = ''; }
  refresh(k);
};
const renderLics = () => { lui = R.licUI(cur, $('#lics'), paintBuy); };
function select(b, o = {}) {
  if (!b) return; cur = b;
  U.letters($('#ttl'), b.name); $('#ty').textContent = b.type || 'Beat';
  $('#meta').innerHTML = [b.genre, b.bpm && b.bpm + ' BPM', b.key, b.duration && R.fmt(b.duration)].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('');
  $('#tgs').innerHTML = SHOW_TAGS ? tagsOf(b).slice(0, 6).map(x => `<button type="button" data-t="${esc(x)}">#${esc(x)}</button>`).join('') : '';
  im.classList.remove('swap'); void im.offsetWidth; im.classList.add('swap'); im.alt = 'Portada de ' + b.name; im.src = b.cover || b.thumb;
  U.scene(b.thumb || b.cover);
  $('#b-pg').href = `beats/${b.slug}/`; $('#sold').hidden = !b.exclusiveSold;
  renderLics(); sync();
  $$('#grid .bc').forEach(c => c.classList.toggle('sel', c.dataset.id === b.id));
  try { history.replaceState(null, '', '#' + b.slug); } catch (e) {}
  P.preload(b);
  if (o.scroll) scrollTo({ top: 0, behavior: 'smooth' });
}
$('#tgs').onclick = e => { const x = e.target.closest('[data-t]'); if (!x) return; setQ(x.dataset.t); go('catalogo'); };
cplay.onclick = () => { if (cur) P.play(cur, view.length ? view : beats); };
add.onclick = () => { const k = lui && lui.value; if (!k || !cur) return; R.Cart.has(cur.id, k) ? R.openCart() : R.Cart.add(cur, k, im); };
buy.onclick = () => { const k = lui && lui.value; if (!k || !cur) return; R.track('wa', { beat: cur.id, lic: k }); window.open(R.waRequest(cur, k), '_blank', 'noopener'); };
R.Cart.ev.addEventListener('change', () => refresh(lui && lui.value));
$('#b-cp').onclick = () => cur && R.copy(R.beatUrl(cur), 'Enlace copiado');
$('#b-sh').onclick = () => cur && R.share(cur);

/* Estado de reproducción → iconos del hero y de las tarjetas */
function sync() {
  const on = !!(cur && isPlaying(cur));
  cplay.innerHTML = R.svg(on ? 'pause' : 'play', 32); cplay.setAttribute('aria-label', on ? 'Pausar' : 'Reproducir');
  $$('#grid .bc').forEach(c => {
    const pl = !!(P.cur && P.cur.id === c.dataset.id && !P.audio.paused); c.classList.toggle('playing', pl);
    const b = c.querySelector('.bc-pl'); if (b) b.innerHTML = pl ? pauseIc : playIc;
  });
}
P.ev.addEventListener('state', sync); P.ev.addEventListener('load', sync);

/* Licencia EXCLUSIVE vendida (remoto, sin bloquear) */
soldPromise.then(sold => {
  let ch = false; beats.forEach(b => { if (sold.includes(b.id) && !b.exclusiveSold) { b.exclusiveSold = true; ch = true; } });
  if (ch) { if (cur) { $('#sold').hidden = !cur.exclusiveSold; renderLics(); } draw(); }
}).catch(() => {});

/* Beats nuevos detectados por news.js */
addEventListener('ron:newbeats', e => { (e.detail || []).forEach(n => { if (!beats.some(b => b.id === n.id)) beats.push(n); }); beats.sort(sortFns.new); idx.clear(); chipsBuild(); draw(); });

/* ───────── Marquee ───────── */
(function marquee() {
  const words = [...beats.map(b => b.name), 'Beats', 'Instrumentales', 'RONALL PROD'].filter(Boolean);
  const half = words.map(w => `<span>${esc(w)}</span>`).join(''); $('#mq').innerHTML = half + half;
  /* si el ancho de una mitad es corto, repite para cubrir pantallas anchas sin hueco */
  requestAnimationFrame(() => { const m = $('#mq'); let n = 0; while (m.scrollWidth < innerWidth * 2.2 && n++ < 6) m.innerHTML += half + half; });
})();

/* ───────── Navegación ───────── */
const SECS = ['hero', 'catalogo', 'privado', 'contacto'];
function go(id) {
  const el = id === 'hero' ? null : D.getElementById(id);
  if (!el) scrollTo({ top: 0, behavior: 'smooth' }); else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$$('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
let navRaf = 0;
const navSync = () => {
  navRaf = 0; let on = 'hero'; const y = innerHeight * .42;
  for (const id of SECS) { const el = D.getElementById(id); if (el && el.getBoundingClientRect().top <= y) on = id; }
  if (scrollY + innerHeight >= D.documentElement.scrollHeight - 4) on = 'contacto';
  $$('[data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === on));
};
addEventListener('scroll', () => { if (!navRaf) navRaf = requestAnimationFrame(navSync); }, { passive: true });
$('#tsearch').onclick = () => { go('catalogo'); setTimeout(() => $('#f-q').focus({ preventScroll: true }), 450); };
$('#ct-wa').href = $('#ft-wa').href = R.wa('Hola Ronall Prod 👋 Quiero más información.');
['#ct-wa', '#ft-wa'].forEach(q => $(q).addEventListener('click', () => R.track('wa')));
addEventListener('keydown', e => {
  const t = e.target, typing = /INPUT|SELECT|TEXTAREA/.test(t.tagName);
  if (typing) { if (e.key === 'Escape') t.blur(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); $('#tsearch').click(); }
  else if (e.key === ' ' && (t === D.body || t === D.documentElement)) { e.preventDefault(); cplay.click(); }
});
const fromHash = () => {
  const h = decodeURIComponent(location.hash.slice(1)); if (!h) return false;
  const b = beats.find(x => x.slug === h || x.id === h);
  if (b) { if (!cur || cur.id !== b.id) select(b, { scroll: true }); return true; }
  if (SECS.includes(h)) { setTimeout(() => go(h), 80); return true; }
  if (h === 'beats') { setTimeout(() => go('catalogo'), 80); return true; }
  return false;
};
addEventListener('hashchange', fromHash);

/* ───────── Arranque ───────── */
chipsBuild();
$('#f-sort').value = st.sort;
const qp = new URLSearchParams(location.search);
if (qp.get('tag')) { st.q = qp.get('tag'); $('#f-q').value = st.q; } else if (qp.get('q')) { st.q = qp.get('q'); $('#f-q').value = st.q; }
draw();
U.tilt(art); U.sheen(); U.progress(); U.pulse(P.audio, { art });
if (beats.length) {
  const h0 = decodeURIComponent(location.hash.slice(1));
  select(beats.find(b => b.slug === h0 || b.id === h0) || beats[0]);
  if (st.q || ['catalogo', 'privado', 'contacto', 'beats'].includes(h0)) setTimeout(() => go(h0 && h0 !== 'beats' ? h0 : 'catalogo'), 900);
} else { U.letters($('#ttl'), 'RONALL PROD'); $('.acts').hidden = true; }
U.reveal(); navSync();
const ready = () => { bump(1); hideIntro(); };
if (im.complete && im.naturalWidth) ready(); else { im.addEventListener('load', ready, { once: true }); im.addEventListener('error', ready, { once: true }); }
})();
