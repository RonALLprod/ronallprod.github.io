/* RONALL-VISUAL-2026-11-11-V12 · lic.js */
/* selector de licencias reutilizable (home + página de beat) */
(()=>{const R=window.RON,S=R.S;
 const ok=v=>v&&!/^por definir$/i.test(String(v).trim());
 /* Detalle de una licencia. Los campos "Por definir" NO se muestran al público. */
 R.licDetails=k=>{const L=S.licenses[k];if(!L)return'';
  const inc=[`Formatos: ${L.formats.map(R.esc).join(' + ')}`,ok(L.distribution)&&`Distribución: ${R.esc(L.distribution)}`,ok(L.monetization)&&`Monetización: ${R.esc(L.monetization)}`,...L.permissions.map(R.esc)].filter(Boolean);
  const res=L.restrictions.map(R.esc);
  return `<div><h4>Incluye</h4><ul>${inc.map(x=>`<li>${x}</li>`).join('')}</ul></div>${res.length?`<div><h4>Condiciones</h4><ul>${res.map(x=>`<li>${x}</li>`).join('')}</ul></div>`:''}`};
 R.licUI=(beat,box,onChange)=>{let sel=beat.licenses.find(k=>R.avail(beat,k))||null;
  box.setAttribute('role','radiogroup');
  box.innerHTML=beat.licenses.map(k=>{const L=S.licenses[k],a=R.avail(beat,k);
   return`<label class="lic ${a?'':'off'}" data-k="${k}"><input type="radio" name="lic-${R.esc(beat.id)}" value="${k}" ${a?'':'disabled'}>${L.tag&&a?`<em>${R.esc(L.tag)}</em>`:''}<span class="ln">${L.name}</span><span class="lpw"><span class="lp">${a?R.money(R.price(beat,k)):'—'}</span>${a&&R.was(beat,k)?`<s class="wp" aria-label="Antes ${R.money(R.was(beat,k))}">${R.money(R.was(beat,k))}</s>`:''}</span><span class="lf">${a?L.formats.join(' + '):'Vendida'}</span><span class="ld">${R.esc(L.desc)}</span></label>`}).join('');
  const paint=()=>R.$$('.lic',box).forEach(l=>{const on=l.dataset.k===sel;l.classList.toggle('sel',on);const i=l.querySelector('input');i.checked=on});
  const pick=k=>{sel=k;paint();onChange&&onChange(sel)};
  box.onclick=e=>{const l=e.target.closest('.lic');if(!l||l.classList.contains('off'))return;e.preventDefault();pick(l.dataset.k)};
  box.onchange=e=>{const l=e.target.closest('.lic');l&&!l.classList.contains('off')&&pick(l.dataset.k)};
  paint();onChange&&onChange(sel);
  return{get value(){return sel}}}})();
