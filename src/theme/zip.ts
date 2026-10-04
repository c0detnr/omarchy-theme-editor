import { Unzip, UnzipInflate, strFromU8 } from 'fflate';
import { MAX_BYTES } from './model';
export function assertSafePath(path: string) {
  const parts = path.replace(/\/$/, '').split('/');
  if (
    !path ||
    path.startsWith('/') ||
    path.includes('\\') ||
    /[\u0000-\u001f:]/.test(path) ||
    parts.some((part) => !part || part === '.' || part === '..')
  )
    throw new Error(`ZIP içinde güvenli olmayan yol: ${path}`);
}
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
interface ZipEntry {
  size: number;
  crc: number;
  compression: number;
}
// Validate the central directory before any decompression, including truncated archives.
function inspectZip(bytes: Uint8Array, limit: number): Map<string, ZipEntry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const malformed = () =>
    new Error('ZIP eksik, bozuk veya desteklenmeyen biçimde.');
  if (bytes.length < 22) throw malformed();
  let end = bytes.length - 22;
  const earliest = Math.max(0, end - 65535);
  for (; end >= earliest; end--) {
    if (
      view.getUint32(end, true) === 0x06054b50 &&
      end + 22 + view.getUint16(end + 20, true) === bytes.length
    )
      break;
  }
  if (
    end < earliest ||
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true)
  )
    throw malformed();
  const count = view.getUint16(end + 10, true);
  if (!count || count > 4096 || view.getUint16(end + 8, true) !== count)
    throw malformed();
  const centralSize = view.getUint32(end + 12, true);
  const centralStart = view.getUint32(end + 16, true);
  if (centralStart + centralSize !== end) throw malformed();
  const entries = new Map<string, ZipEntry>();
  let offset = centralStart,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50)
      throw malformed();
    const flags = view.getUint16(offset + 8, true),
      compression = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true),
      size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true),
      extraLength = view.getUint16(offset + 30, true),
      commentLength = view.getUint16(offset + 32, true);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (
      next > end ||
      flags & 1 ||
      ![0, 8].includes(compression) ||
      view.getUint16(offset + 34, true)
    )
      throw malformed();
    const name = strFromU8(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
      !(flags & 2048),
    );
    assertSafePath(name);
    if (entries.has(name)) throw new Error(`ZIP içinde yinelenen yol: ${name}`);
    total += size;
    if (total > limit)
      throw new Error('ZIP açılmış içeriği 100 MB sınırını aşıyor.');
    const local = view.getUint32(offset + 42, true);
    if (local + 30 > centralStart || view.getUint32(local, true) !== 0x04034b50)
      throw malformed();
    const localNameLength = view.getUint16(local + 26, true),
      localExtraLength = view.getUint16(local + 28, true);
    const dataStart = local + 30 + localNameLength + localExtraLength;
    if (
      dataStart + compressed > centralStart ||
      view.getUint16(local + 8, true) !== compression ||
      view.getUint16(local + 6, true) !== flags
    )
      throw malformed();
    const localName = strFromU8(
      bytes.subarray(local + 30, local + 30 + localNameLength),
      !(flags & 2048),
    );
    if (localName !== name) throw malformed();
    entries.set(name, {
      size,
      compression,
      crc: view.getUint32(offset + 16, true),
    });
    offset = next;
  }
  if (offset !== end) throw malformed();
  return entries;
}
// Feed 16 KB chunks; count every expanded byte, including ignored files.
export async function unzipBounded(
  bytes: Uint8Array,
  limit = MAX_BYTES,
): Promise<Map<string, Uint8Array<ArrayBuffer>>> {
  if (bytes.length > MAX_BYTES)
    throw new Error('ZIP dosyası 100 MB sınırını aşıyor.');
  const expected = inspectZip(bytes, limit);
  const output = new Map<string, Uint8Array<ArrayBuffer>>();
  const names = new Set<string>();
  let total = 0,
    pending = 0;
  const unzip = new Unzip((file) => {
    assertSafePath(file.name);
    const entry = expected.get(file.name);
    if (
      !entry ||
      names.has(file.name) ||
      entry.compression !== file.compression
    )
      throw new Error('ZIP dosya kayıtları tutarsız.');
    names.add(file.name);
    if (file.originalSize !== undefined && file.originalSize !== entry.size)
      throw new Error('ZIP dosya boyutları tutarsız.');
    const chunks: Uint8Array[] = [];
    let size = 0,
      crc = 0xffffffff;
    pending++;
    file.ondata = (error, chunk, final) => {
      if (error) throw error;
      total += chunk.length;
      size += chunk.length;
      if (total > limit || size > entry.size)
        throw new Error('ZIP açılmış içeriği boyut sınırını aşıyor.');
      for (const byte of chunk)
        crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
      chunks.push(chunk);
      if (final) {
        if (size !== entry.size || (crc ^ 0xffffffff) >>> 0 !== entry.crc)
          throw new Error(`ZIP bütünlük kontrolü başarısız: ${file.name}`);
        const data = new Uint8Array(size);
        let offset = 0;
        for (const part of chunks) {
          data.set(part, offset);
          offset += part.length;
        }
        if (!file.name.endsWith('/')) output.set(file.name, data);
        pending--;
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let offset = 0; offset < bytes.length; offset += 16384) {
    unzip.push(
      bytes.subarray(offset, offset + 16384),
      offset + 16384 >= bytes.length,
    );
    if (offset % (16384 * 32) === 0)
      await new Promise((resolve) => setTimeout(resolve, 0));
  }
  if (pending || names.size !== expected.size)
    throw new Error('ZIP eksik veya bozuk.');
  return output;
}
