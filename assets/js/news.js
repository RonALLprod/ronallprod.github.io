/* news.js — edad relativa, campana de novedades y avisos de beats nuevos */
(()=>{
const R=window.RON,D=document,{$,esc}=R,LS=localStorage,J='data/beats.public.json';
const g=(k,d)=>{try{return JSON.parse(LS.getItem(k))??d}catch(e){return d}},s=(k,v)=>{try{LS.setItem(k,JSON.stringify(v))}catch(e){}};
const at=b=>{if(b.ts)return+b.ts;const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(b.created||'');return m?new Date(+m[1],m[2]-1,+m[3]).getTime():0};
R.at=at;
R.ago=b=>{const t=at(b);if(!t)return'';const m=(Date.now()-t)/6e4,d=Math.floor((new Date().setHours(0,0,0,0)-new Date(t).setHours(0,0,0,0))/864e5);
 if(b.ts&&m<60)return m<2?'ahora':`hace ${m|0} min`;if(b.ts&&m<1440)return`hace ${m/60|0} h`;
 if(d<=0)return'hoy';if(d===1)return'ayer';if(d<7)return`hace ${d} d`;if(d<30)return`hace ${d/7|0} sem`;if(d<365)return`hace ${d/30|0} mes`;return`hace ${d/365|0} a`};

let beats=[],seen=new Set(g('ron_seen',[])),known=new Set(g('ron_known',[])),on=g('ron_nf',0)&&'Notification'in window&&Notification.permission==='granted';
const bell=D.createElement('div');bell.className='nf';
bell.innerHTML='<button class="nfb ib" id="nfb" aria-label="Novedades" aria-expanded="false"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20.5a2 2 0 0 0 4 0"/></svg><i class="nfd" hidden></i></button><div class="nfp" id="nfp" hidden><div class="nfh"><b>Novedades</b><label class="nfs"><span>Avisarme</span><input type="checkbox" id="nfo"><i></i></label></div><div class="nfl" id="nfl"></div><p class="nft" id="nft"></p></div>';
const cartb=$('#cartb');cartb&&cartb.before(bell);
const btn=$('#nfb',bell),pan=$('#nfp',bell),dot=$('.nfd',bell),sw=$('#nfo',bell),note=$('#nft',bell);
sw.checked=on;
const fresh=()=>beats.filter(b=>!seen.has(b.id));
function paint(){
 const n=fresh().length;dot.hidden=!n;dot.textContent=n>9?'9+':n;btn.classList.toggle('has',!!n);
 $('#nfl',bell).innerHTML=beats.slice(0,6).map(b=>`<button class="nfr${seen.has(b.id)?'':' nw'}" data-id="${esc(b.id)}"><img src="${esc(b.thumb)}" alt="" width="38" height="38" loading="lazy"><span><b>${esc(b.name)}</b><small>${esc(R.ago(b))}${b.genre?' · '+esc(b.genre):''}</small></span></button>`).join('')||'<p class="nft">Sin beats todavía.</p>';
 note.textContent=on?'Te avisaremos cuando subamos un beat nuevo.':'Activa avisos para enterarte al instante de cada beat.';
}
const mark=()=>{beats.forEach(b=>seen.add(b.id));s('ron_seen',[...seen]);paint()};
const open=v=>{pan.hidden=!v;btn.setAttribute('aria-expanded',v);bell.classList.toggle('open',v);if(v){paint();setTimeout(mark,1200)}};
btn.onclick=e=>{e.stopPropagation();open(pan.hidden)};
D.addEventListener('click',e=>{if(!pan.hidden&&!bell.contains(e.target))open(false)});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!pan.hidden)open(false)});
pan.addEventListener('click',e=>{const r=e.target.closest('.nfr');if(!r)return;open(false);const l=$('.row[data-id="'+CSS.escape(r.dataset.id)+'"]');l?l.click():location.hash=r.dataset.id;});

const ping=async(b)=>{
 const o={body:`${b.name}${b.type?' · '+b.type:''} — ya disponible`,icon:b.thumb,badge:'favicon.png',tag:'ron-'+b.id,data:{url:R.S.url+'/#'+b.slug}};
 try{const reg=await navigator.serviceWorker?.getRegistration();if(reg)return reg.showNotification('Nuevo beat · '+R.S.brand.name,o);new Notification('Nuevo beat · '+R.S.brand.name,o)}catch(e){}};
const sync=()=>navigator.serviceWorker?.controller?.postMessage({t:'known',ids:[...known]});
sw.onchange=async()=>{
 if(!sw.checked){on=false;s('ron_nf',0);navigator.serviceWorker?.getRegistration().then(r=>r?.periodicSync?.unregister('ron-new').catch(()=>{}));return paint()}
 if(!('Notification'in window)){sw.checked=false;note.textContent='Este navegador no admite avisos.';return}
 const p=Notification.permission==='granted'?'granted':await Notification.requestPermission();
 if(p!=='granted'){sw.checked=false;note.textContent='Permiso denegado. Actívalo en los ajustes del navegador.';return}
 on=true;s('ron_nf',1);
 try{const reg=await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;sync();
  reg.periodicSync&&await reg.periodicSync.register('ron-new',{minInterval:6*36e5}).catch(()=>{})}catch(e){}
 paint();R.toast('Avisos activados')};

async function poll(first){
 try{const r=await fetch(J+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;
  const all=((await r.json()).beats||[]).filter(b=>b.active!==false).sort((a,b)=>at(b)-at(a));
  if(first){beats=all;if(!seen.size&&!known.size)all.forEach(b=>seen.add(b.id));s('ron_seen',[...seen])}
  const nb=all.filter(b=>!known.has(b.id));
  if(!first&&nb.length){beats=all;dispatchEvent(new CustomEvent('ron:newbeats',{detail:nb}));if(on)nb.forEach(ping);R.toast(nb.length>1?nb.length+' beats nuevos':'Nuevo beat: '+nb[0].name)}
  all.forEach(b=>known.add(b.id));s('ron_known',[...known]);sync();paint()}catch(e){}}
poll(true);
setInterval(()=>document.visibilityState==='visible'&&poll(),12e4);
D.addEventListener('visibilitychange',()=>D.visibilityState==='visible'&&poll());
if(on&&navigator.serviceWorker)navigator.serviceWorker.register('sw.js').then(()=>sync()).catch(()=>{});
})();
