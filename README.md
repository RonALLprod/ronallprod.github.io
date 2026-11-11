# RONALL PROD · V12

Tienda de beats estática para **GitHub Pages** (`https://ronallprod.github.io`).

## Estructura
- `404.html` · página de error de GitHub Pages
- `index.html` · tienda pública · `private.html` · catálogo privado (acceso por invitación) · `panel.html` · panel admin
- `config/site-config.js` · **único sitio** para marca, precios, licencias, WhatsApp y Supabase
- `data/catalog.json` · fuente de beats públicos · `data/beats.public.json` · generado
- `public-audio/` · previews cifrados (AES-GCM) · `audio/` · pistas privadas **solo cifradas (.bin)**
- `sql/` · scripts de Supabase (`00_base_acceso` base, `01` ventas, `02` analítica)
- `tools/` · `add-beat.py`, `build.mjs`, `encrypt-private.py` (solo mantenimiento, no se usan en la web)

## Probar en local
`python3 -m http.server 8000` en la raíz del repo y abrir http://localhost:8000 (los previews cifrados necesitan http, no `file://`).

## Añadir un beat
`python3 tools/add-beat.py ...` y luego `node tools/build.mjs` (regenera `beats/*` y `sitemap.xml`).

## Antes de publicar (checklist)
1. Confirmar el número de WhatsApp (`whatsapp.confirmed` en `site-config.js`).
2. Completar `producer.legalName/country/email` y los campos "Por definir" de las licencias.
3. Ejecutar `sql/00_auditoria_rls.sql` y `sql/01_ventas.sql` en Supabase.
4. No subir nunca MP3/WAV sin cifrar de pistas privadas ni masters.
5. GitHub → Settings → Pages → Deploy from branch `main` / root.

## Seguridad
Solo se usa la clave **publishable** de Supabase (nunca `service_role`).
`robots.txt` bloquea `private.html` y `panel.html`; el acceso real lo controlan las funciones RPC.

## Pendiente conocido
- `private.html` pide frames de animación en `vf/` (`vf/0_000.jpg` …). Esa carpeta no está en el repo: súbela desde tu original o las portadas animadas se verán estáticas.
