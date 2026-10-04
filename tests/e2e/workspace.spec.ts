import { test, expect } from '@playwright/test';

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`lower palette edits keep live preview and group navigation visible at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#language').selectOption('tr');
    await expect(
      page.getByRole('button', { name: 'Dışa Aktar' }),
    ).toBeEnabled();
    const desktop = page.locator('.desktop');
    const originalBounds = (await desktop.boundingBox())!;
    const nav = page.getByRole('navigation', { name: 'Renk grupları' });
    await nav.getByRole('button', { name: 'Terminal paleti' }).click();
    await expect(
      page.locator('details[data-color-group="terminal"]'),
    ).toHaveAttribute('open', '');
    const lastField = page
      .locator('details[data-color-group="terminal"] .color-field')
      .last();
    const key = (await lastField.locator('small').textContent())!.replaceAll(
      '_',
      '-',
    );
    await lastField.getByRole('textbox').fill('#123456');
    await expect(desktop).toHaveCSS(`--p-${key}`, '#123456');
    const editedBounds = (await desktop.boundingBox())!;
    expect(editedBounds.y).toBeCloseTo(originalBounds.y, 1);
    expect(editedBounds.y + editedBounds.height).toBeLessThanOrEqual(
      viewport.height,
    );
    await expect(nav).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(
      await page.locator('.panel-body').evaluate((el) => el.scrollTop),
    ).toBeGreaterThan(0);
    await nav.getByRole('button', { name: 'Temel renkler' }).focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('textbox', { name: 'Vurgu', exact: true }),
    ).toBeInViewport();
    await page.locator('#language').selectOption('en');
    await expect(
      page.getByRole('navigation', { name: 'Color groups' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Terminal palette', exact: true }),
    ).toBeVisible();
  });
}
