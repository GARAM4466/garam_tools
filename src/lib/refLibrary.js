// IndexedDB-backed store for the Reference Library tool.
// Holds reusable reference assets (characters / spaces / props / styles):
// each asset carries metadata + one or more image blobs, stored locally in the
// browser (no server, no API). Images are kept as Blobs; a downscaled JPEG
// thumbnail is generated per image so the card grid stays fast.

const DB_NAME = 'ref-library';
const DB_VERSION = 1;
const STORE = 'assets';

export const ASSET_TYPES = ['인물', '공간', '소품', '스타일'];

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllAssets() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const list = req.result || [];
      // Newest first.
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function putAsset(asset) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(asset);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteAsset(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const newId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Downscale an image file to a JPEG thumbnail (longest side <= max).
// Returns { blob, w, h } where w/h are the ORIGINAL dimensions.
export async function makeThumbnail(file, max = 480) {
  const bitmap = await createImageBitmap(file);
  const ow = bitmap.width;
  const oh = bitmap.height;
  const scale = Math.min(1, max / Math.max(ow, oh));
  const w = Math.max(1, Math.round(ow * scale));
  const h = Math.max(1, Math.round(oh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
  return { blob, w: ow, h: oh };
}

// Turn a picked File into a stored image record (full blob + thumbnail).
export async function fileToImageRecord(file) {
  const { blob: thumb, w, h } = await makeThumbnail(file);
  return {
    id: newId(),
    name: file.name,
    mime: file.type || 'image/png',
    blob: file,   // full-resolution original
    thumb,        // downscaled JPEG for grid display
    w,
    h,
  };
}
