/* RONALL PROD · V61 — compact app workspace and focused license window */
(() => {
'use strict';
const D=document,root=D.documentElement,body=D.body,$=(s,r=D)=>r.querySelector(s);
const product=body.classList.contains('beat-product'),actions=$('.acts');
const panel=product?$('.pg .split'):$('#comprar');
if(!actions||!panel)return;
panel.id='comprar';panel.querySelectorAll('.rvb').forEach(e=>e.classList.remove('rvb','in'));
const trigger=D.createElement('button');
trigger.type='button';trigger.id=product?'bp-openLicenses':'openLicenses';
trigger.className='btn license-launch';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','licenseModal');
trigger.innerHTML='<span class="launch-k">LICENCIAS</span><b>Elegir licencia</b><i aria-hidden="true">↗</i>';
actions.appendChild(trigger);
const layer=D.createElement('div');layer.id='licenseModal';layer.className='license-layer';layer.hidden=true;layer.setAttribute('aria-hidden','true');
layer.innerHTML=
'<button class="license-backdrop" type="button" data-window-close aria-label="Cerrar ventana de licencias"></button>'+
'<section class="license-window glass" role="dialog" aria-modal="true" aria-labelledby="licenseWindowTitle" tabindex="-1">'+
'<header class="license-window-head"><div class="window-mark"><span class="window-led"></span><span>RONALL PROD / LICENSE SELECTOR</span></div>'+
'<div class="window-heading"><div><h2 id="licenseWindowTitle">Elige tu licencia</h2><p id="licenseWindowBeat">Selecciona cómo quieres usar este beat.</p></div>'+
'<button type="button" class="window-close" data-window-close aria-label="Cerrar">×</button></div></header>'+
'<div class="license-window-body"></div><div class="window-foot"><span>RONALL / BEAT STORE</span><span>LICENSING SYSTEM · 01</span></div></section>';
D.body.appendChild(layer);
const win=$('.license-window',layer),winBody=$('.license-window-body',layer);winBody.appendChild(panel);
const nameEl=product?$('#bp-ttl'):$('#ttl'),beatLabel=$('#licenseWindowBeat');
const updateName=()=>{const name=(nameEl?.textContent||'').trim();beatLabel.textContent=name?name+' · Selecciona cómo quieres usarlo.':'Selecciona cómo quieres usar este beat.'};
updateName();
if(nameEl&&'MutationObserver'in window)new MutationObserver(updateName).observe(nameEl,{childList:true,characterData:true,subtree:true});
let returnFocus=null,closeTimer=0,isOpen=false;
const focusables=()=>[...win.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
function openWindow(){
 if(isOpen)return;isOpen=true;clearTimeout(closeTimer);returnFocus=D.activeElement;
 layer.hidden=false;layer.setAttribute('aria-hidden','false');root.classList.add('license-window-open');body.classList.add('license-window-open');D.body.style.overflow='hidden';
 requestAnimationFrame(()=>requestAnimationFrame(()=>{layer.classList.add('is-open');const first=$('.lic:not(.off) input',win)||$('.window-close',win)||win;first.focus({preventScroll:true})}));
}
function closeWindow(){
 if(!isOpen)return;isOpen=false;layer.classList.remove('is-open');layer.setAttribute('aria-hidden','true');
 root.classList.remove('license-window-open');body.classList.remove('license-window-open');D.body.style.overflow='';
 closeTimer=setTimeout(()=>{if(!isOpen)layer.hidden=true},620);
 if(returnFocus&&returnFocus.isConnected)returnFocus.focus({preventScroll:true});
}
trigger.addEventListener('click',openWindow);
layer.addEventListener('click',e=>{if(e.target.closest('[data-window-close]'))closeWindow()});
D.addEventListener('keydown',e=>{
 if(!isOpen)return;
 if(e.key==='Escape'){e.preventDefault();closeWindow();return}
 if(e.key==='Tab'){const list=focusables();if(!list.length){e.preventDefault();win.focus();return}
 const first=list[0],last=list[list.length-1];
 if(e.shiftKey&&D.activeElement===first){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&D.activeElement===last){e.preventDefault();first.focus()}}
});
D.addEventListener('click',e=>{if(isOpen&&e.target.closest('[data-go],#cartb,#b-add,#b-buy,#bp-add,#bp-buy'))closeWindow()},true);
addEventListener('hashchange',closeWindow);addEventListener('pagehide',closeWindow);
window.RonWorkspace=Object.freeze({openLicenses:openWindow,closeLicenses:closeWindow});
})();