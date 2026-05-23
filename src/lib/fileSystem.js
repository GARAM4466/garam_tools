// File System Access API helpers for the HTML Selector tool.
// Lets the user pick a local folder once; the browser then reads its images
// directly (no upload, no pre-scan script). Falls back to <input webkitdirectory>
// on browsers without the API (Firefox/Safari).

const IMAGE_RE = /\.(jpe?g|png|webp|gif|bmp|avif)$/i;

export const supportsFSAccess = () =>
  typeof window !== 'undefined' && 'showDirectoryPicker' in window;

// --- IndexedDB: persist the directory handle so revisits skip re-picking ---

const DB_NAME = 'html-selector';
const STORE = 'handles';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveHandle(key, handle) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(handle, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadHandle(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// requestPermission must be called from a user gesture (button click).
export async function verifyPermission(handle, readWrite = false) {
  const opts = { mode: readWrite ? 'readwrite' : 'read' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  if ((await handle.requestPermission(opts)) === 'granted') return true;
  return false;
}

// --- Scanning ---

// Recursively walk a directory handle, collecting image files.
// Each item exposes getFile() so the UI can read bytes lazily on scroll.
export async function scanDirectory(dirHandle, base = '') {
  const files = [];
  for await (const entry of dirHandle.values()) {
    const relativePath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.kind === 'file') {
      if (IMAGE_RE.test(entry.name)) {
        files.push(makeItem(entry.name, relativePath, () => entry.getFile()));
      }
    } else if (entry.kind === 'directory') {
      files.push(...(await scanDirectory(entry, relativePath)));
    }
  }
  return files;
}

// Fallback: turn a webkitdirectory FileList into the same item shape.
export function filesToItems(fileList) {
  const items = [];
  for (const file of fileList) {
    if (!IMAGE_RE.test(file.name)) continue;
    const relativePath = file.webkitRelativePath || file.name;
    items.push(makeItem(file.name, relativePath, () => Promise.resolve(file)));
  }
  return items;
}

function makeItem(name, relativePath, getFile) {
  // topFolder = first path segment (used for filter tabs); '(root)' if flat.
  const segments = relativePath.split('/');
  const topFolder = segments.length > 1 ? segments[0] : '(root)';
  return { name, relativePath, topFolder, getFile };
}

// --- Write back ---

export async function getSubdirHandle(dirHandle, name) {
  return dirHandle.getDirectoryHandle(name, { create: true });
}

export async function writeBlobToDirectory(dirHandle, fileName, blob) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export async function writeJsonToDirectory(dirHandle, fileName, dataObj) {
  await writeBlobToDirectory(
    dirHandle, fileName,
    new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' }),
  );
}
