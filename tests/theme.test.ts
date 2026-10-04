import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { zipSync, strToU8, unzipSync, strFromU8 } from 'fflate';
import { colorKeys, MAX_BYTES, assertSlug, slugify } from '../src/theme/model';
import { newTheme, presets } from '../src/theme/presets';
import { resolvePalette } from '../src/theme/resolve';
import {
  exportToml,
  importToml,
  exportZip,
  importZip,
  unzipBounded,
} from '../src/theme/io';
import { historyReducer } from '../src/theme/history';
import { uniqueName, verifyImage } from '../src/theme/images';
const png = new Uint8Array(readFileSync('tests/fixtures/wallpaper.png'));
const minimal = {
  accent: '#123456',
  background: '#202020',
  foreground: '#dddddd',
  red: '#ff0000',
  green: '#00ff00',
  yellow: '#ffff00',
  blue: '#0000ff',
  magenta: '#ff00ff',
  cyan: '#00ffff',
};
const archive = (files: Record<string, Uint8Array>) => zipSync(files);
describe('Omarchy resolution', () => {
  it('loads all official palettes', () => {
    for (const preset of presets)
      expect(
        colorKeys.every((key) => /^#[\da-f]{6}$/.test(preset.palette[key])),
      ).toBe(true);
  });
  it('derives the same shades and metadata as the resolver', () => {
    const { palette, mode } = resolvePalette(minimal);
    expect(palette.dark_background).toBe('#181818');
    expect(palette.darker_background).toBe('#101010');
    expect(palette.bright_red).toBe('#ff3333');
    expect(palette.brown).toBe('#808000');
    expect(palette.lighter_background).toBe('#202020');
    expect(palette.selection).toBe('#202020');
    expect(palette.bright_foreground).toBe('#dddddd');
    expect(mode).toBe('dark');
  });
  it('converts complete ANSI and short-name palettes with canonical precedence', () => {
    const raw = Object.fromEntries(
      Array.from({ length: 16 }, (_, i) => [`color${i}`, '#123456']),
    );
    const { palette } = resolvePalette({
      ...raw,
      accent: '#ffffff',
      bg: '#242424',
      background: '#202020',
      fg: '#cccccc',
      dark_bg: '#101010',
      bright_fg: '#eeeeee',
      purple: '#abcdef',
    });
    expect(palette.background).toBe('#202020');
    expect(palette.lighter_background).toBe('#202020');
    expect(palette.foreground).toBe('#cccccc');
    expect(palette.light_foreground).toBe('#cccccc');
    expect(palette.dark_background).toBe('#101010');
    expect(palette.bright_foreground).toBe('#eeeeee');
    expect(palette.magenta).toBe('#123456');
    expect(palette.muted).toBe('#123456');
  });
  it('accepts purple aliases and infers light mode exactly by channel sum', () => {
    const { magenta: _, ...raw } = minimal;
    expect(
      resolvePalette({ ...raw, purple: '#AABBCC', background: '#ffffff' })
        .palette.magenta,
    ).toBe('#aabbcc');
    expect(resolvePalette({ ...minimal, background: '#ffffff' }).mode).toBe(
      'light',
    );
    expect(
      resolvePalette({ ...minimal, background: '#ffffff', mode: 'dark' }).mode,
    ).toBe('dark');
  });
  it('rejects invalid values even in a shadowed alias, absent required fields and invalid modes', () => {
    expect(() => resolvePalette({ ...minimal, bg: '#fff' })).toThrow('bg');
    expect(() => resolvePalette({ ...minimal, red: 42 })).toThrow('red');
    expect(() => resolvePalette({ background: '#ffffff' })).toThrow('accent');
    expect(() => resolvePalette({ ...minimal, mode: 'auto' })).toThrow('mode');
  });
});
describe('TOML and ZIP', () => {
  it('round trips palette, mode, name, slug and icon through real TOML', () => {
    const theme = {
      ...newTheme(),
      name: 'Emir’in Teması',
      slug: 'emir-c++',
      mode: 'light' as const,
      iconSet: 'Yaru-red' as const,
    };
    expect(importToml(exportToml(theme)).theme).toEqual(theme);
    expect(
      importToml(
        "# comment\nmode = 'dark'\n" +
          Object.entries(minimal)
            .map(([k, v]) => `${k} = '${v}' # comment`)
            .join('\n'),
      ).theme.palette.accent,
    ).toBe('#123456');
  });
  it('rejects malformed TOML, unsafe keys and invalid colors', () => {
    expect(() => importToml('accent = "#123456')).toThrow('TOML');
    expect(() => importToml('accent = "#fff"')).toThrow('accent');
    expect(() => importToml('__proto__.foo = "bar"')).toThrow('TOML');
    expect(() => importToml('a = 1\na = 2')).toThrow('TOML');
  });
  it('round trips selected backgrounds, original bytes, icons and light mode in a theme folder', async () => {
    const theme = {
      ...newTheme(),
      mode: 'light' as const,
      iconSet: 'Yaru-magenta' as const,
      backgrounds: [
        {
          id: 'test',
          name: 'görsel.png',
          blob: new Blob([png], { type: 'image/png' }),
        },
      ],
      activeBackground: 'test',
    };
    const bytes = await exportZip(theme);
    const files = unzipSync(bytes);
    expect(Object.keys(files)).toEqual([
      'tokyo-night/colors.toml',
      'tokyo-night/icons.theme',
      'tokyo-night/backgrounds/görsel.png',
    ]);
    expect(strFromU8(files['tokyo-night/icons.theme']).trim()).toBe(
      'Yaru-magenta',
    );
    const result = await importZip(bytes);
    expect(result.theme.palette).toEqual(theme.palette);
    expect(result.theme.mode).toBe('light');
    expect(result.theme.iconSet).toBe(theme.iconSet);
    expect(result.theme.backgrounds[0].name).toBe('görsel.png');
    expect(result.theme.activeBackground).toBe(result.theme.backgrounds[0].id);
    expect(
      new Uint8Array(await result.theme.backgrounds[0].blob.arrayBuffer()),
    ).toEqual(png);
    expect(result.ignored).toEqual([]);
  });
  it('preserves the plain background selection with uploaded files present', async () => {
    const theme = {
      ...newTheme(),
      backgrounds: [{ id: 'x', name: 'x.png', blob: new Blob([png]) }],
      activeBackground: null,
    };
    expect(
      (await importZip(await exportZip(theme))).theme.activeBackground,
    ).toBeNull();
  });
  it('imports root ZIPs and reports unsupported files/fields and unknown icons', async () => {
    const bytes = archive({
      'colors.toml': strToU8(
        exportToml(newTheme()) + 'extra_key = "ignored"\n',
      ),
      'icons.theme': strToU8('Unknown'),
      'shell.toml': strToU8('x=1'),
      'app.lua': strToU8('return {}'),
      'backgrounds/readme.txt': strToU8('notes'),
    });
    const result = await importZip(bytes);
    expect(result.ignored).toContain('colors.toml → extra_key');
    expect(result.ignored).toContain('shell.toml');
    expect(result.ignored).toContain('app.lua');
    expect(result.ignored).toContain('backgrounds/readme.txt');
    expect(result.warnings).toHaveLength(1);
    expect(result.theme.iconSet).toBe('Yaru-blue');
  });
  it('rejects ambiguous palettes and nested or missing colors.toml', async () => {
    await expect(
      importZip(
        archive({
          'a/colors.toml': strToU8(exportToml(newTheme())),
          'b/colors.toml': strToU8(exportToml(newTheme())),
        }),
      ),
    ).rejects.toThrow('tam bir');
    await expect(
      importZip(
        archive({ 'a/b/colors.toml': strToU8(exportToml(newTheme())) }),
      ),
    ).rejects.toThrow('tam bir');
  });
  it.each([
    '../outside',
    '/absolute',
    'C:/x',
    'a/../x',
    'a/./x',
    'a\\x',
    'a//x',
  ])('rejects path traversal anywhere: %s', async (path) => {
    await expect(
      importZip(
        archive({
          'colors.toml': strToU8(exportToml(newTheme())),
          [path]: strToU8('no'),
        }),
      ),
    ).rejects.toThrow('güvenli olmayan');
  });
  it('rejects compressed oversized content before expansion, counting ignored files', async () => {
    const bytes = archive({
      'ignored.txt': new Uint8Array(50000),
      'colors.toml': strToU8(exportToml(newTheme())),
    });
    await expect(unzipBounded(bytes, 40000)).rejects.toThrow('sınır');
    const declared = archive({
      'colors.toml': strToU8(exportToml(newTheme())),
    });
    const view = new DataView(declared.buffer);
    let central = 0;
    for (; central < declared.length - 4; central++)
      if (view.getUint32(central, true) === 0x02014b50) break;
    view.setUint32(central + 24, MAX_BYTES + 1, true);
    await expect(importZip(declared)).rejects.toThrow('100 MB');
  });
  it('rejects truncated and corrupted stored archives', async () => {
    const bytes = zipSync(
      { 'colors.toml': strToU8(exportToml(newTheme())) },
      { level: 0 },
    );
    await expect(
      importZip(bytes.subarray(0, bytes.length - 22)),
    ).rejects.toThrow('ZIP');
    const corrupt = bytes.slice();
    const view = new DataView(corrupt.buffer);
    const dataStart = 30 + view.getUint16(26, true) + view.getUint16(28, true);
    corrupt[dataStart] ^= 1;
    await expect(importZip(corrupt)).rejects.toThrow('bütünlük');
  });
});
describe('History and filenames', () => {
  it('undoes and redoes edits and background changes, grouping a picker gesture', () => {
    const theme = newTheme();
    let state = { past: [], present: theme, future: [] } as Parameters<
      typeof historyReducer
    >[0];
    state = historyReducer(state, {
      type: 'change',
      group: 'picker',
      update: (t) => ({ ...t, palette: { ...t.palette, accent: '#111111' } }),
    });
    state = historyReducer(state, {
      type: 'change',
      group: 'picker',
      update: (t) => ({ ...t, palette: { ...t.palette, accent: '#222222' } }),
    });
    expect(state.past).toHaveLength(1);
    state = historyReducer(state, { type: 'undo' });
    expect(state.present).toEqual(theme);
    state = historyReducer(state, { type: 'redo' });
    expect(state.present.palette.accent).toBe('#222222');
    state = historyReducer(state, {
      type: 'change',
      update: (t) => ({
        ...t,
        backgrounds: [{ id: 'x', name: 'x.png', blob: new Blob([png]) }],
        activeBackground: 'x',
      }),
    });
    state = historyReducer(state, { type: 'undo' });
    expect(state.present.backgrounds).toHaveLength(0);
    state = historyReducer(state, { type: 'redo' });
    expect(state.present.backgrounds[0].blob.size).toBe(png.length);
    state = historyReducer(state, { type: 'undo' });
    state = historyReducer(state, {
      type: 'change',
      update: (t) => ({ ...t, mode: 'light' }),
    });
    expect(state.future).toHaveLength(0);
  });
  it('validates Omarchy slugs and translates Turkish display names', () => {
    expect(slugify('İstanbul Gecesi')).toBe('istanbul-gecesi');
    for (const slug of ['c++', '_theme', 'flexoki_light', 'a.b-1', '123'])
      expect(() => assertSlug(slug)).not.toThrow();
    for (const slug of ['', '.hidden', '-theme', 'ç', 'a/b', 'a b', 'UPPER'])
      expect(() => assertSlug(slug)).toThrow();
    expect(uniqueName('test.png', ['test.png', 'test-2.png'])).toBe(
      'test-3.png',
    );
    expect(() => verifyImage(strToU8('not an image'), 'image.png')).toThrow();
  });
});
