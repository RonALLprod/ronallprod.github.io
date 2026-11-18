/* RONALL PROD · beat.js (V50) — página individual de beat. Misma lógica de compra que la tienda. */
(async () => {
'use strict';
const R = RON, U = RonUI, { $, $$, money, S } = R, D = document, root = D.documentElement, ROOT = root.dataset.root || '';
R.boot();
const b = JSON.parse($('#beat-data').textContent);
const soldPromise = Promise.resolve().then(() => R.sold()).then(x => Array.isArray(x) ? x : []).catch(() => []);
R.track('beat', { beat: b.id });

/* Efectos */
const art = $('#art');
U.letters($('#bp-ttl'), b.name);
U.scene(ROOT + (b.thumb || b.cover)); U.sheen(); U.tilt(art); U.reveal(); U.progress(); U.adaptive();
U.pulse(R.P.audio, { art });

/* Reproducción */
const play = $('#bp-play');
const sync = () => { const on = R.P.cur && R.P.cur.id === b.id && !R.P.audio.paused; play.innerHTML = R.svg(on ? 'pause' : 'play', 32); play.setAttribute('aria-label', on ? 'Pausar' : 'Reproducir preview'); };
play.onclick = () => R.P.play(b, [b]);
R.P.ev.addEventListener('state', sync); R.P.ev.addEventListener('load', sync); sync();
/* Autoplay: el navegador puede bloquearlo; en ese caso basta tocar play. */
R.P.preload(b).then(() => setTimeout(() => { if (!R.P.cur || R.P.cur.id !== b.id) R.P.play(b, [b]); }, 220));

/* Compra */
const tot = $('#bp-tot'), add = $('#bp-add'), buy = $('#bp-buy'), im = $('#cimg'); let ui = null;
const refresh = k => {
  add.disabled = !k; buy.disabled = !k;
  const inC = k && R.Cart.has(b.id, k);
  add.innerHTML = inC ? `${R.svg('check', 18)}En el carrito · Ver` : `${R.svg('cart', 18)}Añadir al carrito`;
  add.classList.toggle('in', !!inC);
};
const renderLicenses = () => {
  ui = R.licUI(b, $('#lics'), k => {
    if (k) { U.count(tot, R.price(b, k)); const L = S.licenses[k]; $('#bp-sub').innerHTML = `Licencia ${L.name} · ${L.formats.join(' + ')}${R.was(b, k) ? ` · <s class="wp">${money(R.was(b, k))}</s>` : ''}`; $('#bp-det').innerHTML = R.licDetails(k); }
    else { tot._v = 0; tot.textContent = '—'; $('#bp-det').innerHTML = ''; }
    refresh(k);
  });
};
renderLicenses();
if (b.exclusiveSold) $('#bp-sold').hidden = false;
soldPromise.then(sold => { if (sold.includes(b.id) && !b.exclusiveSold) { b.exclusiveSold = true; $('#bp-sold').hidden = false; renderLicenses(); } }).catch(() => {});
add.onclick = () => { const k = ui.value; if (!k) return; R.Cart.has(b.id, k) ? R.openCart() : R.Cart.add(b, k, im); };
buy.onclick = () => { const k = ui.value; if (!k) return; R.track('wa', { beat: b.id, lic: k }); window.open(R.waRequest(b, k), '_blank', 'noopener'); };
R.Cart.ev.addEventListener('change', () => refresh(ui.value));
$('#bp-copy').onclick = () => R.copy(R.beatUrl(b), 'Enlace copiado');
$('#bp-share').onclick = () => R.share(b);
addEventListener('keydown', e => { if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return; if (e.key === ' ' && (e.target === D.body || e.target === root)) { e.preventDefault(); play.click(); } });
})();
