#!/usr/bin/env node
/* Genera: beats/<slug>/index.html (con meta propios), data/beats.public.json, sitemap.xml, robots.txt
   Uso:  node tools/build.mjs        (sin dependencias; Node 18+) */
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const S=new Function('window',fs.readFileSync(R+'/config/site-config.js','utf8')+';return window.SITE')({});
const cat=JSON.parse(fs.readFileSync(R+'/data/catalog.json','utf8'));
const BUILD='RONALL-VISUAL-2026-11-11-V12';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const live=cat.beats.filter(b=>b.visibility==='public'&&b.active!==false);
// 1) JSON público (solo beats publicados y activos)
fs.writeFileSync(R+'/data/beats.public.json',JSON.stringify({beats:live}));
// 2) páginas individuales
const bd=R+'/beats';fs.mkdirSync(bd,{recursive:true});
for(const d of fs.readdirSync(bd)){if(!live.some(b=>b.slug===d))fs.rmSync(path.join(bd,d),{recursive:true,force:true})}
const mn=(b)=>{const p=b.licenses.filter(k=>!(S.licenses[k].exclusive&&b.exclusiveSold)).map(k=>b.prices?.[k]??S.licenses[k].price);return p.length?Math.min(...p):null};
for(const b of live){
 const url=`${S.url}/beats/${b.slug}/`,img=`${S.url}/${b.cover}`,from=mn(b);
 const title=`${b.name}${b.type?' · '+b.type:''} | ${S.brand.name}`;
 const desc=`${b.name}${b.type?' — '+b.type:''}${b.genre?' ('+b.genre+')':''}.${b.bpm?' '+b.bpm+' BPM.':''}${b.key?' '+b.key+'.':''} Escucha el preview y compra tu licencia${from!=null?' desde '+S.currency+' '+from:''}.`;
 const ld={'@context':'https://schema.org','@type':'MusicRecording',name:b.name,url,image:img,genre:b.genre||undefined,duration:b.duration?`PT${Math.floor(b.duration/60)}M${Math.round(b.duration%60)}S`:undefined,byArtist:{'@type':'MusicGroup',name:S.brand.name}};
 const meta=[b.genre,b.bpm&&b.bpm+' BPM',b.key,b.duration&&Math.floor(b.duration/60)+':'+String(Math.round(b.duration%60)).padStart(2,'0')].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('');
 const html=`<!DOCTYPE html>
<html lang="es" data-root="../../" data-build="${BUILD}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">
<meta name="theme-color" content="#101012"><meta name="color-scheme" content="dark">
<meta property="og:type" content="music.song"><meta property="og:site_name" content="${esc(S.brand.name)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="1200"><meta property="og:image:alt" content="Portada de ${esc(b.name)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${img}">
<link rel="icon" type="image/png" href="../../favicon.png"><link rel="apple-touch-icon" href="../../apple-touch-icon.png"><link rel="manifest" href="../../manifest.webmanifest">
<link rel="preload" href="../../assets/fonts/kosmos.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../../assets/css/app.css?v=${BUILD}"><link rel="stylesheet" href="../../assets/css/v12.css?v=${BUILD}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g,'\\u003c')}</script>
<script src="../../config/site-config.js"></script></head><body class="pg beat-product">
<div class="glow" id="glow" aria-hidden="true"></div>
<div class="pgw">
<header class="pgtop"><a class="brand" href="../../index.html"><img src="../../favicon.png" alt="" width="28" height="28"><b>${esc(S.brand.name)}</b></a><span class="sp"></span><a class="back" href="../../index.html#beats">Todos los beats</a><button class="cartb" id="cartb" aria-label="Carrito"><span data-i="cart" data-s="18"></span><span class="cl">Carrito</span><span class="cnt">0</span></button></header>
<main class="bp">
<section class="hero"><div class="art"><img id="cimg" src="../../${esc(b.cover)}" alt="Portada de ${esc(b.name)}" width="1200" height="1200" fetchpriority="high"></div><div class="info"><small class="kicker">${esc(b.type||'Beat')}</small><h1>${esc(b.name)}</h1><div class="meta">${meta}</div></div></section>
<div class="acts"><button class="play" id="bp-play" aria-label="Reproducir preview"></button><button class="ib" id="bp-copy" data-i="link" aria-label="Copiar enlace"></button><button class="ib" id="bp-share" data-i="share" aria-label="Compartir"></button></div>
<div class="sold" id="bp-sold" hidden>La licencia EXCLUSIVE de este beat ya fue vendida. Las demás licencias siguen disponibles.</div>
<div class="split"><section><h2 class="sec-h">Elige tu licencia</h2><div class="lics" id="lics"></div><div class="ldet" id="bp-det"></div></section>
<aside class="buy" aria-label="Compra"><div class="lbl">Total</div><div class="tot" id="bp-tot">—</div><div class="sub" id="bp-sub"></div><button class="btn fill block" id="bp-buy" disabled>Comprar</button><button class="btn block" id="bp-add" disabled>Añadir al carrito</button><ul class="trust"><li>Pago seguro con PayPal</li><li>Licencia en PDF con tus términos</li></ul></aside></div>
</main>
<footer class="foot"><span>© ${esc(S.brand.name)}</span><a href="../../index.html#beats">Beats</a><a href="../../private.html">Private Catalog</a></footer>
</div>
<div class="mini mini-product"><div class="bar"><i></i></div><div class="in"><div class="tk"><img alt="" id="mi"><div><b id="mn"></b><small id="ms"></small></div></div><div class="mid"><div class="ctl"><button class="pp" id="mpp" data-i="play" data-s="18" aria-label="Play/Pause"></button></div></div></div></div>
<script type="application/json" id="beat-data">${JSON.stringify(b).replace(/</g,'\\u003c')}</script>
<script src="../../assets/js/core.js?v=${BUILD}"></script><script src="../../assets/js/lic.js?v=${BUILD}"></script><script src="../../assets/js/motion.js?v=${BUILD}"></script><script src="../../assets/js/beat.js?v=${BUILD}"></script></body></html>`;
 fs.mkdirSync(`${bd}/${b.slug}`,{recursive:true});fs.writeFileSync(`${bd}/${b.slug}/index.html`,html);
}
// 3) sitemap + robots
const today=new Date().toISOString().slice(0,10);
fs.writeFileSync(R+'/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${S.url}/</loc><lastmod>${today}</lastmod></url>\n${live.map(b=>`<url><loc>${S.url}/beats/${b.slug}/</loc><lastmod>${b.created||today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(R+'/robots.txt',`User-agent: *\nAllow: /\nDisallow: /private.html\nDisallow: /panel.html\nSitemap: ${S.url}/sitemap.xml\n`);
console.log(`OK · ${live.length} beat(s) publicado(s):`,live.map(b=>`${S.url}/beats/${b.slug}/`).join('\n  '));
