/* RONALL-VISUAL-2026-11-11-V13 · core.js */
/* RONALL PROD · core — helpers, cabecera, reproductor global (AES-GCM), carrito, checkout */
(()=>{
const S=window.SITE,D=document,ROOT=D.documentElement.dataset.root||'';
const $=(s,r=D)=>r.querySelector(s),$$=(s,r=D)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const _nf=new Intl.NumberFormat('en-US',{style:'currency',currency:S.currency,maximumFractionDigits:0});
const money=n=>_nf.format(n);
const fmt=t=>{t=Math.max(0,t|0);return(t/60|0)+':'+String(t%60).padStart(2,'0')};
const beatUrl=b=>`${S.url}/beats/${b.slug}/`;
const price=(b,k)=>(b.prices&&b.prices[k]!=null?b.prices[k]:S.licenses[k].price);
const was=(b,k)=>{const L=S.licenses[k];return L&&L.was&&!(b.prices&&b.prices[k]!=null)&&L.was>price(b,k)?L.was:null};
const avail=(b,k)=>b.licenses.includes(k)&&!(S.licenses[k].exclusive&&b.exclusiveSold);
const fromPrice=b=>{const a=b.licenses.filter(k=>avail(b,k)).map(k=>price(b,k));return a.length?Math.min(...a):null};
const wa=txt=>`https://wa.me/${S.whatsapp.number}?text=${encodeURIComponent(txt)}`;
const waInfo=b=>wa(`Hola Ronall Prod. Quiero información sobre el beat ${b.name}.\n${beatUrl(b)}`);
const waRequest=(b,k)=>{const L=S.licenses[k];return wa(`Hola Ronall Prod. Quiero solicitar el beat *${b.name}* con la licencia *${L.name}* por *${money(price(b,k))} ${S.currency}*.\n\nBeat: ${beatUrl(b)}\nLicencia: ${L.name}\nFormatos: ${L.formats.join(' + ')}\n\n¿Me confirmas disponibilidad, condiciones completas y cómo realizar el pago?`)};
const waNumDisplay='+'+S.whatsapp.number;
const IC={cart:'<path class="cp" d="M2 3.5h3.1l2.2 10.6a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 1.95-1.55L20.9 7.2H5.6"/><circle class="cw" cx="9.6" cy="19.6" r="1.4"/><circle class="cw" cx="17" cy="19.6" r="1.4"/>',
wa:'<path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.5z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8c-.9-.4-1.7-1.2-2.1-2.1l.8-1-1-2z"/>',
play:'<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',pause:'<path d="M6.5 4.5h3.8v15H6.5zM13.7 4.5h3.8v15h-3.8z" fill="currentColor" stroke="none"/>',
prev:'<path d="M6 5v14M19 5.5v13L9 12z" fill="currentColor"/>',next:'<path d="M18 5v14M5 5.5v13L15 12z" fill="currentColor"/>',
vol:'<path d="M4 9.5v5h4l5 4v-13l-5 4zM16.5 8.5a5 5 0 0 1 0 7"/>',x:'<path d="M5 5l14 14M19 5L5 19"/>',lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
share:'<path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 12v7h14v-7"/>',link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>',
search:'<circle cx="10.5" cy="10.5" r="6.2"/><path d="M15.2 15.2L20.5 20.5"/>',menu:'<path d="M4 8h16M4 16h16"/>',
home:'<path d="M4 11l8-7 8 7v8.5a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
grid:'<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
lib:'<path d="M5 4v16M10 4v16M15.5 5.5l4 14.5"/>',chev:'<path d="M15 5l-7 7 7 7"/>'};
const svg=(n,w=20,x='')=>`<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${x}>${IC[n]}</svg>`;
let tt;const toast=m=>{let t=$('.toast')||D.body.appendChild(Object.assign(D.createElement('div'),{className:'toast'}));t.textContent=m;requestAnimationFrame(()=>t.classList.add('on'));clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2200)};
const copy=async(t,m='Copiado')=>{try{await navigator.clipboard.writeText(t)}catch(e){const a=D.createElement('textarea');a.value=t;D.body.appendChild(a);a.select();D.execCommand('copy');a.remove()}toast(m)};
const share=async b=>{track('share',{beat:b.id});const d={title:`${b.name} · ${S.brand.name}`,text:`${b.name} — ${b.type||'beat'}`,url:beatUrl(b)};if(navigator.share){try{await navigator.share(d);return}catch(e){if(e.name==='AbortError')return}}copy(d.url,'Enlace copiado')};

/* ---------- Supabase (solo RPC públicas con clave publishable) ---------- */
const rpc=async(f,b)=>{const r=await fetch(S.supabase.url+'/rest/v1/rpc/'+f,{method:'POST',headers:{apikey:S.supabase.key,'Content-Type':'application/json'},body:JSON.stringify(b||{})});if(!r.ok)throw new Error(await r.text().catch(()=>'rpc'));return r.status===204?null:r.json()};

/* ---------- arranque común (home + página de beat) ---------- */
function boot(){
 $$('[data-i]').forEach(e=>e.insertAdjacentHTML('afterbegin',svg(e.dataset.i,+e.dataset.s||20)));
 if(!$('.scrim'))D.body.append(Object.assign(D.createElement('div'),{className:'scrim'}));
 if(!$('.drawer')){const d=D.createElement('aside');d.className='drawer';d.setAttribute('aria-label','Carrito');D.body.append(d)}
 $('.scrim').onclick=closeCart;const cb=$('#cartb');if(cb)cb.onclick=openCart;
 addEventListener('keydown',e=>{if(e.key==='Escape')closeCart()});
 P.bind();Cart.paint();
 D.addEventListener('pointerdown',e=>{const t=e.target.closest('.btn,.chip,.tile,.card');if(!t)return;const r=t.getBoundingClientRect(),x=D.createElement('span');x.className='rip';x.style.left=e.clientX-r.left+'px';x.style.top=e.clientY-r.top+'px';t.append(x);setTimeout(()=>x.remove(),900)});
}
/* color de acento (apagado y profundo: se usa solo como luz suave de fondo) */
function accent(i){
 const c=D.createElement('canvas');c.width=c.height=24;const x=c.getContext('2d');x.drawImage(i,0,0,24,24);const d=x.getImageData(0,0,24,24).data;
 let r=0,g=0,bl=0,W=0;
 for(let p=0;p<d.length;p+=4){const mx=Math.max(d[p],d[p+1],d[p+2]),mn=Math.min(d[p],d[p+1],d[p+2]),s=mx?(mx-mn)/mx:0,w=s*s*(mx/255)+.002;r+=d[p]*w;g+=d[p+1]*w;bl+=d[p+2]*w;W+=w}
 r/=W;g/=W;bl/=W;const M=Math.max(r,g,bl),m=Math.min(r,g,bl),dd=M-m;let h=0;
 if(dd)h=((M===r?((g-bl)/dd)%6:M===g?(bl-r)/dd+2:(r-g)/dd+4)*60+360)%360;
 const s=.6,l=.5,a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))))};
 return [f(0),f(8),f(4)];
}

