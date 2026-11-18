const { test, expect } = require('@playwright/test');

/* Supabase se simula: los tests nunca tocan datos reales. */
async function stub(page) {
  await page.route('https://kwmofbiiwvpojtkvlmxz.supabase.co/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/ron_track')) return route.fulfill({ status: 204, body: '' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}
async function openStore(page) {
  await stub(page);
  await page.goto('/');
  await expect(page.locator('#grid .bc').first()).toBeAttached();
  await expect(page.locator('#ttl')).not.toBeEmpty();
  await expect(page.locator('#intro')).toHaveCount(0, { timeout: 9000 });
}
async function settleView(page, selector) {
  await page.locator(selector).evaluate(async el => {
    const animations = el.getAnimations({ subtree: true }).filter(animation => animation.effect?.getTiming().iterations !== Infinity);
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
  });
  await page.evaluate(() => document.fonts.ready.then(() => true));
}
async function openCatalog(page) {
  const nav = page.locator('[data-go="catalogo"]:visible').first();
  await expect(nav).toBeVisible();
  await nav.click();
  await expect(page.locator('#v-catalogo')).toHaveClass(/active/);
  await expect(page.locator('#f-q')).toBeVisible();
  await settleView(page, '#v-catalogo');
  await page.locator('#grid .bc img').evaluateAll(images => Promise.all(images.map(img => img.decode().catch(() => {}))));
}
async function openHome(page) {
  const nav = page.locator('[data-go="home"]:visible').first();
  await expect(nav).toBeVisible();
  await nav.click();
  await expect(page.locator('#v-home')).toHaveClass(/active/);
  await expect(page.locator('#lics .lic').first()).toBeVisible();
}

test('portada y catálogo cargan, tipografía y capturas sin errores', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
  await openStore(page);
  await settleView(page, '#v-home');
  const homeDiag = await page.evaluate(() => ({
    viewport: [innerWidth, innerHeight],
    activeView: document.querySelector('.view.active')?.id,
    title: document.querySelector('#ttl')?.textContent,
    titleFont: getComputedStyle(document.querySelector('#ttl')).fontFamily,
    kosmosReady: document.fonts.check('400 64px Kosmos'),
    heroCopy: !!document.querySelector('.hero-copy'),
    heroCTA: !!document.querySelector('.hero-extra [data-go="catalogo"]'),
    headerDirection: getComputedStyle(document.querySelector('#nav')).display,
    scrollWidth: document.documentElement.scrollWidth
  }));
  console.log('RONALL_HOME_DIAG ' + JSON.stringify(homeDiag));
  expect(homeDiag.title).toBeTruthy();
  expect(homeDiag.heroCopy).toBe(true);
  expect(homeDiag.heroCTA).toBe(true);
  expect(homeDiag.scrollWidth).toBeLessThanOrEqual(homeDiag.viewport[0] + 1);
  await page.screenshot({ path: testInfo.outputPath('home.png') });
  await openCatalog(page);
  const catalogDiag = await page.evaluate(() => ({
    activeView: document.querySelector('.view.active')?.id,
    searchVisible: !!document.querySelector('#f-q')?.getClientRects().length,
    cards: document.querySelectorAll('#grid .bc').length,
    sectionFont: getComputedStyle(document.querySelector('#v-catalogo .h2')).fontFamily,
    priceFont: getComputedStyle(document.querySelector('#grid .bc-pr')).fontFamily,
    scrollWidth: document.documentElement.scrollWidth
  }));
  console.log('RONALL_CATALOG_DIAG ' + JSON.stringify(catalogDiag));
  expect(catalogDiag.cards).toBeGreaterThan(0);
  expect(catalogDiag.scrollWidth).toBeLessThanOrEqual(await page.evaluate(() => innerWidth + 1));
  await page.screenshot({ path: testInfo.outputPath('catalog.png') });
  await page.screenshot({ path: testInfo.outputPath('catalog-full.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('cabecera escritorio es horizontal y el CTA navega al catálogo', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await openStore(page);
  const header = await page.locator('#top').evaluate(el => {
    const r = el.getBoundingClientRect();
    return { direction: getComputedStyle(el).flexDirection, width: r.width, height: r.height, top: r.top, bottom: r.bottom };
  });
  expect(header.direction).toBe('row');
  expect(header.width).toBeGreaterThan(1000);
  expect(header.height).toBeGreaterThanOrEqual(60);
  await page.locator('.hero-extra [data-go="catalogo"]').click();
  await expect(page.locator('#v-catalogo')).toHaveClass(/active/);
  await page.screenshot({ path: testInfo.outputPath('catalog-from-hero.png') });
});

test('el botón play del hero es clicable (nada lo tapa)', async ({ page }) => {
  await openStore(page);
  const box = await page.locator('#cplay').boundingBox();
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('#cplay') !== null, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  expect(hit).toBe(true);
});

test('buscar, filtrar por tag y comprar sin romper el carrito', async ({ page }) => {
  await openStore(page);
  await openCatalog(page);
  const q = page.locator('#f-q');
  await q.fill('click clack'); await expect(page.locator('#grid .bc')).toHaveCount(1);
  await q.fill('clik clak'); await expect(page.locator('#grid .bc')).toHaveCount(1);
  await q.fill('esto-no-existe'); await expect(page.locator('#grid .bc')).toHaveCount(0);
  await q.fill(''); await expect(page.locator('#grid .bc').first()).toBeAttached();
  await page.locator('#chips .chip.tg').first().click();
  await expect(page.locator('#grid .bc').first()).toBeAttached();
  await openHome(page);
  await page.locator('#lics .lic[data-k="basic"]').click();
  await expect(page.locator('#b-add')).toBeEnabled();
  await page.locator('#b-add').click();
  await expect(page.locator('#cartb .cnt')).toHaveText('1');
});

test('la página de un beat carga y permite añadir al carrito', async ({ page }) => {
  await stub(page);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/beats/click-clack/');
  await expect(page.locator('#bp-ttl')).toContainText(/click/i);
  await page.locator('#lics .lic[data-k="basic"]').click();
  await page.locator('#bp-add').click();
  await expect(page.locator('#cartb .cnt')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('móvil: jerarquía, dock, búsqueda y cero desbordamiento horizontal', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await openStore(page);
  await expect(page.locator('.dock')).toBeVisible();
  const mobileHero = await page.evaluate(() => {
    const image = document.querySelector('.art-w').getBoundingClientRect();
    const title = document.querySelector('#ttl').getBoundingClientRect();
    const header = document.querySelector('#top').getBoundingClientRect();
    return {
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      titleTop: title.top,
      artTop: image.top,
      headerBottom: header.bottom,
      dockVisible: !!document.querySelector('.dock')?.getClientRects().length
    };
  });
  console.log('RONALL_MOBILE_DIAG ' + JSON.stringify(mobileHero));
  expect(mobileHero.scrollWidth).toBeLessThanOrEqual(mobileHero.viewport + 1);
  expect(mobileHero.titleTop).toBeGreaterThan(mobileHero.headerBottom);
  expect(mobileHero.titleTop).toBeLessThan(mobileHero.artTop);
  await page.screenshot({ path: testInfo.outputPath('mobile-home.png') });
  await openCatalog(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-catalog.png') });
});

test('private y contacto tienen navegación estable', async ({ page }) => {
  await openStore(page);
  await page.locator('[data-go="privado"]:visible').first().click();
  await expect(page.locator('#v-privado')).toHaveClass(/active/);
  await expect(page.locator('#v-privado .btn')).toBeVisible();
  await page.locator('[data-go="contacto"]:visible').first().click();
  await expect(page.locator('#v-contacto')).toHaveClass(/active/);
  await expect(page.locator('#ct-wa')).toBeVisible();
});
