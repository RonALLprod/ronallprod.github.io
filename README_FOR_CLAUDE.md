# RONALL PROD — Public Remaster Handoff

## Purpose
Source package for remastering the public RONALL PROD website. This is not the full private repository.

## Included
- Public entry page (index.html) and generated public beat pages (beats/*/index.html).
- Current public CSS and JavaScript source.
- Public beat metadata and artwork.
- Public page generator as reference, package metadata and Playwright QA tests.
- A redacted config/site-config.js reference with placeholders, not production values.

## Excluded intentionally
- panel.html, private.html, private manifest, SQL/database scripts, private catalogue/master data, internal audio/ source files, actual integration keys, WhatsApp/PayPal values, public preview decryption key and proprietary font binaries.
- Original fonts remain in the live repository at assets/fonts/kosmos.woff2 and assets/fonts/acidic.woff2. CSS references them. Preserve the paths and font-family names; do not replace them with generic fonts.
- public-audio preview binaries are not included. Keep current preview paths and player logic unchanged; original public audio files and key will be restored from the original repository during reintegration.

## Integration notes
- config/site-config.js in this ZIP contains placeholders. It is reference-only and must not be deployed. When returning the remaster, the real config from the original repository must be retained; do not invent values or expose credentials.
- tools/build.mjs is included as a template reference but the private data/catalog.json it reads is deliberately absent. Do not run the generator from this ZIP and do not create a replacement catalogue. If you change generated beat pages, update the page template carefully; reintegration uses the original source data.
- data/beats.public.json contains only current published beats. Do not invent beats, tags, prices, BPM, keys or terms.
- private.html remains an external page in the original deployment. Keep existing links intact; do not rebuild or edit its internals.
- Do not commit or deploy this package directly.

## Expected return
Return one ZIP with modified public source and assets, preserving folder structure. Include REMASTER_NOTES.md explaining the visual system, changed files and tests run.
