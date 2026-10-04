import { colorKeys, HEX, mixColor, type Palette, type Mode } from './model';
const aliases: Record<string, string> = {
  background: 'bg',
  dark_background: 'dark_bg',
  darker_background: 'darker_bg',
  lighter_background: 'lighter_bg',
  foreground: 'fg',
  dark_foreground: 'dark_fg',
  light_foreground: 'light_fg',
  bright_foreground: 'bright_fg',
};
const ansi: Record<string, string> = {
  red: 'color1',
  green: 'color2',
  yellow: 'color3',
  blue: 'color4',
  magenta: 'color5',
  cyan: 'color6',
  bright_red: 'color9',
  bright_green: 'color10',
  bright_yellow: 'color11',
  bright_blue: 'color12',
  bright_magenta: 'color13',
  bright_cyan: 'color14',
};
const recognized = new Set<string>([
  ...colorKeys,
  ...Object.values(aliases),
  ...Array.from({ length: 16 }, (_, i) => `color${i}`),
  'purple',
  'bright_purple',
  'cursor',
]);
export function resolvePalette(raw: Record<string, unknown>): {
  palette: Palette;
  mode: Mode;
  ignored: string[];
} {
  const c: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!recognized.has(key)) continue;
    if (typeof value !== 'string' || !HEX.test(value))
      throw new Error(`${key}: geçerli bir #RRGGBB rengi gerekli.`);
    c[key] = value.toLowerCase();
  }
  const fallback = (key: string, value: string | undefined) => {
    if (!c[key] && value) c[key] = value;
  };
  for (const [key, alias] of Object.entries(aliases)) fallback(key, c[alias]);
  fallback('background', c.color0);
  fallback('foreground', c.color7);
  // Omarchy overwrites these before it derives the remaining semantic shades.
  if (c.background) c.color0 = c.background;
  if (c.foreground) c.color7 = c.foreground;
  for (const [key, alias] of Object.entries(ansi)) fallback(key, c[alias]);
  fallback('magenta', c.purple);
  fallback('bright_magenta', c.bright_purple);
  for (const key of [
    'accent',
    'background',
    'foreground',
    'red',
    'green',
    'yellow',
    'blue',
    'magenta',
    'cyan',
  ]) {
    if (!c[key]) throw new Error(`Gerekli renk çözümlenemedi: ${key}.`);
  }
  fallback('light_foreground', c.color7 || c.foreground);
  fallback('bright_foreground', c.color15 || c.foreground);
  fallback('lighter_background', c.color0 || c.background);
  fallback('dark_foreground', c.color8 || c.foreground);
  fallback('muted', c.color8 || c.dark_foreground);
  fallback(
    'selection',
    c.selection_background || c.color8 || c.color0 || c.background,
  );
  fallback('selection_background', c.selection);
  fallback('selection_foreground', c.bright_foreground);
  fallback('orange', c.yellow);
  fallback('brown', mixColor(c.orange, '#000000', 0.5));
  fallback('dark_background', mixColor(c.background, '#000000', 0.25));
  fallback('darker_background', mixColor(c.background, '#000000', 0.5));
  for (const key of ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'])
    fallback(`bright_${key}`, mixColor(c[key], '#ffffff', 0.2));
  const specified = raw.mode ?? raw.theme_type;
  if (specified !== undefined && specified !== 'light' && specified !== 'dark')
    throw new Error('mode yalnızca "light" veya "dark" olabilir.');
  const brightness = [1, 3, 5].reduce(
    (sum, i) => sum + parseInt(c.background.slice(i, i + 2), 16),
    0,
  );
  return {
    palette: Object.fromEntries(
      colorKeys.map((key) => [key, c[key]]),
    ) as Palette,
    mode: (specified as Mode) ?? (brightness > 382 ? 'light' : 'dark'),
    ignored: Object.keys(raw).filter(
      (key) => !recognized.has(key) && !['mode', 'theme_type'].includes(key),
    ),
  };
}
