const C='ron-state',K='/__known';
const load=async()=>{try{return await(await(await caches.open(C)).match(K)).json()}catch(e){return[]}};
const save=async ids=>(await caches.open(C)).put(K,new Response(JSON.stringify(ids)));
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('message',e=>{if(e.data&&e.data.t==='known')e.waitUntil(save(e.data.ids))});
self.addEventListener('periodicsync',e=>{if(e.tag!=='ron-new')return;e.waitUntil((async()=>{
 const known=new Set(await load());if(!known.size)return;
 const r=await fetch('data/beats.public.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;
 const all=((await r.json()).beats||[]).filter(b=>b.active!==false),nb=all.filter(b=>!known.has(b.id));
 await Promise.all(nb.map(b=>self.registration.showNotification('Nuevo beat · RONALL PROD',{body:b.name+(b.type?' · '+b.type:'')+' — ya disponible',icon:b.thumb,badge:'favicon.png',tag:'ron-'+b.id,data:{url:'/#'+b.slug}})));
 await save(all.map(b=>b.id))})())});
self.addEventListener('notificationclick',e=>{e.notification.close();const u=(e.notification.data&&e.notification.data.url)||'/';
 e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{for(const c of l){if('focus'in c){c.navigate&&c.navigate(u);return c.focus()}}return clients.openWindow(u)}))});
