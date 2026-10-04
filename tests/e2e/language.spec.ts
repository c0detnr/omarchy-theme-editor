import { test, expect } from '@playwright/test';

test('defaults to English and remembers language without changing the theme', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByRole('button', { name: 'Export', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('#language')).toHaveValue('en');
  await expect(page.locator('#language option')).toHaveText([
    '🇬🇧 English',
    '🇹🇷 Türkçe',
  ]);
  await page
    .getByRole('textbox', { name: 'Accent', exact: true })
    .fill('#123456');
  await page.locator('#language').selectOption('tr');
  await expect(
    page.getByRole('button', { name: 'Dışa Aktar', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Vurgu', exact: true }),
  ).toHaveValue('#123456');
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page.getByText('Tüm değişiklikler kaydedildi')).toBeVisible();
  await page.reload();
  await expect(page.locator('#language')).toHaveValue('tr');
  await page.locator('#language').selectOption('en');
  await page.getByLabel('Import theme file').setInputFiles({
    name: 'invalid.toml',
    mimeType: 'application/toml',
    buffer: Buffer.from('accent="#fff"'),
  });
  await expect(page.getByRole('alert')).toContainText(
    'a valid #RRGGBB color is required',
  );
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Export your theme' }),
  ).toBeVisible();
  await page.getByLabel('Theme folder', { exact: true }).fill('../bad');
  await expect(page.getByText(/Folder names must be/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Download theme ZIP/ }),
  ).toBeDisabled();
});

test('language selector and translated panels fit mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  for (const language of ['en', 'tr']) {
    await page.locator('#language').selectOption(language);
    await expect(page.locator('#language')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/language-mobile-${language}.png`,
      fullPage: true,
    });
  }
});
