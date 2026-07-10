// src/components/BeatList.jsx
import { useState } from 'react';
import { Listbox } from '@headlessui/react';
import { CheckIcon } from '@heroicons/react/20/solid';
import { usePlayer } from '../context/PlayerContext';
import BeatCarousel from './BeatCarousel';
import { useLicenseModal } from '@/context/LicenseModalContext';

export default function BeatList({ beats }) {
  const [searchTerm, setSearchTerm]       = useState('');
  const [selectedMood, setSelectedMood]   = useState('');
  const [selectedKey, setSelectedKey]     = useState('');
  const [selectedArtist, setSelectedArtist] = useState('');

  const { playBeat }           = usePlayer();
  const { openLicenseModal }   = useLicenseModal();
  const basePrice              = 24.99;

  // ────────────────────────────────────────────────────────
  // 1. Normalize & filter: include `id` explicitly here!
  const beatsWithAudio = (beats || [])
    .filter(b => b && (b.audiourl || b.audioUrl))
    .map(b => ({
      id:       b.id        ?? b.beatId,                  // ← guarantee it
      name:     b.name      || b.title || 'Untitled',
      artist:   b.artist    || 'Unknown Artist',
      audioUrl: b.audiourl  || b.audioUrl,
      cover:    b.cover     || '/images/beats/default-cover.png',
      genre:    b.genre     || '',
      mood:     b.mood      || '',
      key:      b.key       || '',
      bpm:      b.bpm       || '',
      licenses: b.licenses  || [],
    }));
  // ────────────────────────────────────────────────────────

  // build dynamic artist list
  const artists = Array.from(
    new Set(beatsWithAudio.map(b => b.artist))
  ).sort();

  // comma-split search
  const searchTerms = searchTerm
    .toLowerCase()
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  // final filter logic
  const filteredBeats = beatsWithAudio.filter(beat => {
    const matchesText =
      searchTerms.length === 0 ||
      searchTerms.every(term =>
        [beat.name, beat.mood, beat.key, beat.artist, beat.genre]
          .filter(Boolean)
          .some(field => field.toLowerCase().includes(term))
      );
    const matchesMood   = !selectedMood    || beat.mood   === selectedMood;
    const matchesKey    = !selectedKey     || beat.key    === selectedKey;
    const matchesArtist = !selectedArtist  || beat.artist === selectedArtist;
    return matchesText && matchesMood && matchesKey && matchesArtist;
  });

  const filterBtnBase = 'ab-btn';
  const optionsBase =
    'absolute z-10 mt-1 border border-[var(--fg-20)] bg-black';
  const optionClass = ({ active }) =>
    `flex items-center gap-2 px-4 py-2 cursor-pointer text-xs ${
      active ? 'bg-white/10' : ''
    }`;

  return (
    <div className="space-y-10">
      {/* Search */}
      <input
        type="text"
        placeholder="Search beats, mood, key, artist (comma-separated)…"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="ab-field"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Mood */}
        <Listbox
          value={selectedMood}
          onChange={val => setSelectedMood(prev => (prev === val ? '' : val))}
        >
          <div className="relative">
            <Listbox.Button className={`${filterBtnBase} ${selectedMood ? 'ab-btn-active' : ''}`}>
              {selectedMood || 'Filter Mood'}
            </Listbox.Button>
            <Listbox.Options className={`${optionsBase} w-40`}>
              {['Dark','Chill','Aggressive','Euphoric','Dance'].map(m => (
                <Listbox.Option key={m} value={m} className={optionClass}>
                  {({ selected }) => (
                    <>
                      {selected && <CheckIcon className="w-4 h-4 text-[var(--accent)]" />}
                      <span className={selected ? 'text-white' : 'text-[var(--fg-50)]'}>{m}</span>
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </div>
        </Listbox>

        {/* Artist */}
        <Listbox
          value={selectedArtist}
          onChange={val => setSelectedArtist(prev => (prev === val ? '' : val))}
        >
          <div className="relative">
            <Listbox.Button className={`${filterBtnBase} ${selectedArtist ? 'ab-btn-active' : ''}`}>
              {selectedArtist || 'Filter Artist'}
            </Listbox.Button>
            <Listbox.Options className={`${optionsBase} max-h-64 w-48 overflow-auto`}>
              {artists.map(a => (
                <Listbox.Option key={a} value={a} className={optionClass}>
                  {({ selected }) => (
                    <>
                      {selected && <CheckIcon className="w-4 h-4 text-[var(--accent)]" />}
                      <span className={selected ? 'text-white' : 'text-[var(--fg-50)]'}>{a}</span>
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </div>
        </Listbox>

        {/* Clear Filters */}
        {(selectedMood || selectedKey || selectedArtist) && (
          <button
            onClick={() => {
              setSelectedMood('');
              setSelectedKey('');
              setSelectedArtist('');
            }}
            className="ab-btn"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Carousel */}
      <BeatCarousel beats={beatsWithAudio} />

      {/* Results */}
      {(searchTerm || selectedMood || selectedKey || selectedArtist) && (
        <div className="space-y-6">
          <h2 className="ab-label mt-6">Search Results</h2>
          {filteredBeats.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredBeats.map(beat => (
                <div
                  key={beat.id}
                  className="ab-card flex cursor-pointer items-center gap-4 p-4"
                  onClick={() => playBeat(beat)}  // sends full beat, including id
                >
                  <img
                    src={beat.cover}
                    alt={beat.name}
                    className="h-16 w-16 object-cover grayscale"
                  />
                  <div className="flex min-w-0 flex-grow flex-col gap-1">
                    <h3 className="truncate text-sm">{beat.name}</h3>
                    <p className="ab-meta truncate">
                      {[beat.genre, beat.mood, beat.key, beat.bpm, beat.artist]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      openLicenseModal(beat);   // also gets full beat with id
                    }}
                    className="ab-btn ab-btn-sm"
                  >
                    From ${basePrice.toFixed(2)}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="ab-label-dim text-center">No beats found</p>
          )}
        </div>
      )}
    </div>
  );
}
