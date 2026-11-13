// Une y minimiza los CSS de index.html en assets/css/site.css.  Uso: node tools/bundle-css.mjs
// (Vuelve a ejecutarlo si editas app/v11/v12/v13/lite .css)
import fs from 'node:fs';
const files = ['app', 'v11', 'v12', 'v13', 'lite'];
const css = files.map(f => fs.readFileSync(`assets/css/${f}.css`, 'utf8')).join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{};,])\s*/g, '$1').replace(/;}/g, '}').trim();
fs.writeFileSync('assets/css/site.css', '/* generado por tools/bundle-css.mjs */' + css + '\n');
console.log('site.css', css.length, 'bytes');