/* ---------- reproductor global (previews cifrados AES-GCM, 1 activo) ---------- */
const P=(()=>{
 const a=new Audio();a.preload='auto';let q=[],cur=null,tok=0,keyP=null;const cache=new Map(),ev=new EventTarget();
 const key=()=>keyP||(keyP=crypto.subtle.importKey('raw',Uint8Array.from(atob(S.previewKey),c=>c.charCodeAt(0)),'AES-GCM',false,['decrypt']));
 const blob=b=>{if(cache.has(b.id))return cache.get(b.id);const p=(async()=>{if(!crypto.subtle)throw new Error('https');const r=await fetch(ROOT+b.preview);if(!r.ok)throw new Error('audio '+r.status);const buf=await r.arrayBuffer();
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(buf,0,12)},await key(),buf.slice(12));return URL.createObjectURL(new Blob([pt],{type:'audio/mpeg'}))})();
  cache.set(b.id,p);p.catch(()=>cache.delete(b.id));if(cache.size>6){const k=cache.keys().next().value;if(k!==b.id){cache.get(k).then(u=>URL.revokeObjectURL(u),()=>{});cache.delete(k)}}return p};
 const emit=(t,d)=>ev.dispatchEvent(new CustomEvent(t,{detail:d}));
 async function play(b,list){if(list)q=list;
  if(cur&&cur.id===b.id&&a.src){if(a.paused){try{await a.play();return true}catch(e){emit('state',{paused:true});return false}}a.pause();return false}
  const my=++tok;cur=b;a.pause();emit('load',b);ui(b);
  try{const u=await blob(b);if(my!==tok)return false;a.src=u;await a.play();track('play',{beat:b.id});const n=nextOf(1);n&&blob(n).catch(()=>{});return true}
  catch(e){if(my!==tok)return false;if(e.name==='NotAllowedError'){emit('state',{paused:true});return false}emit('error',b);toast('No se pudo reproducir');return false}}
 const nextOf=d=>{if(!q.length||!cur)return null;const i=q.findIndex(x=>x.id===cur.id);return q[(i+d+q.length)%q.length]};
 const step=d=>{const n=nextOf(d);n&&play(n)};
 a.addEventListener('play',()=>emit('state',{paused:false}));a.addEventListener('pause',()=>emit('state',{paused:true}));a.addEventListener('ended',()=>step(1));
 a.addEventListener('timeupdate',()=>{emit('time',{t:a.currentTime,d:a.duration||0});const sk=$('#msk');if(sk&&!sk._d){sk.value=a.duration?a.currentTime/a.duration*1000:0;sk.style.setProperty('--p',sk.value/10+'%')}const mt=$('#mt'),md=$('#md'),bar=$('.mini .bar i');if(mt)mt.textContent=fmt(a.currentTime);if(md)md.textContent=fmt(a.duration||0);if(bar)bar.style.setProperty('--w',(a.duration?a.currentTime/a.duration*100:0)+'%')});
 function ui(b){const m=$('.mini');$('#mi').src=ROOT+b.thumb;$('#mn').textContent=b.name;$('#ms').textContent=[b.type,b.bpm&&b.bpm+' BPM',b.key].filter(Boolean).join(' · ');m.classList.add('on');D.body.classList.add('has-mini');
  if('mediaSession' in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:b.name,artist:S.brand.name,artwork:[{src:new URL(ROOT+b.cover,location.href).href,sizes:'1200x1200',type:'image/jpeg'}]});
   try{navigator.mediaSession.setActionHandler('play',()=>a.play());navigator.mediaSession.setActionHandler('pause',()=>a.pause());const product=D.body.classList.contains('beat-product');navigator.mediaSession.setActionHandler('nexttrack',product?null:()=>step(1));navigator.mediaSession.setActionHandler('previoustrack',product?null:()=>step(-1))}catch(e){}}}
 function bind(){const pp=$('#mpp'),sk=$('#msk'),vl=$('#mvl'),nx=$('#mnx'),pv=$('#mpv');if(pp)pp.onclick=()=>cur&&(a.paused?a.play():a.pause());if(nx)nx.onclick=()=>step(1);if(pv)pv.onclick=()=>step(-1);
  ev.addEventListener('state',e=>{if(pp)pp.innerHTML=svg(e.detail.paused?'play':'pause',18)});
  if(sk){sk.addEventListener('input',()=>{sk._d=1;sk.style.setProperty('--p',sk.value/10+'%');const mt=$('#mt');if(mt)mt.textContent=fmt(a.duration*sk.value/1000)});sk.addEventListener('change',()=>{if(a.duration)a.currentTime=a.duration*sk.value/1000;sk._d=0})}
  let v=85;try{v=+(localStorage.ronVol??85)}catch(e){}if(vl){vl.value=v;a.volume=v/100;vl.style.setProperty('--p',v+'%');vl.oninput=()=>{a.volume=vl.value/100;vl.style.setProperty('--p',vl.value+'%');try{localStorage.ronVol=vl.value}catch(e){}}}else a.volume=.85
 }
 return{play,step,ev,audio:a,get cur(){return cur},preload:b=>blob(b).catch(()=>{}),bind,setList:l=>q=l}})();

