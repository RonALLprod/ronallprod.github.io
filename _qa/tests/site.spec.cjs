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

test('carga la tienda sin errores y genera capturas', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() === 404) errors.push('404 ' + r.url()); });
  await openStore(page);
  await page.screenshot({ path: testInfo.outputPath('home.png') });
  await page.screenshot({ path: testInfo.outputPath('home-full.png'), fullPage: true });
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
  const q = page.locator('#f-q');
  await q.fill('click clack'); await expect(page.locator('#grid .bc')).toHaveCount(1);
  await q.fill('clik clak'); await expect(page.locator('#grid .bc')).toHaveCount(1);   /* tolera 1 error de tecleo */
  await q.fill('esto-no-existe'); await expect(page.locator('#grid .bc')).toHaveCount(0);
  await q.fill(''); await expect(page.locator('#grid .bc').first()).toBeAttached();
  await page.locator('#chips .chip.tg').first().click();
  await expect(page.locator('#grid .bc').first()).toBeAttached();
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

test('móvil: dock visible y sin desbordamiento horizontal', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await openStore(page);
  await expect(page.locator('.dock')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
