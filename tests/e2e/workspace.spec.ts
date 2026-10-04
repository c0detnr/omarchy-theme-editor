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
      page.getByRole('region', { name: 'Terminal paleti' }),
    ).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Temel renkler' }),
    ).toBeHidden();
    const lastField = page
      .locator('[data-color-group="terminal"] .color-field')
      .last();
    await lastField.scrollIntoViewIfNeeded();
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
    await expect(
      page.getByRole('region', { name: 'Terminal paleti' }),
    ).toBeHidden();
    await nav.getByRole('button', { name: 'Yüzeyler ve metin' }).click();
    await page
      .getByRole('textbox', { name: 'Koyu yüzey', exact: true })
      .fill('#654321');
    await expect(desktop).toHaveCSS('--p-dark-background', '#654321');
    await nav.getByRole('button', { name: 'Terminal paleti' }).click();
    await expect(lastField.getByRole('textbox')).toHaveValue('#123456');
    await page.locator('#language').selectOption('en');
    await expect(
      page.getByRole('navigation', { name: 'Color groups' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Terminal palette', exact: true }),
    ).toBeVisible();
    if (viewport.width > 760) {
      expect(originalBounds.height).toBeGreaterThan(480);
      expect(originalBounds.width).toBeGreaterThan(880);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(desktop).toBeVisible();
      await expect(page.locator('.terminal-window')).toBeVisible();
      await page.setViewportSize(viewport);
      await page
        .getByRole('button', { name: 'colors.toml', exact: true })
        .click();
      await expect(page.locator('.source-panel')).toBeVisible();
      await page.getByRole('button', { name: 'Desktop', exact: true }).click();
      await expect(desktop).toBeVisible();
      await expect(page.locator('.terminal-window')).toBeVisible();
    }
  });
}
