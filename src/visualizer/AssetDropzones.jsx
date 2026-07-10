// src/visualizer/AssetDropzones.jsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { usePlayer } from '@/context/PlayerContext';
import { loadFontFile, unloadFont } from '@/lib/fontManager';
import { loadImageFile, unloadImage } from '@/lib/imageManager';

export default function AssetDropzones({ configRef, setParam }) {
  const { playLocalFile } = usePlayer();
  const [fonts, setFonts] = useState([]);
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');

  // Bitmaps and FontFaces outlive React unless we say otherwise. Read the live
  // lists through a ref so this runs on unmount only — depending on the arrays
  // themselves would free every asset the moment you added another.
  const liveRef = useRef({ fonts, images });
  liveRef.current = { fonts, images };

  useEffect(() => {
    return () => {
      for (const f of liveRef.current.fonts) unloadFont(f.id);
      for (const i of liveRef.current.images) unloadImage(i.id);
    };
  }, []);

  const onFonts = useCallback(
    async (files) => {
      setError('');
      for (const file of files) {
        try {
          const entry = await loadFontFile(file);
          setFonts((prev) => [...prev, entry]);
          setParam('text.fontFamily', entry.family);
        } catch {
          setError(`Couldn't read ${file.name} — is it a valid .ttf or .otf?`);
        }
      }
    },
    [setParam]
  );

  const onImages = useCallback(
    async (files) => {
      setError('');
      for (const file of files) {
        try {
          const entry = await loadImageFile(file);
          configRef.current.assets.images.push(entry);
          setImages((prev) => [...prev, entry]);
        } catch {
          setError(`Couldn't decode ${file.name}.`);
        }
      }
    },
    [configRef]
  );

  const onAudio = useCallback((files) => files[0] && playLocalFile(files[0]), [playLocalFile]);

  const removeImage = (id) => {
    const list = configRef.current.assets.images;
    const idx = list.findIndex((i) => i.id === id);
    if (idx >= 0) list.splice(idx, 1); // mutate in place; loop holds this reference
    unloadImage(id);
    setImages((prev) => prev.filter((i) => i.id !== id));
  };

  const removeFont = (id) => {
    unloadFont(id);
    setFonts((prev) => prev.filter((f) => f.id !== id));
    if (configRef.current.text.fontFamily === id) setParam('text.fontFamily', '');
  };

  return (
    <div className="space-y-4">
      <Drop
        onDrop={onFonts}
        accept={{ 'font/ttf': ['.ttf'], 'font/otf': ['.otf'] }}
        label="Drop a .ttf or .otf"
      />
      {fonts.map((f) => (
        <Chip
          key={f.id}
          label={f.label}
          active={configRef.current.text.fontFamily === f.family}
          onSelect={() => setParam('text.fontFamily', f.family)}
          onRemove={() => removeFont(f.id)}
        />
      ))}

      <Drop onDrop={onImages} accept={{ 'image/*': [] }} label="Drop an image" />
      {images.map((i) => (
        <Chip key={i.id} label={i.label} onRemove={() => removeImage(i.id)} />
      ))}

      <Drop onDrop={onAudio} accept={{ 'audio/*': [] }} label="Drop your own audio" />

      <button
        onClick={() => setParam('text.fontFamily', '')}
        className="ab-btn ab-btn-bare ab-btn-sm"
      >
        Reset font
      </button>

      {error && <p className="ab-meta text-[var(--accent)]">{error}</p>}
      <p className="ab-meta leading-relaxed" style={{ color: 'var(--fg-20)' }}>
        Everything you drop stays in your browser. Nothing is uploaded.
      </p>
    </div>
  );
}

function Drop({ onDrop, accept, label }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept });
  return (
    <div
      {...getRootProps()}
      className="cursor-pointer border border-dashed p-4 text-center transition-colors"
      style={{
        borderColor: isDragActive ? 'var(--fg)' : 'var(--fg-20)',
        background: isDragActive ? 'rgba(255,255,255,0.04)' : 'transparent',
      }}
    >
      <input {...getInputProps()} />
      <span className="ab-label-dim" style={isDragActive ? { color: 'var(--fg)' } : undefined}>
        {label}
      </span>
    </div>
  );
}

function Chip({ label, active, onSelect, onRemove }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        onClick={onSelect}
        className="ab-meta min-w-0 flex-1 truncate text-left hover:text-white"
        style={active ? { color: 'var(--accent)' } : undefined}
      >
        {label}
      </button>
      <button onClick={onRemove} className="ab-btn ab-btn-bare ab-btn-sm" aria-label="Remove">
        ×
      </button>
    </div>
  );
}
