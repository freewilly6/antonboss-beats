// src/lib/imageManager.js
//
// Decodes dropped images to ImageBitmaps once, up front, so the render loop only
// ever does a drawImage. Bitmaps hold GPU-adjacent memory — close() them.

let seq = 0;

const registry = new Map(); // id -> ImageBitmap

const MAX_EDGE = 1600; // decoding a 6000px phone photo every frame is wasteful

export async function loadImageFile(file) {
  const id = `img-${++seq}`;

  let bitmap = await createImageBitmap(file);
  if (bitmap.width > MAX_EDGE || bitmap.height > MAX_EDGE) {
    const scale = MAX_EDGE / Math.max(bitmap.width, bitmap.height);
    const resized = await createImageBitmap(bitmap, {
      resizeWidth: Math.round(bitmap.width * scale),
      resizeHeight: Math.round(bitmap.height * scale),
    });
    bitmap.close();
    bitmap = resized;
  }

  registry.set(id, bitmap);

  return {
    id,
    bitmap,
    label: file.name,
    x: 0.5,
    y: 0.5,
    scale: 0.5,
    opacity: 0.8,
    blend: 'screen', // reads as a layered VHS composite over black
  };
}

export function unloadImage(id) {
  const bitmap = registry.get(id);
  if (!bitmap) return;
  bitmap.close();
  registry.delete(id);
}

export function unloadAllImages() {
  for (const id of [...registry.keys()]) unloadImage(id);
}
