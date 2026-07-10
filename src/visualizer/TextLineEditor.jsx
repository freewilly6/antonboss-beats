// src/visualizer/TextLineEditor.jsx
//
// Structural edits (add/remove/reorder) need React state for the list UI, and
// they also write through to configRef so the loop sees them next frame. The
// per-frame values — active index, pulse envelope — stay in the ref only.

import React, { useState } from 'react';
import { makeLine } from './config';

export default function TextLineEditor({ configRef, setParam }) {
  const [lines, setLines] = useState(() => configRef.current.text.lines);
  const [active, setActive] = useState(() => configRef.current.text.activeIndex);
  const [autoCycle, setAutoCycle] = useState(() => configRef.current.text.autoCycle);

  const commit = (next) => {
    setLines(next);
    configRef.current.text.lines = next; // loop reads the array by reference
    if (active >= next.length) selectLine(Math.max(0, next.length - 1));
  };

  const selectLine = (i) => {
    setActive(i);
    setParam('text.activeIndex', i);
  };

  const addLine = () => commit([...lines, makeLine('')]);

  const removeLine = (id) => {
    const next = lines.filter((l) => l.id !== id);
    commit(next.length ? next : [makeLine('')]);
  };

  const editText = (id, text) =>
    commit(lines.map((l) => (l.id === id ? { ...l, text } : l)));

  return (
    <div className="space-y-3">
      {lines.map((line, i) => (
        <div
          key={line.id}
          className="flex items-center gap-2 border p-2 transition-colors"
          style={{ borderColor: i === active ? 'var(--fg-50)' : 'var(--fg-10)' }}
        >
          <input
            value={line.text}
            onChange={(e) => editText(line.id, e.target.value)}
            onFocus={() => selectLine(i)}
            placeholder="Type a lyric, a title, a word…"
            className="ab-input min-w-0 flex-1 border-0 py-1"
          />
          <button
            onClick={() => selectLine(i)}
            title="Trigger this line"
            className={`ab-btn ab-btn-bare ab-btn-sm ${i === active ? 'ab-btn-active' : ''}`}
          >
            Cue
          </button>
          <button
            onClick={() => removeLine(line.id)}
            className="ab-btn ab-btn-bare ab-btn-sm"
            aria-label="Remove line"
          >
            ×
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between gap-4">
        <button onClick={addLine} className="ab-btn ab-btn-bare ab-btn-sm">
          + Add line
        </button>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={autoCycle}
            onChange={(e) => {
              setAutoCycle(e.target.checked);
              setParam('text.autoCycle', e.target.checked);
            }}
          />
          <span className="ab-meta">Auto-cycle</span>
        </label>
      </div>
    </div>
  );
}
