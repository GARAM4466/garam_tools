// Splits a single grid image (e.g. a 2x2 AI output) into its cells client-side.
// Used both for on-screen thumbnails (downscaled JPEG) and for export (full-res PNG).

export const GRID_MODES = {
  '2x2': { label: '2x2 (4분할)', rows: 2, cols: 2 },
  '1x4': { label: '1x4 (세로 4칸)', rows: 4, cols: 1 },
};

// Cell index order is row-major: 1=top-left ... left-to-right, top-to-bottom.
// Returns an array of Blobs, one per cell, in that order.
export async function cropFileToCells(file, rows, cols, type = 'image/png', quality) {
  const bitmap = await createImageBitmap(file);
  const cellW = bitmap.width / cols;
  const cellH = bitmap.height / rows;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cellW);
  canvas.height = Math.round(cellH);
  const ctx = canvas.getContext('2d');

  const blobs = [];
  for (let i = 0; i < rows * cols; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      bitmap,
      c * cellW, r * cellH, cellW, cellH, // source rect
      0, 0, canvas.width, canvas.height,  // dest rect
    );
    const blob = await new Promise((res) => canvas.toBlob(res, type, quality));
    blobs.push(blob);
  }
  bitmap.close?.();
  return blobs;
}
