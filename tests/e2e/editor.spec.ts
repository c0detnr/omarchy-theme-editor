import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { zipSync, strToU8, unzipSync } from 'fflate';
const fixture = 'tests/fixtures/wallpaper.png';
async function ready(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.locator('#language').selectOption('tr');
  await expect(page.getByRole('button', { name: 'Dışa Aktar' })).toBeEnabled();
  await expect(page.getByText('Tüm değişiklikler kaydedildi')).toBeVisible();
}
test('live color edits reject invalid HEX, support keyboard history and preserve mode metadata', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  const accent = page.getByRole('textbox', { name: 'Vurgu', exact: true });
  await accent.fill('#ff8800');
  await expect(page.locator('.desktop')).toHaveCSS('--p-accent', '#ff8800');
  await expect(page.locator('.terminal-window')).toHaveCSS(
    'border-top-color',
    'rgb(255, 136, 0)',
  );
  await accent.fill('#bad');
  await expect(accent).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.desktop')).toHaveCSS('--p-accent', '#ff8800');
  await expect(page.locator('.terminal-window')).toHaveCSS(
    'border-top-color',
    'rgb(255, 136, 0)',
  );
  await page.getByRole('button', { name: 'Geri al', exact: true }).click();
  await expect(accent).toHaveValue('#7aa2f7');
  await page.getByRole('button', { name: 'İleri al', exact: true }).click();
  await expect(accent).toHaveValue('#ff8800');
  await page.locator('h1').click();
  await page.keyboard.press('Control+z');
  await expect(accent).toHaveValue('#7aa2f7');
  await page.keyboard.press('Control+Shift+z');
  await expect(accent).toHaveValue('#ff8800');
  await page.getByRole('button', { name: 'Açık', exact: true }).click();
  await expect(page.locator('.desktop')).toHaveCSS('--p-background', '#1a1b26');
  await expect(
    page.getByRole('button', { name: 'Açık', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Tüm değişiklikler kaydedildi')).toBeVisible();
  await page.reload();
  await expect(accent).toHaveValue('#ff8800');
  await expect(
    page.getByRole('button', { name: 'Açık', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('textbox', { name: 'Arka plan', exact: true })
    .fill('#263345');
  await expect(page.locator('.terminal-window')).toHaveCSS(
    'background-color',
    'rgb(38, 51, 69)',
  );
  await page
    .getByRole('textbox', { name: 'Metin', exact: true })
    .fill('#abcdef');
  await expect(page.locator('.terminal-window')).toHaveCSS(
    'color',
    'rgb(171, 205, 239)',
  );
  expect(errors).toEqual([]);
});
test('presets, menu windows and icon selection work with keyboard navigation', async ({
  page,
}) => {
  await ready(page);
  await page.locator('#preset').selectOption('Catppuccin Latte');
  await expect(page.locator('.desktop')).toHaveCSS('--p-background', '#eff1f5');
  await expect(
    page.getByRole('button', { name: 'Açık', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'İkonlar', exact: true }).click();
  const icon = page.getByRole('button', { name: 'Yaru-red', exact: true });
  await icon.focus();
  await page.keyboard.press('Enter');
  await expect(icon).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.desktop')).toHaveCSS('--p-icon', '#d20f39');
  await page
    .getByRole('button', { name: 'Terminal — ~ penceresini kapat' })
    .click();
  await expect(page.locator('.terminal-window')).toHaveCount(0);
  await page.getByRole('button', { name: 'Uygulama menüsünü aç' }).click();
  await expect(page.locator('.app-menu')).toBeVisible();
  await page
    .locator('.app-menu')
    .getByRole('button', { name: 'Terminal', exact: true })
    .click();
  await expect(page.locator('.terminal-window')).toBeVisible();
  await page.locator('#preset').selectOption('Nord');
  await page.locator('#preset').selectOption('Gruvbox');
  await page.locator('#preset').selectOption('Rose Pine');
  await page.locator('#preset').selectOption('Tokyo Night');
  await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
});
test('background upload/removal, undo, IndexedDB and ZIP round trip retain original files', async ({
  page,
}) => {
  await ready(page);
  await page.getByRole('button', { name: 'Arka Planlar', exact: true }).click();
  await page.getByLabel('Arka plan dosyaları').setInputFiles(fixture);
  await expect(page.getByText('1 arka plan eklendi.')).toBeVisible();
  await expect(page.locator('.desktop-wallpaper')).toBeVisible();
  await expect(page.getByText('Tüm değişiklikler kaydedildi')).toBeVisible();
  await page.reload();
  await expect(page.locator('.desktop-wallpaper')).toBeVisible();
  await page.getByRole('button', { name: 'Arka Planlar', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'wallpaper.png arka planını seç' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'wallpaper.png arka planını kaldır' })
    .click();
  await expect(page.locator('.desktop-wallpaper')).toHaveCount(0);
  await page.getByRole('button', { name: 'Geri al', exact: true }).click();
  await expect(page.locator('.desktop-wallpaper')).toBeVisible();
  await page.getByRole('button', { name: 'Dışa Aktar' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Tema ZIP indir/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('tokyo-night.zip');
  const bytes = await readFile((await download.path())!);
  expect(unzipSync(bytes)['tokyo-night/backgrounds/wallpaper.png']).toEqual(
    new Uint8Array(await readFile(fixture)),
  );
  await page.getByLabel('Tema dosyası içe aktar').setInputFiles({
    name: 'roundtrip.zip',
    mimeType: 'application/zip',
    buffer: bytes,
  });
  await expect(
    page.getByRole('dialog', { name: 'İçe aktarma raporu' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Düzenlemeye devam et' }).click();
  await expect(page.locator('.desktop-wallpaper')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'wallpaper.png arka planını seç' }),
  ).toHaveAttribute('aria-pressed', 'true');
});
test('failed imports are atomic; root ZIP imports report excluded files; TOML export retains metadata', async ({
  page,
}) => {
  await ready(page);
  const bad = {
    name: 'bad.toml',
    mimeType: 'application/toml',
    buffer: Buffer.from('accent="#fff"'),
  };
  await page.getByLabel('Tema dosyası içe aktar').setInputFiles(bad);
  await expect(page.getByRole('alert')).toContainText('accent');
  await expect(page.getByRole('textbox', { name: /tema ad[ıI]/i })).toHaveValue(
    'Tokyo Night',
  );
  await expect(
    page.getByRole('textbox', { name: 'Vurgu', exact: true }),
  ).toHaveValue('#7aa2f7');
  await page.getByRole('button', { name: 'Dışa Aktar' }).click();
  await page.getByLabel('Tema klasörü').fill('../bad');
  await expect(
    page.getByRole('button', { name: /Tema ZIP indir/ }),
  ).toBeDisabled();
  await page.getByLabel('Tema klasörü').fill('emir-theme');
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'colors.toml indir' }).click();
  const download = await promise;
  const toml = await readFile((await download.path())!, 'utf8');
  expect(toml).toContain('"slug":"emir-theme"');
  expect(toml).toContain('mode = "dark"');
  const bytes = zipSync({
    'colors.toml': strToU8(toml),
    'icons.theme': strToU8('Yaru-red\n'),
    'shell.toml': strToU8('x = 1'),
    'config.lua': strToU8('ignored'),
  });
  await page.getByLabel('Tema dosyası içe aktar').setInputFiles({
    name: 'theme.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(bytes),
  });
  await expect(page.getByRole('dialog')).toContainText('shell.toml');
  await expect(page.getByRole('dialog')).toContainText('config.lua');
  await expect(page.getByRole('dialog')).toContainText('Yaru-red');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Geri al', exact: true }).click();
  await expect(page.locator('.desktop')).toHaveCSS('--p-icon', '#7aa2f7');
});
test('narrow layout has no overflow, keyboard buttons switch panels and preview keeps 16:9', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await expect(page.locator('.editor-panel')).toBeVisible();
  await expect(page.locator('.canvas-area')).toBeVisible();
  await expect(page.locator('.desktop')).toBeVisible();
  await page.getByRole('button', { name: 'Önizle', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.canvas-area')).toBeVisible();
  await expect(page.locator('.editor-panel')).toBeHidden();
  const box = (await page.locator('.desktop').boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'artifacts/mobile-preview.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Düzenle', exact: true }).click();
  await page.getByRole('button', { name: 'Arka Planlar', exact: true }).click();
  await page.getByLabel('Arka plan dosyaları').setInputFiles(fixture);
  await expect(page.getByText('1 arka plan eklendi.')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'artifacts/mobile-editor.png',
    fullPage: true,
  });
});
test('IndexedDB failure keeps editor usable and displays save failure', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new Error('Storage unavailable');
      },
    });
  });
  await page.goto('/');
  await page.locator('#language').selectOption('tr');
  await expect(page.getByRole('button', { name: 'Dışa Aktar' })).toBeEnabled();
  await page
    .getByRole('textbox', { name: 'Vurgu', exact: true })
    .fill('#abcdef');
  await expect(page.locator('.desktop')).toHaveCSS('--p-accent', '#abcdef');
  await expect(
    page.getByText('Kaydedilemedi · çalışmanızı dışa aktarın'),
  ).toBeVisible();
});
test('JPEG and WebP upload, filename collisions and corrupt image errors preserve the document', async ({
  page,
}) => {
  await ready(page);
  await page.getByRole('button', { name: 'Arka Planlar', exact: true }).click();
  const images = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#536587';
    ctx.fillRect(0, 0, 8, 8);
    return ['image/jpeg', 'image/webp'].map(
      (mime) => canvas.toDataURL(mime).split(',')[1],
    );
  });
  await page.getByLabel('Arka plan dosyaları').setInputFiles([
    {
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(images[0], 'base64'),
    },
    {
      name: 'photo.webp',
      mimeType: 'image/webp',
      buffer: Buffer.from(images[1], 'base64'),
    },
    {
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(images[0], 'base64'),
    },
  ]);
  await expect(page.getByText('3 arka plan eklendi.')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'photo-2.jpg arka planını seç' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'photo.webp arka planını seç' })
    .click();
  await expect(
    page.getByRole('button', { name: 'photo.webp arka planını seç' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Arka plan dosyaları').setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from('broken'),
  });
  await expect(page.getByRole('alert')).toContainText('broken.png');
  await expect(page.locator('.background-card')).toHaveCount(3);
  await expect(
    page.getByRole('button', { name: 'photo.webp arka planını seç' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Yalnızca tema rengi' }).click();
  await expect(page.locator('.desktop-wallpaper')).toHaveCount(0);
});
