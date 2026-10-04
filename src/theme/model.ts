export const colorKeys = [
  'accent',
  'selection',
  'muted',
  'background',
  'dark_background',
  'darker_background',
  'lighter_background',
  'foreground',
  'dark_foreground',
  'light_foreground',
  'bright_foreground',
  'red',
  'yellow',
  'orange',
  'green',
  'cyan',
  'blue',
  'magenta',
  'brown',
  'bright_red',
  'bright_yellow',
  'bright_green',
  'bright_cyan',
  'bright_blue',
  'bright_magenta',
  'selection_background',
  'selection_foreground',
] as const;
export type ColorKey = (typeof colorKeys)[number];
export type Palette = Record<ColorKey, string>;
export const iconSets = [
  'Yaru',
  'Yaru-blue',
  'Yaru-dark',
  'Yaru-magenta',
  'Yaru-olive',
  'Yaru-prussiangreen',
  'Yaru-purple',
  'Yaru-red',
  'Yaru-sage',
  'Yaru-wartybrown',
  'Yaru-yellow',
] as const;
export type IconSet = (typeof iconSets)[number];
export type Mode = 'light' | 'dark';
export interface Background {
  id: string;
  name: string;
  blob: Blob;
}
export interface ThemeDocument {
  version: 1;
  name: string;
  slug: string;
  mode: Mode;
  palette: Palette;
  backgrounds: Background[];
  activeBackground: string | null;
  iconSet: IconSet;
}
export const HEX = /^#[\da-f]{6}$/i;
export const SLUG = /^[a-z0-9_][a-z0-9._+-]*$/;
export const MAX_BYTES = 100 * 1024 * 1024;
export function slugify(name: string) {
  return (
    name
      .replace(/ı/g, 'i')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9._+-]+/g, '-')
      .replace(/^[^a-z0-9_]+/, '')
      .replace(/-+$/, '') || 'benim-temam'
  );
}
export function assertSlug(slug: string) {
  if (!SLUG.test(slug) || slug.length > 100)
    throw new Error(
      'Klasör adı 1–100 karakter olmalı; harf, rakam veya _ ile başlamalı. Yalnızca a–z, 0–9, . _ + - kullanın.',
    );
}
export function mixColor(start: string, end: string, amount: number) {
  return (
    '#' +
    [1, 3, 5]
      .map((i) =>
        Math.round(
          parseInt(start.slice(i, i + 2), 16) * (1 - amount) +
            parseInt(end.slice(i, i + 2), 16) * amount,
        )
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
export const ansiKeys: ColorKey[] = [
  'background',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'foreground',
  'muted',
  'bright_red',
  'bright_green',
  'bright_yellow',
  'bright_blue',
  'bright_magenta',
  'bright_cyan',
  'bright_foreground',
];
