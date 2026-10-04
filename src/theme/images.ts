import { MAX_BYTES, type Background } from './model';
export function imageMime(name: string): string | undefined {
  const ext = name.split('.').pop()?.toLowerCase();
  return ext === 'png'
    ? 'image/png'
    : ext === 'jpg' || ext === 'jpeg'
      ? 'image/jpeg'
      : ext === 'webp'
        ? 'image/webp'
        : undefined;
}
export function verifyImage(bytes: Uint8Array, name: string) {
  const mime = imageMime(name);
  const match =
    mime === 'image/png'
      ? [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
      : mime === 'image/jpeg'
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : mime === 'image/webp'
          ? String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
            String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
          : false;
  if (!match)
    throw new Error(
      `${name}: geçerli bir PNG, JPEG veya WebP dosyası gerekli.`,
    );
  return mime!;
}
export function uniqueName(name: string, existing: string[]) {
  const safe = name.replace(/[\\/\u0000-\u001f]/g, '_').slice(-160);
  const dot = safe.lastIndexOf('.');
  const stem = safe.slice(0, dot),
    ext = safe.slice(dot);
  let result = safe,
    n = 2;
  while (existing.includes(result)) result = `${stem}-${n++}${ext}`;
  return result;
}
export async function addImages(
  files: File[],
  existing: Background[],
): Promise<Background[]> {
  if (!files.length) return [];
  if (
    existing.reduce((sum, b) => sum + b.blob.size, 0) +
      files.reduce((sum, f) => sum + f.size, 0) >
    MAX_BYTES - 1024 * 1024
  )
    throw new Error('Arka planların toplamı 99 MB sınırını aşıyor.');
  const additions: Background[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = verifyImage(bytes, file.name);
    // Decode too, so corrupt files with a valid signature never enter the document.
    const blob = new Blob([bytes], { type: mime });
    const bitmap = await createImageBitmap(blob).catch(() => {
      throw new Error(`${file.name}: görsel okunamadı.`);
    });
    bitmap.close();
    additions.push({
      id: crypto.randomUUID(),
      name: uniqueName(
        file.name,
        [...existing, ...additions].map((b) => b.name),
      ),
      blob,
    });
  }
  return additions;
}
