import { parse, stringify } from 'smol-toml';
import { strFromU8, strToU8, zip } from 'fflate';
import {
  assertSlug,
  iconSets,
  MAX_BYTES,
  slugify,
  type ThemeDocument,
  type IconSet,
} from './model';
import { resolvePalette } from './resolve';
import { imageMime, verifyImage } from './images';
import { assertSafePath, unzipBounded } from './zip';
export { assertSafePath, unzipBounded } from './zip';
export interface ImportResult {
  theme: ThemeDocument;
  ignored: string[];
  warnings: string[];
}
const METADATA = '# omarchy-theme-editor: ';
export function importToml(
  text: string,
  fallbackName = 'İçe Aktarılan Tema',
): ImportResult {
  if (strToU8(text).length > 1024 * 1024)
    throw new Error('colors.toml en fazla 1 MB olabilir.');
  let raw: Record<string, unknown>;
  try {
    raw = parse(text, { unsafeKeyBehaviour: 'throw' });
  } catch (error) {
    throw new Error(
      `TOML okunamadı: ${error instanceof Error ? error.message : 'bozuk dosya'}`,
    );
  }
  const { palette, mode, ignored } = resolvePalette(raw);
  let meta: Record<string, unknown> = {};
  const line = text.split(/\r?\n/).find((line) => line.startsWith(METADATA));
  if (line) {
    try {
      const parsed: unknown = JSON.parse(line.slice(METADATA.length));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error();
      meta = parsed as Record<string, unknown>;
    } catch {
      throw new Error('Editör metadata bilgisi okunamadı.');
    }
  }
  const name =
    typeof meta.name === 'string' && meta.name.trim()
      ? meta.name.slice(0, 100)
      : fallbackName;
  const slug = typeof meta.slug === 'string' ? meta.slug : slugify(name);
  assertSlug(slug);
  if (meta.iconSet !== undefined && !iconSets.includes(meta.iconSet as IconSet))
    throw new Error('Metadata içinde desteklenmeyen ikon seti.');
  return {
    theme: {
      version: 1,
      name,
      slug,
      mode,
      palette,
      iconSet: (meta.iconSet as IconSet) ?? 'Yaru',
      backgrounds: [],
      activeBackground:
        typeof meta.activeBackground === 'string'
          ? meta.activeBackground
          : null,
    },
    ignored: ignored.map((key) => `colors.toml → ${key}`),
    warnings: [],
  };
}
export function exportToml(theme: ThemeDocument): string {
  assertSlug(theme.slug);
  const meta = {
    name: theme.name,
    slug: theme.slug,
    iconSet: theme.iconSet,
    activeBackground:
      theme.backgrounds.find((b) => b.id === theme.activeBackground)?.name ??
      null,
  };
  return (
    '# Omarchy colors.toml\n' +
    METADATA +
    JSON.stringify(meta) +
    '\n\n' +
    stringify({ mode: theme.mode, ...theme.palette }) +
    '\n'
  );
}
export async function importZip(bytes: Uint8Array): Promise<ImportResult> {
  const entries = await unzipBounded(bytes);
  const candidates = [...entries.keys()].filter((path) =>
    /^(?:[^/]+\/)?colors\.toml$/.test(path),
  );
  if (candidates.length !== 1)
    throw new Error(
      'ZIP kökünde veya tek tema klasöründe tam bir colors.toml bulunmalı.',
    );
  const colorsPath = candidates[0];
  const prefix = colorsPath.slice(0, -'colors.toml'.length);
  const result = importToml(
    strFromU8(entries.get(colorsPath)!),
    prefix ? prefix.slice(0, -1) : 'İçe Aktarılan Tema',
  );
  const used = new Set([colorsPath]);
  const iconPath = `${prefix}icons.theme`;
  if (entries.has(iconPath)) {
    const icon = strFromU8(entries.get(iconPath)!).trim();
    used.add(iconPath);
    if (iconSets.includes(icon as IconSet))
      result.theme.iconSet = icon as IconSet;
    else
      result.warnings.push(
        `"${icon}" ikon seti desteklenmiyor; ${result.theme.iconSet} kullanıldı.`,
      );
  }
  const activeName = result.theme.activeBackground;
  for (const [path, data] of entries) {
    if (!path.startsWith(`${prefix}backgrounds/`) || !imageMime(path)) continue;
    const name = path.slice(`${prefix}backgrounds/`.length);
    // Keep nested image names and original bytes intact on re-export.
    const mime = verifyImage(data, path);
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(
        new Blob([data], { type: mime }),
      ).catch(() => {
        throw new Error(`${path}: görsel okunamadı.`);
      });
      bitmap.close();
    }
    result.theme.backgrounds.push({
      id: path,
      name,
      blob: new Blob([data], { type: mime }),
    });
    used.add(path);
  }
  const hasMetadata = strFromU8(entries.get(colorsPath)!)
    .split(/\r?\n/)
    .some((line) => line.startsWith(METADATA));
  result.theme.activeBackground =
    hasMetadata && activeName === null
      ? null
      : (result.theme.backgrounds.find((b) => b.name === activeName)?.id ??
        result.theme.backgrounds[0]?.id ??
        null);
  result.ignored.push(...[...entries.keys()].filter((path) => !used.has(path)));
  return result;
}
export async function importFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_BYTES) throw new Error('Dosya 100 MB sınırını aşıyor.');
  if (/\.zip$/i.test(file.name))
    return importZip(new Uint8Array(await file.arrayBuffer()));
  if (/\.toml$/i.test(file.name)) {
    if (file.size > 1024 * 1024)
      throw new Error('colors.toml en fazla 1 MB olabilir.');
    const result = importToml(
      await file.text(),
      file.name.replace(/\.toml$/i, '') === 'colors'
        ? 'İçe Aktarılan Tema'
        : file.name.replace(/\.toml$/i, ''),
    );
    result.theme.activeBackground = null;
    return result;
  }
  throw new Error('Bir .toml veya .zip dosyası seçin.');
}
export async function exportZip(
  theme: ThemeDocument,
): Promise<Uint8Array<ArrayBuffer>> {
  assertSlug(theme.slug);
  const files: Record<string, Uint8Array> = Object.create(null);
  files[`${theme.slug}/colors.toml`] = strToU8(exportToml(theme));
  files[`${theme.slug}/icons.theme`] = strToU8(theme.iconSet + '\n');
  let size = Object.values(files).reduce((sum, data) => sum + data.length, 0);
  for (const background of theme.backgrounds) {
    const path = `${theme.slug}/backgrounds/${background.name}`;
    assertSafePath(path);
    if (files[path]) throw new Error('Yinelenen arka plan dosya adı.');
    size += background.blob.size;
    if (size > MAX_BYTES)
      throw new Error('Tema içeriği 100 MB sınırını aşıyor.');
    files[path] = new Uint8Array(await background.blob.arrayBuffer());
  }
  return new Promise((resolve, reject) =>
    zip(files, { level: 1 }, (error, data) =>
      error ? reject(error) : resolve(data),
    ),
  );
}
export function download(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
