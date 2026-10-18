// src/visualizer/ControlPanel.jsx
//
// Writes straight into configRef. Each control owns its own display state, so a
// slider drag re-renders that one slider and nothing else — never the canvas.

import React, { useCallback, useState } from 'react';
import { getDeep } from './config';
import TextLineEditor from './TextLineEditor';
import AssetDropzones from './AssetDropzones';

export default function ControlPanel({ configRef, open, onClose, onScopeModeChange }) {
  const setParam = useCallback(
    (path, value) => {
      const keys = path.split('.');
      let node = configRef.current;
      for (let i = 0; i < keys.length - 1; i++) node = node[keys[i]];
      node[keys[keys.length - 1]] = value;
    },
    [configRef]
  );

  if (!open) return null;

  return (
    <aside
      className="fixed right-0 top-0 h-full w-[min(360px,90vw)] overflow-y-auto border-l border-[var(--fg-20)] bg-black p-6"
      // One step above the floating Menu button, which would otherwise sit on
      // top of this panel's Close button.
      style={{ zIndex: 'calc(var(--z-chrome) + 1)' }}
      aria-label="Visualizer controls"
    >
      <div className="mb-8 flex items-center justify-between">
        <h2 className="ab-label">Controls</h2>
        <button onClick={onClose} className="ab-btn ab-btn-bare ab-btn-sm">
          Close ×
        </button>
      </div>

      <Section title="Text">
        <TextLineEditor configRef={configRef} setParam={setParam} />
        <Slider label="Reactivity" path="text.reactivity" min={0} max={3} step={0.05} {...{ configRef, setParam }} />
        <Slider label="Glow" path="text.glow" min={0} max={1.5} step={0.05} {...{ configRef, setParam }} />
        <Slider label="Size" path="text.fontSize" min={0.04} max={0.3} step={0.005} {...{ configRef, setParam }} />
      </Section>

      <Section title="Scope">
        <Select
          label="Mode"
          path="scope.mode"
          options={[['both', 'Wave + FFT'], ['wave', 'Wave'], ['fft', 'FFT'], ['off', 'Off']]}
          onChange={onScopeModeChange}
          {...{ configRef, setParam }}
        />
        <Slider label="Gain" path="scope.gain" min={0.1} max={3} step={0.05} {...{ configRef, setParam }} />
        <Slider label="Time scale" path="scope.timeScale" min={0.05} max={1} step={0.01} {...{ configRef, setParam }} />
        <Slider label="Line width" path="scope.lineWidth" min={0.5} max={8} step={0.5} {...{ configRef, setParam }} />
        <Toggle label="Graticule" path="scope.grid" {...{ configRef, setParam }} />
      </Section>

      <Section title="CRT">
        <Slider label="Glow" path="crt.glow" min={0} max={2} step={0.05} {...{ configRef, setParam }} />
        <Slider label="Persistence" path="crt.persistence" min={0} max={0.97} step={0.01} {...{ configRef, setParam }} />
        <Slider label="Scanlines" path="crt.scanline" min={0} max={1} step={0.02} {...{ configRef, setParam }} />
        <Slider label="Aberration" path="crt.aberration" min={0} max={2} step={0.05} {...{ configRef, setParam }} />
        <Slider label="Grain" path="crt.noise" min={0} max={1} step={0.02} {...{ configRef, setParam }} />
        <Slider label="Barrel" path="crt.barrel" min={0} max={0.6} step={0.01} {...{ configRef, setParam }} />
        <Slider label="Vignette" path="crt.vignette" min={0} max={1.5} step={0.05} {...{ configRef, setParam }} />
      </Section>

      <Section title="Glitch">
        <Toggle label="Trigger on beat" path="glitch.onBeat" {...{ configRef, setParam }} />
        <Slider label="Intensity" path="glitch.intensity" min={0} max={1.5} step={0.05} {...{ configRef, setParam }} />
        <Slider label="Decay (ms)" path="glitch.decayMs" min={40} max={600} step={10} {...{ configRef, setParam }} />
        <Slider label="Sensitivity" path="beat.sensitivity" min={1.02} max={2.5} step={0.01} {...{ configRef, setParam }} />
      </Section>

      <Section title="Color">
        <Color label="Background" path="bg.color" {...{ configRef, setParam }} />
        <Color label="Trace" path="scope.color" {...{ configRef, setParam }} />
        <Color label="Text" path="text.color" {...{ configRef, setParam }} />
      </Section>

      <Section title="Assets">
        <AssetDropzones configRef={configRef} setParam={setParam} />
      </Section>
    </aside>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-9">
      <h3 className="ab-label-dim mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, children }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="ab-meta">{label}</span>
      {children}
    </label>
  );
}

function Slider({ label, path, min, max, step, configRef, setParam }) {
  const [value, setValue] = useState(() => getDeep(configRef.current, path));

  const onInput = (e) => {
    const v = parseFloat(e.target.value);
    setValue(v);        // local only — keeps the thumb controlled
    setParam(path, v);  // the loop picks this up next frame
  };

  return (
    <label className="block">
      <div className="mb-2 flex justify-between">
        <span className="ab-meta">{label}</span>
        <span className="ab-meta" style={{ color: 'var(--fg-20)' }}>
          {Number(value).toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={value}
        onInput={onInput}
        className="w-full"
      />
    </label>
  );
}

function Toggle({ label, path, configRef, setParam }) {
  const [on, setOn] = useState(() => !!getDeep(configRef.current, path));
  return (
    <Row label={label}>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked);
          setParam(path, e.target.checked);
        }}
      />
    </Row>
  );
}

function Select({ label, path, options, configRef, setParam, onChange }) {
  // Re-reads configRef on mount. The panel unmounts when closed, so a value
  // changed elsewhere (the hero's Scope On/Off button) is picked up on reopen.
  const [value, setValue] = useState(() => getDeep(configRef.current, path));
  return (
    <Row label={label}>
      <select
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setParam(path, e.target.value);
          onChange?.(e.target.value);
        }}
        className="ab-btn ab-btn-sm"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-black">{l}</option>
        ))}
      </select>
    </Row>
  );
}

function Color({ label, path, configRef, setParam }) {
  const [value, setValue] = useState(() => getDeep(configRef.current, path));
  return (
    <Row label={label}>
      <input
        type="color"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setParam(path, e.target.value);
        }}
        className="h-7 w-14 cursor-pointer"
      />
    </Row>
  );
}
