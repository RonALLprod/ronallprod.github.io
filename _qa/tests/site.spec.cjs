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
  await expect(page.locator('#openLicenses')).toBeVisible();
  await page.locator('#openLicenses').click();
  await expect(page.locator('#licenseModal')).toHaveClass(/is-open/);
  await expect(page.locator('#lics .lic').first()).toBeVisible();
}

test('carga Beats y Catálogo, registra errores y genera capturas', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
  await openStore(page);
  const homeDiag = await page.evaluate(() => ({
    viewport: [innerWidth, innerHeight],
    rootClasses: document.documentElement.className,
    activeView: document.querySelector('.view.active')?.id,
    bgOpacity: getComputedStyle(document.querySelector('.bgc.on') || document.querySelector('.bgc')).opacity,
    titleFont: getComputedStyle(document.querySelector('#ttl')).fontFamily,
    kosmosReady: document.fonts.check('400 64px Kosmos')
  }));
  console.log('RONALL_HOME_DIAG ' + JSON.stringify(homeDiag));
  await page.screenshot({ path: testInfo.outputPath('home.png') });
  await openCatalog(page);
  const catalogDiag = await page.evaluate(() => ({
    activeView: document.querySelector('.view.active')?.id,
    searchVisible: !!document.querySelector('#f-q')?.getClientRects().length,
    cards: document.querySelectorAll('#grid .bc').length
  }));
  console.log('RONALL_CATALOG_DIAG ' + JSON.stringify(catalogDiag));
  await page.screenshot({ path: testInfo.outputPath('catalog.png') });
  await page.screenshot({ path: testInfo.outputPath('catalog-full.png'), fullPage: true });
  expect(errors).toEqual([]);
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
  await expect(page.locator('#bp-openLicenses')).toBeVisible();
  await page.locator('#bp-openLicenses').click();
  await expect(page.locator('#licenseModal')).toHaveClass(/is-open/);
  await page.locator('#lics .lic[data-k="basic"]').click();
  await page.locator('#bp-add').click();
  await expect(page.locator('#cartb .cnt')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('móvil: dock visible, navegación funcional y sin desbordamiento horizontal', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await openStore(page);
  await expect(page.locator('.dock')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await openCatalog(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});


test('conserva el lenguaje visual RonALL y ordena la compra antes de Más beats', async ({ page }, testInfo) => {
  await openStore(page);
  const state = await page.evaluate(() => {
    const title = document.querySelector('#ttl');
    const art = document.querySelector('.art-w').getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    const buy = document.querySelector('#comprar');
    const more = document.querySelector('#moreS');
    return {
      titleFont: getComputedStyle(title).fontFamily,
      logoFont: getComputedStyle(document.querySelector('.brand b')).fontFamily,
      railDirection: getComputedStyle(document.querySelector('#top')).flexDirection,
      railPosition: getComputedStyle(document.querySelector('#top')).position,
      artAboveTitle: innerWidth < 900 ? art.top < titleBox.top : art.left > titleBox.left,
      homeScrollHeight: document.querySelector('#v-home').scrollHeight,
      homeClientHeight: document.querySelector('#v-home').clientHeight,
      modalTrigger: !!document.querySelector('#openLicenses'),
      moreHidden: getComputedStyle(document.querySelector('#moreS')).display === 'none',
      hasLetterAnimation: !!title.querySelector('.l'),
      viewport: [innerWidth, innerHeight],
      scrollWidth: document.documentElement.scrollWidth
    };
  });
  console.log('RONALL_IDENTITY_DIAG ' + JSON.stringify(state));
  expect(state.titleFont).toContain('Kosmos');
  expect(state.logoFont).toContain('Kosmos');
  expect(state.railPosition).toBe('fixed');
  expect(state.railDirection).toBe(testInfo.project.name === 'mobile-chromium' ? 'row' : 'column');
  expect(state.artAboveTitle).toBe(true);
  expect(state.modalTrigger).toBe(true);
  expect(state.moreHidden).toBe(true);
  expect(state.homeScrollHeight).toBeLessThanOrEqual(state.homeClientHeight + 2);
  expect(state.hasLetterAnimation).toBe(true);
  expect(state.scrollWidth).toBeLessThanOrEqual(state.viewport[0] + 1);
  await page.screenshot({ path: testInfo.outputPath('identity-home.png') });
});

test('la estética del catálogo conserva el display art y filtros en un solo carril', async ({ page }) => {
  await openStore(page);
  await openCatalog(page);
  const diag = await page.evaluate(() => ({
    headingFont: getComputedStyle(document.querySelector('#v-catalogo .h2')).fontFamily,
    cardFont: getComputedStyle(document.querySelector('#grid .bc-b h3')).fontFamily,
    chipWrap: getComputedStyle(document.querySelector('#chips')).flexWrap,
    chipOverflow: getComputedStyle(document.querySelector('#chips')).overflowX,
    count: document.querySelectorAll('#grid .bc').length
  }));
  console.log('RONALL_CATALOG_STYLE ' + JSON.stringify(diag));
  expect(diag.headingFont).toContain('Kosmos');
  expect(diag.cardFont).toContain('Kosmos');
  expect(diag.chipWrap).toBe('nowrap');
  expect(['auto','scroll']).toContain(diag.chipOverflow);
  expect(diag.count).toBeGreaterThan(0);
});


test('ventana de licencias abre y cierra con Escape y backdrop', async ({ page }) => {
  await openStore(page);
  const trigger = page.locator('#openLicenses');
  await trigger.click();
  await expect(page.locator('#licenseModal')).toHaveClass(/is-open/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#lics .lic')).toHaveCount(4);
  const focusInside = await page.evaluate(() => document.activeElement?.closest('.license-window') !== null);
  expect(focusInside).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#licenseModal')).not.toHaveClass(/is-open/);
  await trigger.click();
  await page.locator('.license-backdrop').click({ position: { x: 6, y: 6 } });
  await expect(page.locator('#licenseModal')).not.toHaveClass(/is-open/);
});

test('la portada es una sola pantalla sin scroll vertical', async ({ page }) => {
  await openStore(page);
  const metrics = await page.evaluate(() => {
    const view = document.querySelector('#v-home');
    const title = document.querySelector('#ttl').getBoundingClientRect();
    const dock = document.querySelector('.dock')?.getBoundingClientRect();
    return {viewScroll:view.scrollHeight,viewClient:view.clientHeight,horizontal:document.documentElement.scrollWidth,titleBottom:title.bottom,dockTop:dock?.top??innerHeight};
  });
  expect(metrics.viewScroll).toBeLessThanOrEqual(metrics.viewClient + 2);
  expect(metrics.horizontal).toBeLessThanOrEqual(await page.evaluate(() => innerWidth + 1));
  expect(metrics.titleBottom).toBeLessThan(metrics.dockTop);
});

test('el modal mantiene la compra visible en móvil', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await openStore(page);
  await page.locator('#openLicenses').click();
  await expect(page.locator('#licenseModal')).toHaveClass(/is-open/);
  await page.locator('#lics .lic[data-k="premium"]').click();
  await expect(page.locator('#b-add')).toBeEnabled();
  const modal=await page.locator('.license-window').boundingBox(),buy=await page.locator('#b-add').boundingBox();
  expect(modal.y).toBeGreaterThanOrEqual(0);
  expect(modal.y+modal.height).toBeLessThanOrEqual(844);
  expect(buy.y+buy.height).toBeLessThanOrEqual(modal.y+modal.height+1);
  await page.screenshot({path:testInfo.outputPath('license-window-mobile.png')});
});
