import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { newTheme } from '../src/theme/presets';
import { loadTheme, saveTheme } from '../src/theme/storage';
describe('IndexedDB', () => {
  it('persists document and original background Blobs', async () => {
    expect(await loadTheme()).toBeNull();
    const theme = {
      ...newTheme(),
      mode: 'light' as const,
      name: 'Saved',
      backgrounds: [
        {
          id: 'bg',
          name: 'bg.png',
          blob: new Blob(['original image bytes'], { type: 'image/png' }),
        },
      ],
      activeBackground: 'bg',
    };
    await saveTheme(theme);
    const restored = (await loadTheme())!;
    expect(restored.palette).toEqual(theme.palette);
    expect(restored.mode).toBe('light');
    expect(restored.name).toBe('Saved');
    expect(restored.activeBackground).toBe('bg');
    expect(await restored.backgrounds[0].blob.text()).toBe(
      'original image bytes',
    );
  });
  it('rejects an invalid saved document instead of poisoning the editor', async () => {
    await saveTheme({ ...newTheme(), version: 2 } as unknown as ReturnType<
      typeof newTheme
    >);
    await expect(loadTheme()).rejects.toThrow('okunamadı');
  });
});
