// src/lib/fontManager.js
//
// Registers a visitor's .ttf/.otf with the document so the 2D canvas can name it
// in `ctx.font`. This is the reason the renderer draws text in 2D rather than GL:
// arbitrary runtime fonts cost one FontFace call here, and an SDF atlas pipeline there.

let seq = 0;

const registry = new Map(); // id -> { face, family, label }

export async function loadFontFile(file) {
  const family = `user-font-${++seq}`;
  const buffer = await file.arrayBuffer();

  const face = new FontFace(family, buffer);
  await face.load(); // throws on a malformed or unsupported file
  document.fonts.add(face);

  const entry = { id: family, family, label: file.name };
  registry.set(family, { ...entry, face });
  return entry;
}

export function unloadFont(id) {
  const entry = registry.get(id);
  if (!entry) return;
  document.fonts.delete(entry.face);
  registry.delete(id);
}

export function unloadAllFonts() {
  for (const id of [...registry.keys()]) unloadFont(id);
}