/* ---------- carrito ---------- */
const Cart=(()=>{let items=[];try{items=JSON.parse(localStorage.ronCart||'[]')}catch(e){}const ev=new EventTarget();
 const save=()=>{try{localStorage.ronCart=JSON.stringify(items)}catch(e){}paint();ev.dispatchEvent(new Event('change'))};
 /* combo: % según nº de beats distintos; las EXCLUSIVE no se rebajan */
 const tiers=(S.bundle&&S.bundle.tiers)||[];
 const pctFor=n=>tiers.reduce((p,[c,d])=>n>=c?d:p,0);
 const nextTier=n=>tiers.find(([c])=>c>n)||null;
 const pct=()=>pctFor(items.length);
 const net=i=>S.licenses[i.lic].exclusive?i.price:Math.round(i.price*(100-pct())/100);
 const subtotal=()=>items.reduce((s,i)=>s+i.price,0);
 const total=()=>items.reduce((s,i)=>s+net(i),0);
 function paint(){const b=$('#cartb');if(!b)return;const c=$('.cnt',b);c.textContent=items.length;b.classList.toggle('has',items.length>0)}
 function ping(from){const b=$('#cartb');if(!b)return;if(from&&from.getBoundingClientRect){const r=from.getBoundingClientRect(),t=b.getBoundingClientRect();const f=D.createElement('img');f.src=from.currentSrc||from.src;f.className='fly';Object.assign(f.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});D.body.append(f);
   f.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${t.left+t.width/2-r.left-r.width/2}px,${t.top+t.height/2-r.top-r.height/2}px) scale(.1)`,opacity:.15}],{duration:700,easing:'cubic-bezier(.5,0,.2,1)'}).onfinish=()=>{f.remove();flash(b)}}else flash(b)}
 function flash(b){b.classList.remove('bump');void b.offsetWidth;b.classList.add('bump');setTimeout(()=>b.classList.remove('bump'),600)}
 function add(beat,lic,from){if(!avail(beat,lic))return toast('Licencia no disponible');const it={id:beat.id,slug:beat.slug,name:beat.name,thumb:beat.thumb,lic,price:price(beat,lic)};items=items.filter(i=>i.id!==beat.id);items.push(it);save();ping(from);track('cart',{beat:beat.id,lic});toast(`${beat.name} · ${S.licenses[lic].name} añadido`)}
 return{ev,get items(){return items},total,subtotal,net,pct,nextTier,add,has:(id,lic)=>items.some(i=>i.id===id&&i.lic===lic),remove:id=>{items=items.filter(i=>i.id!==id);save()},clear:()=>{items=[];save()},paint}})();

/* ---------- checkout dentro de la web: carrito → datos → pedido registrado → pago PayPal ---------- */
let step='cart',pending=null;try{pending=JSON.parse(localStorage.ronPending||'null')}catch(e){}
const setPending=p=>{pending=p;try{p?localStorage.ronPending=JSON.stringify(p):localStorage.removeItem('ronPending')}catch(e){}};
const payUrl=p=>`${S.paypal.me}/${p.total}${S.currency}`;
const termsOf=i=>{const L=S.licenses[i.lic];return{license:L.name,price:Cart.net(i),list_price:i.price,bundle_pct:L.exclusive?0:Cart.pct(),currency:S.currency,formats:L.formats,distribution:L.distribution,monetization:L.monetization,permissions:L.permissions,restrictions:L.restrictions,accepted_at:new Date().toISOString()}};
const orderErr=e=>{const m=String(e&&e.message||'');return /exclusive_vendido/.test(m)?'Una licencia EXCLUSIVE de tu carrito ya fue vendida. Quítala para continuar.':/email/.test(m)?'Revisa tu correo electrónico.':/nombre/.test(m)?'Escribe tu nombre.':/limite/.test(m)?'Demasiados pedidos pendientes con este correo. Intenta más tarde.':'No se pudo registrar el pedido. Intenta de nuevo en un momento.'};
async function createOrder(name,email){
 const items=Cart.items.map(i=>({beat_id:i.id,beat_name:i.name,beat_slug:i.slug,license:i.lic,price:Cart.net(i),terms:termsOf(i)}));
 const r=await rpc('crear_pedido',{p_nombre:name,p_email:email,p_items:items,p_moneda:S.currency});
 return r&&r.code;
}
function openCart(s){step=Cart.items.length?(s==='info'?'info':'cart'):(pending?'pay':'cart');drawerView();$('.drawer').classList.add('on');$('.scrim').classList.add('on');D.body.style.overflow='hidden'}
function closeCart(){const d=$('.drawer');if(!d)return;d.classList.remove('on');$('.scrim').classList.remove('on');D.body.style.overflow=''}
function bundleHint(){const n=Cart.items.length,t=Cart.nextTier(n);if(!t)return Cart.pct()?`<p class="bh on">Combo activo · ${Cart.pct()}% menos en tus licencias no exclusivas</p>`:'';const f=t[0]-n;return`<p class="bh">Añade ${f} beat${f>1?'s':''} más y ahorra <b>${t[1]}%</b> en tu compra</p>`}
function drawerView(){
 const d=$('.drawer'),it=Cart.items,tot=Cart.total();
 const head=(t,back)=>`<div class="dh">${back?`<button class="ib" id="db" aria-label="Volver">${svg('chev')}</button>`:''}<h3>${t}</h3><button class="ib" id="dx" aria-label="Cerrar">${svg('x')}</button></div>`;
 if(!it.length&&step!=='pay')step='cart';
 if(step==='pay'&&!pending)step='cart';
 let html='';
 if(step==='cart'){
  const rows=it.map(i=>{const L=S.licenses[i.lic];return`<div class="ci"><img src="${ROOT}${i.thumb}" alt="" width="56" height="56"><div class="ci-t"><b>${esc(i.name)}</b><small>${L.name} · ${L.formats.join(' + ')}</small></div><div class="ci-p">${Cart.net(i)!==i.price?`<s class="was">${money(i.price)}</s>`:''}<span class="nv">${money(Cart.net(i))}</span><button class="rm" data-rm="${esc(i.id)}">Quitar</button></div></div>`}).join('');
  html=head(`Carrito${it.length?` <span>${it.length}</span>`:''}`)+(it.length
   ?`<div class="db">${rows}${bundleHint()}</div><div class="df">${Cart.pct()?`<div class="tr sm"><span>Subtotal</span><span>${money(Cart.subtotal())}</span></div><div class="tr sm save"><span>Combo −${Cart.pct()}%</span><span>−${money(Cart.subtotal()-tot)}</span></div>`:''}<div class="tr"><span>Total</span><b>${money(tot)}</b></div><button class="btn fill block" id="nx">Continuar</button><p class="note">Pago con PayPal · Licencia en PDF con tus términos.</p></div>`
   :`<div class="db"><div class="empty">${svg('cart',40)}<b>Tu carrito está vacío</b><p>Elige un beat y una licencia para empezar.</p><button class="btn" id="gob">Explorar beats</button></div></div>`);
 }else if(step==='info'){
  html=head('Tus datos',1)+`<form class="db fm" id="fm" novalidate><p class="lead">Te enviaremos aquí tus archivos y la licencia en PDF.</p>
   <label>Nombre<input id="f-n" autocomplete="name" placeholder="Tu nombre" required></label>
   <label>Correo electrónico<input id="f-e" type="email" autocomplete="email" inputmode="email" placeholder="tu@correo.com" required></label>
   <label class="ck"><input type="checkbox" id="f-t"><span>Acepto los términos de la licencia elegida. El pago se confirma manualmente.</span></label>
   <p class="err" id="err" role="alert" hidden></p>
   <div class="sum">${it.map(i=>`<div><span>${esc(i.name)} · ${S.licenses[i.lic].name}</span><b>${money(Cart.net(i))}</b></div>`).join('')}${Cart.pct()?`<div><span>Combo −${Cart.pct()}% (no aplica a EXCLUSIVE)</span><b>−${money(Cart.subtotal()-tot)}</b></div>`:''}<div class="t"><span>Total</span><b>${money(tot)}</b></div></div>
   <button class="btn fill block" id="go" type="submit">Continuar al pago</button></form>`;
 }else{
  const p=pending;
  html=head('Pedido registrado')+`<div class="db paid"><span class="ok">${svg('check',22)}</span><p class="code">${esc(p.code)}</p><p class="lead">Total a pagar <b>${money(p.total)}</b></p>
   <a class="btn fill block" id="pp" href="${payUrl(p)}" target="_blank" rel="noopener">Pagar ${money(p.total)} con PayPal</a>
   <ol class="steps"><li>Completa el pago en PayPal.</li><li>Confirmamos tu pago manualmente.</li><li>Recibes tus archivos y la licencia en <b>${esc(p.email)}</b>.</li></ol></div>
   <div class="df"><button class="btn block" id="cc">Copiar código del pedido</button><button class="btn ghost block" id="done">Listo</button></div>`;
 }
 d.innerHTML=html;
 $('#dx').onclick=closeCart;const bk=$('#db');bk&&(bk.onclick=()=>{step='cart';drawerView()});
 const g=$('#gob');g&&(g.onclick=()=>{closeCart();const b=$('[data-v="beats"]');b&&b.click()});
 $$('[data-rm]',d).forEach(b=>b.onclick=()=>{Cart.remove(b.dataset.rm);drawerView()});
 const nx=$('#nx');nx&&(nx.onclick=()=>{step='info';drawerView();setTimeout(()=>{const n=$('#f-n');n&&n.focus()},50)});
 const fm=$('#fm');
 if(fm){try{const s=JSON.parse(localStorage.ronBuyer||'{}');$('#f-n').value=s.n||'';$('#f-e').value=s.e||''}catch(e){}
  fm.onsubmit=async ev=>{ev.preventDefault();const n=$('#f-n').value.trim(),e=$('#f-e').value.trim(),er=$('#err'),go=$('#go');
   const fail=m=>{er.textContent=m;er.hidden=false};er.hidden=true;
   if(n.length<2)return fail('Escribe tu nombre.');
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))return fail('Revisa tu correo electrónico.');
   if(!$('#f-t').checked)return fail('Debes aceptar los términos para continuar.');
   go.disabled=true;go.textContent='Registrando pedido…';
   try{const code=await createOrder(n,e);if(!code)throw new Error('code');Cart.items.forEach(i=>track('buy',{beat:i.id,lic:i.lic}));try{localStorage.ronBuyer=JSON.stringify({n,e})}catch(x){}
    setPending({code,total:Cart.total(),email:e,name:n});Cart.clear();step='pay';drawerView()}
   catch(x){go.disabled=false;go.textContent='Continuar al pago';fail(orderErr(x))}}}
 const cc=$('#cc');cc&&(cc.onclick=()=>copy(pending.code,'Código copiado'));
 const dn=$('#done');dn&&(dn.onclick=()=>{setPending(null);step='cart';closeCart()});
}

/* ---------- init ---------- */
const sold=async()=>{try{return await rpc('exclusivos_vendidos')}catch(e){return[]}};
/* ---------- analítica anónima: cola persistente + presencia real ---------- */
const track=(()=>{
 let reason='ready',enabled=!!(S.supabase&&S.supabase.url&&S.supabase.key);
 const diag={enabled:false,reason:'',state:'idle',lastSuccess:null,lastError:null,pending:0};
 const QUEUE='ronAnaQueue',saveDiag=()=>{try{localStorage.setItem('ronAnaDiag',JSON.stringify(diag))}catch(e){}};
 try{
  if(navigator.doNotTrack==='1'&&localStorage.ronCountMe!=='1'){enabled=false;reason='do-not-track'}
  if(localStorage.ronNoTrack&&localStorage.ronCountMe!=='1'){enabled=false;reason='admin-excluded'}
  if(/^(localhost|127\.|\[::1\])/.test(location.hostname)){enabled=false;reason='local-preview'}
 }catch(e){enabled=false;reason='storage-blocked'}
 const rid=()=>{const a=new Uint8Array(10);try{crypto.getRandomValues(a)}catch(e){for(let i=0;i<a.length;i++)a[i]=Math.random()*256}return Array.from(a,x=>x.toString(36).padStart(2,'0')).join('')};
 const mem=(st,k)=>{try{let v=st.getItem(k);if(!v){v=rid();st.setItem(k,v)}return v}catch(e){return rid()}};
 const sid=mem(localStorage,'ronSid'),sess=mem(sessionStorage,'ronSess');
 const ua=navigator.userAgent||'',dev=/iPad|Tablet/i.test(ua)||(/Android/i.test(ua)&&!/Mobile/i.test(ua))?'tablet':/Mobi|iPhone|Android/i.test(ua)?'movil':'pc';
 let tz='',lang=(navigator.language||'').slice(0,12);try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
 const path=location.pathname.replace(/index\.html$/,'').slice(0,120)||'/';
 const ref=(()=>{try{const u=new URLSearchParams(location.search).get('utm_source');if(u)return u.slice(0,40).toLowerCase();const h=document.referrer&&new URL(document.referrer).hostname.replace(/^www\./,'');return h&&h!==location.hostname?h:''}catch(e){return''}})();
 let cur=null,busy=false,queue=[];const seen={};
 try{const q=JSON.parse(localStorage.getItem(QUEUE)||'[]');if(Array.isArray(q))queue=q.filter(x=>x&&x.p_sess&&x.p_ev).slice(-60)}catch(e){}
 const persist=()=>{diag.pending=queue.length;try{localStorage.setItem(QUEUE,JSON.stringify(queue.slice(-60)))}catch(e){}saveDiag()};
 diag.enabled=enabled;diag.reason=enabled?'enabled':reason;diag.state=enabled?'connecting':'paused';window.__RON_ANALYTICS=diag;persist();
 const makeBody=(ev,x={})=>({p_sess:sess,p_sid:sid,p_ev:ev,
  p_beat:ev==='hb'?(P.cur&&!P.audio.paused?P.cur.id:null):(x.beat||null),
  p_lic:x.lic||null,p_path:path,p_ref:ev==='view'?ref:null,p_dev:dev,p_tz:tz,p_lang:lang});
 const request=async(body,keepalive=false)=>{
  const r=await fetch(S.supabase.url.replace(/\/$/, '')+'/rest/v1/rpc/ron_track',{
   method:'POST',headers:{apikey:S.supabase.key,'Content-Type':'application/json','Accept':'application/json'},
   body:JSON.stringify(body),keepalive,cache:'no-store'
  });
  if(!r.ok){const detail=(await r.text().catch(()=>'' )).slice(0,500);throw Object.assign(new Error('HTTP '+r.status),{status:r.status,detail})}
  return true;
 };
 async function flush(){
  if(!enabled||busy||!queue.length||navigator.onLine===false)return false;
  busy=true;
  try{
   while(queue.length){const item=queue[0];try{await request(item,true);queue.shift();persist();diag.state='connected';diag.lastSuccess=new Date().toISOString();diag.lastError=null;}
    catch(e){diag.state='error';diag.lastError={status:e.status||0,message:e.message||'Network error',detail:e.detail||''};saveDiag();break}}
  }finally{busy=false;persist()}
  return !queue.length;
 }
 const send=(ev,x={})=>{
  if(!enabled)return Promise.resolve(false);
  const now=Date.now(),key=ev+'|'+(x.beat||'')+'|'+(x.lic||''),gap=ev==='play'?20000:ev==='hb'?0:3000;
  if(gap&&seen[key]&&now-seen[key]<gap)return Promise.resolve(false);seen[key]=now;
  if(ev==='beat'||ev==='play')cur=x.beat||cur;
  const body=makeBody(ev,x);
  if(ev!=='hb'&&queue.length){queue.push(body);queue=queue.slice(-60);persist();flush();return Promise.resolve(true)}
  return request(body,ev==='hb').then(()=>{
   diag.state='connected';diag.lastSuccess=new Date().toISOString();diag.lastError=null;saveDiag();
   window.dispatchEvent(new CustomEvent('ron:analytics',{detail:{ok:true,event:ev}}));return true;
  }).catch(e=>{
   if(ev!=='hb'){queue.push(body);queue=queue.slice(-60);persist();}
   diag.state='error';diag.lastError={status:e.status||0,message:e.message||'Network error',detail:e.detail||''};saveDiag();
   window.dispatchEvent(new CustomEvent('ron:analytics',{detail:{ok:false,event:ev,error:diag.lastError}}));
   console.warn('[RONALL analytics] No se pudo registrar',ev,diag.lastError);return false;
  });
 };
 if(enabled){send('view');setInterval(()=>{if(!D.hidden){send('hb');flush()}},20000);addEventListener('online',flush);D.addEventListener('visibilitychange',()=>{if(!D.hidden){send('hb');flush()}else flush()});addEventListener('pagehide',()=>{flush()});}
 return send;
})();

window.RON={S,$,$$,esc,money,fmt,beatUrl,price,avail,fromPrice,was,wa,waInfo,waRequest,waNumDisplay,svg,toast,copy,share,rpc,track,P,Cart,sold,openCart,closeCart,accent,boot};
})();
