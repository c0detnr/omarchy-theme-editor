import { parse } from 'smol-toml';
import { resolvePalette } from './resolve';
import { slugify, type ThemeDocument, type IconSet } from './model';
import tokyo from './palettes/tokyo-night.toml?raw';
import latte from './palettes/catppuccin-latte.toml?raw';
import nord from './palettes/nord.toml?raw';
import gruvbox from './palettes/gruvbox.toml?raw';
import rose from './palettes/rose-pine.toml?raw';
export const presets = [
  { name: 'Tokyo Night', text: tokyo, icon: 'Yaru-blue' },
  { name: 'Catppuccin Latte', text: latte, icon: 'Yaru-purple' },
  { name: 'Nord', text: nord, icon: 'Yaru-blue' },
  { name: 'Gruvbox', text: gruvbox, icon: 'Yaru-olive' },
  { name: 'Rose Pine', text: rose, icon: 'Yaru-sage' },
].map((p) => {
  const { palette, mode } = resolvePalette(parse(p.text));
  return {
    version: 1,
    name: p.name,
    slug: slugify(p.name),
    mode,
    palette,
    iconSet: p.icon as IconSet,
    backgrounds: [],
    activeBackground: null,
  } satisfies ThemeDocument;
});
export const newTheme = (): ThemeDocument => structuredClone(presets[0]);
