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

  const filterBtnBase = `
    px-4 py-2
    bg-gradient-to-r from-pink-500 to-purple-500
    hover:from-pink-600 hover:to-purple-600
    text-white font-semibold
    rounded-lg shadow-lg
    transform hover:-translate-y-0.5
    transition ease-out duration-200
  `;

  return (
    <div className="space-y-10">
      {/* Search */}
      <input
        type="text"
        placeholder="Search beats, mood, key, artist (comma-separated)…"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Mood */}
        <Listbox
          value={selectedMood}
          onChange={val => setSelectedMood(prev => (prev === val ? '' : val))}
        >
          <div className="relative">
            <Listbox.Button className={filterBtnBase}>
              {selectedMood || 'Filter Mood'}
            </Listbox.Button>
            <Listbox.Options className="absolute mt-1 w-40 bg-white border rounded-lg shadow-lg z-10">
              {['Dark','Chill','Aggressive','Euphoric','Dance'].map(m => (
                <Listbox.Option key={m} value={m}
                  className={({ active }) =>
                    `flex items-center px-4 py-2 cursor-pointer ${
                      active ? 'bg-gray-100' : ''
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      {selected && <CheckIcon className="w-5 h-5 text-pink-500 mr-2" />}
                      <span className={selected ? 'font-semibold' : ''}>{m}</span>
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
            <Listbox.Button className={filterBtnBase}>
              {selectedArtist || 'Filter Artist'}
            </Listbox.Button>
            <Listbox.Options className="absolute mt-1 w-48 max-h-64 overflow-auto bg-white border rounded-lg shadow-lg z-10">
              {artists.map(a => (
                <Listbox.Option key={a} value={a}
                  className={({ active }) =>
                    `flex items-center px-4 py-2 cursor-pointer ${
                      active ? 'bg-gray-100' : ''
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      {selected && <CheckIcon className="w-5 h-5 text-pink-500 mr-2" />}
                      <span className={selected ? 'font-semibold' : ''}>{a}</span>
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
            className="
              px-4 py-2 bg-red-400 text-white font-semibold
              rounded-lg shadow hover:bg-red-500 transition
            "
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
          <h2 className="text-2xl font-bold mt-6">Search Results:</h2>
          {filteredBeats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredBeats.map(beat => (
                <div
                  key={beat.id}
                  className="p-4 rounded-lg border hover:shadow-md transition flex items-center gap-4 cursor-pointer"
                  onClick={() => playBeat(beat)}  // sends full beat, including id
                >
                  <img
                    src={beat.cover}
                    alt={beat.name}
                    className="w-16 h-16 rounded object-cover"
                  />
                  <div className="flex flex-col flex-grow">
                    <h3 className="text-lg font-bold">{beat.name}</h3>
                    <p className="text-gray-500 text-sm">
                      {beat.genre || 'N/A'} | {beat.mood || 'N/A'} |{' '}
                      {beat.key || 'N/A'} | {beat.bpm || 'N/A'} |{' '}
                      {beat.artist}
                    </p>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      openLicenseModal(beat);   // also gets full beat with id
                    }}
                    className="
                      bg-gradient-to-r from-pink-500 to-purple-500
                      hover:from-pink-600 hover:to-purple-600
                      text-white font-bold uppercase tracking-wide
                      py-2 px-4 rounded-lg shadow-lg
                      transform hover:-translate-y-0.5
                      transition ease-out duration-200
                    "
                  >
                    From ${basePrice.toFixed(2)}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No beats found!</p>
          )}
        </div>
      )}
    </div>
  );
}
