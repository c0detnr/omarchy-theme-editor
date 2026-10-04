import { test, expect, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.goto('/');
  await page.locator('#language').selectOption('tr');
  await expect(page.getByRole('button', { name: 'Dışa Aktar' })).toBeEnabled();
  await expect(page.getByText('Tüm değişiklikler kaydedildi')).toBeVisible();
}

test('custom picker updates live, groups drag history and supports palette, HEX and keyboard dismissal', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await ready(page);
  await expect(page.locator('input[type="color"]')).toHaveCount(0);
  const trigger = page.getByRole('button', {
    name: 'Vurgu renk seçici',
    exact: true,
  });
  const picker = page.getByRole('dialog', {
    name: 'Vurgu renk seçici',
    exact: true,
  });
  const accent = page.getByRole('textbox', { name: 'Vurgu', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(picker).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const saturation = picker.getByRole('slider', {
    name: 'Doygunluk ve parlaklık',
  });
  await expect(saturation).toBeFocused();
  await page.screenshot({
    path: 'artifacts/color-picker-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });

  await page.keyboard.press('ArrowRight');
  await expect(accent).not.toHaveValue('#7aa2f7');
  await page.keyboard.press('Control+z');
  await expect(accent).toHaveValue('#7aa2f7');

  const box = (await saturation.boundingBox())!;
  async function drag(fromX: number, fromY: number, toX: number, toY: number) {
    await page.mouse.move(
      box.x + box.width * fromX,
      box.y + box.height * fromY,
    );
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * toX, box.y + box.height * toY, {
      steps: 8,
    });
    await page.mouse.up();
  }
  await drag(0.3, 0.3, 0.7, 0.2);
  await expect(accent).not.toHaveValue('#7aa2f7');
  const first = await accent.inputValue();
  await drag(0.7, 0.2, 0.4, 0.65);
  await expect(accent).not.toHaveValue(first);
  await page.keyboard.press('Control+z');
  await expect(accent).toHaveValue(first);
  await page.keyboard.press('Control+z');
  await expect(accent).toHaveValue('#7aa2f7');

  await picker
    .getByRole('button', { name: 'Yeşil: #9ece6a', exact: true })
    .click();
  await expect(accent).toHaveValue('#9ece6a');
  await expect(page.locator('.desktop')).toHaveCSS('--p-accent', '#9ece6a');
  await picker
    .getByRole('button', { name: 'Başlangıç rengine dön: #7aa2f7' })
    .click();
  await expect(accent).toHaveValue('#7aa2f7');

  const hex = picker.getByRole('textbox', { name: 'Vurgu HEX' });
  await hex.fill('#bad');
  await expect(hex).toHaveAttribute('aria-invalid', 'true');
  await expect(picker.getByText('#RRGGBB biçimini kullanın.')).toBeVisible();
  await expect(page.locator('.desktop')).toHaveCSS('--p-accent', '#7aa2f7');
  await hex.fill('#ABCDEF');
  await expect(accent).toHaveValue('#abcdef');
  await expect(page.locator('.desktop')).toHaveCSS('--p-accent', '#abcdef');
  await page.keyboard.press('Enter');
  await expect(picker).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page
    .getByRole('button', { name: 'Arka plan renk seçici', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await expect(picker).toBeHidden();
  await expect(
    page.getByRole('dialog', { name: 'Arka plan renk seçici', exact: true }),
  ).toBeVisible();
  await page.getByText('Önizleme', { exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('picker fits narrow screens, follows resize, supports touch and opens above lower fields', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await ready(page);
  const trigger = page.getByRole('button', {
    name: 'Vurgu renk seçici',
    exact: true,
  });
  await trigger.tap();
  const picker = page.getByRole('dialog', {
    name: 'Vurgu renk seçici',
    exact: true,
  });
  await expect(picker).toBeVisible();
  await page.screenshot({
    path: 'artifacts/color-picker-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  const accent = page.getByRole('textbox', { name: 'Vurgu', exact: true });
  const saturation = picker.getByRole('slider', {
    name: 'Doygunluk ve parlaklık',
  });
  await saturation.tap({ position: { x: 120, y: 60 } });
  await expect(accent).not.toHaveValue('#7aa2f7');
  await picker.getByRole('button', { name: 'Renk seçiciyi kapat' }).tap();
  await expect(picker).toBeHidden();
  await expect(trigger).toBeFocused();

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await trigger.tap();
    await expect(picker).toBeVisible();
    const box = (await picker.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(11);
    expect(box.x + box.width).toBeLessThanOrEqual(width - 11);
    expect(box.y).toBeGreaterThanOrEqual(11);
    expect(box.y + box.height).toBeLessThanOrEqual(833);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press('Escape');
  }

  await page.locator('summary').filter({ hasText: 'Terminal paleti' }).click();
  const lastTrigger = page.locator('.color-trigger').last();
  await lastTrigger.scrollIntoViewIfNeeded();
  await lastTrigger.tap();
  const lowerPicker = page.getByRole('dialog');
  await expect(lowerPicker).toBeVisible();
  const lowerBox = (await lowerPicker.boundingBox())!;
  const triggerBox = (await lastTrigger.boundingBox())!;
  expect(lowerBox.y + lowerBox.height).toBeLessThanOrEqual(triggerBox.y);
  await page.setViewportSize({ width: 320, height: 480 });
  await expect(lowerPicker).toBeVisible();
  await expect
    .poll(async () => {
      const shortBox = (await lowerPicker.boundingBox())!;
      return shortBox.y + shortBox.height;
    })
    .toBeLessThanOrEqual(469);
  expect((await lowerPicker.boundingBox())!.y).toBeGreaterThanOrEqual(11);
  await context.close();
});
