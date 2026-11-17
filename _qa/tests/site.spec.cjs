const { test, expect } = require('@playwright/test');

async function openStore(page) {
  await page.route('https://kwmofbiiwvpojtkvlmxz.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/ron_track')) {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]'
    });
  });
  await page.goto('/');
  await expect(page.locator('#list .row').first()).toBeAttached();
  await expect(page.locator('#ttl')).not.toBeEmpty();
}

test('carga catálogo y genera captura de escritorio', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await openStore(page);
  await expect(page.locator('#list .row').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('home-desktop.png'), fullPage: true });
  expect(pageErrors).toEqual([]);
});

test('buscar y seleccionar una licencia sin romper el carrito', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await openStore(page);

  const search = page.locator('#f-q');
  await search.fill('click clack');
  await expect(page.locator('#list .row')).toHaveCount(1);
  await search.fill('esto-no-existe');
  await expect(page.locator('#list .row')).toHaveCount(0);
  await search.fill('');

  await page.locator('#lics .lic[data-k="basic"]').click();
  await expect(page.locator('#b-add')).toBeEnabled();
  await page.locator('#b-add').click();
  await expect(page.locator('#cartb .cnt')).toHaveText('1');
});

test('scroll y selección suspenden efectos pesados y luego los reanudan', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await openStore(page);

  const main = page.locator('#main');
  await expect.poll(() => main.evaluate(el => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0);
  await main.evaluate(el => el.scrollTo({ top: Math.min(420, el.scrollHeight), behavior: 'auto' }));
  await expect.poll(() => main.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await expect(page.locator('body')).toHaveClass(/is-scrolling/);
  await expect.poll(() => page.locator('.fx-scene').evaluate(el =>
    getComputedStyle(el, '::before').animationPlayState
  )).toBe('paused');
  await expect.poll(() => page.locator('body').evaluate(el => el.classList.contains('is-scrolling'))).toBe(false);
  await expect.poll(() => page.locator('.fx-scene').evaluate(el =>
    getComputedStyle(el, '::before').animationPlayState
  )).toBe('running');

  await page.evaluate(() => {
    const heading = document.querySelector('#ttl');
    heading.dispatchEvent(new Event('selectstart', { bubbles: true }));
    const range = document.createRange();
    range.selectNodeContents(heading);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await expect.poll(() => page.locator('#ttl').evaluate(el => el._ltSelecting)).toBe(true);
  await expect.poll(() => page.locator('#ttl').evaluate(el =>
    getComputedStyle(el.closest('.info')).animationPlayState
  )).toBe('paused');

  await page.evaluate(() => window.getSelection().removeAllRanges());
  await expect.poll(() => page.locator('#ttl').evaluate(el => el._ltSelecting)).toBe(false);
});

test('la interfaz móvil muestra navegación y catálogo', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await openStore(page);
  await expect(page.locator('.tabs')).toBeVisible();
  await expect(page.locator('.side')).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('home-mobile.png'), fullPage: true });
});
