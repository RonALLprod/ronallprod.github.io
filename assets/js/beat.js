/* RONALL-VISUAL-2026-11-11-V12 · beat.js — página individual (HTML generado por tools/build.mjs) */
(async()=>{const R=RON,{$,money,S}=R;R.boot();
 const b=JSON.parse($('#beat-data').textContent);if((await R.sold()).includes(b.id))b.exclusiveSold=true;R.track('beat',{beat:b.id});
 const play=$('#bp-play'),sync=()=>{const on=R.P.cur&&R.P.cur.id===b.id&&!R.P.audio.paused;play.innerHTML=R.svg(on?'pause':'play',24);play.setAttribute('aria-label',on?'Pausar':'Reproducir preview')};
 play.onclick=()=>R.P.play(b,[b]);R.P.ev.addEventListener('state',sync);R.P.ev.addEventListener('load',sync);sync();
 const im=$('#cimg');
 // Autoplay: el navegador puede bloquearlo; en ese caso basta tocar play.
 R.P.preload(b).then(()=>setTimeout(()=>{if(!R.P.cur||R.P.cur.id!==b.id)R.P.play(b,[b])},220));
 let shown=0;const tot=$('#bp-tot'),cnt=to=>{const f=shown;shown=to;window.RonMotion?RonMotion.count(tot,f,to,{dur:1100}):(tot.textContent=money(to))};
 let ui=null;const add=$('#bp-add');
 const buy=$('#bp-buy');const refresh=k=>{add.disabled=!k;buy.disabled=!k;const inC=k&&R.Cart.has(b.id,k);add.innerHTML=inC?`${R.svg('check',18)}En el carrito · Ver`:`${R.svg('cart',18)}Añadir al carrito`;add.classList.toggle('in',!!inC)};
 ui=R.licUI(b,$('#lics'),k=>{if(k){cnt(R.price(b,k));const L=S.licenses[k];$('#bp-sub').innerHTML=`Licencia ${L.name} · ${L.formats.join(' + ')}${R.was(b,k)?` · <s class="wp">${R.money(R.was(b,k))}</s>`:''}`;$('#bp-det').innerHTML=R.licDetails(k)}else{tot.textContent='—';$('#bp-det').innerHTML=''}refresh(k)});
 if(b.exclusiveSold)$('#bp-sold').hidden=false;
 add.onclick=()=>{const k=ui.value;if(!k)return;R.Cart.has(b.id,k)?R.openCart():R.Cart.add(b,k,im)};
 buy.onclick=()=>{const k=ui.value;if(!k)return;if(!R.Cart.has(b.id,k))R.Cart.add(b,k,im);R.openCart('info')};
 R.Cart.ev.addEventListener('change',()=>refresh(ui.value));
 $('#bp-copy').onclick=()=>R.copy(R.beatUrl(b),'Enlace copiado');$('#bp-share').onclick=()=>R.share(b);
})();
