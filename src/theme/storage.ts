import { colorKeys, HEX, iconSets, type ThemeDocument } from './model';
const DB_NAME = 'omarchy-theme-editor';
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore('documents');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error('Kayıt veritabanı başka bir sekmede açık.'));
  });
}
export async function loadTheme(): Promise<ThemeDocument | null> {
  const db = await openDB();
  try {
    const data = await new Promise<ThemeDocument | undefined>(
      (resolve, reject) => {
        const request = db
          .transaction('documents')
          .objectStore('documents')
          .get('current');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      },
    );
    if (!data) return null;
    if (
      data.version !== 1 ||
      typeof data.name !== 'string' ||
      typeof data.slug !== 'string' ||
      !['light', 'dark'].includes(data.mode) ||
      !iconSets.includes(data.iconSet) ||
      !colorKeys.every((key) => HEX.test(data.palette?.[key])) ||
      !Array.isArray(data.backgrounds) ||
      !data.backgrounds.every(
        (b) =>
          typeof b.id === 'string' &&
          typeof b.name === 'string' &&
          b.blob instanceof Blob,
      )
    )
      throw new Error('Kaydedilen çalışma okunamadı.');
    return data;
  } finally {
    db.close();
  }
}
export async function saveTheme(theme: ThemeDocument): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      tx.objectStore('documents').put(theme, 'current');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
