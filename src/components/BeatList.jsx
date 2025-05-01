import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import BeatCarousel from './BeatCarousel';
import { useLicenseModal } from '@/context/LicenseModalContext';

export default function BeatList({ beats }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [showMoodDropdown, setShowMoodDropdown] = useState(false);
  const [showKeyDropdown, setShowKeyDropdown] = useState(false);

  const { playBeat } = usePlayer();
  const { openLicenseModal } = useLicenseModal();
  const basePrice = 24.99;

  // Only include beats with a valid audio URL
  const beatsWithAudio = (beats || [])
    .filter((beat) => typeof beat === 'object' && beat !== null && (beat.audiourl || beat.audioUrl))
    .map((beat) => ({
      ...beat,
      name: beat.name || beat.title || 'Untitled',
      audioUrl: beat.audiourl || beat.audioUrl,
    }));

  // Filter logic
  const filteredBeats = beatsWithAudio.filter((beat) => {
    const search = searchTerm.toLowerCase();
    return (
      (beat.name?.toLowerCase().includes(search) ||
        beat.mood?.toLowerCase().includes(search) ||
        beat.key?.toLowerCase().includes(search) ||
        beat.artist?.toLowerCase().includes(search)) &&
      (!selectedMood || beat.mood === selectedMood) &&
      (!selectedKey || beat.key === selectedKey)
    );
  });

  return (
    <div className="space-y-10">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search beats, mood, key, artist..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-6">
        {/* Mood Filter */}
        <div className="relative">
          <button
            onClick={() => setShowMoodDropdown(!showMoodDropdown)}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            {selectedMood ? `Mood: ${selectedMood}` : 'Filter Mood'}
          </button>
          {showMoodDropdown && (
            <div className="absolute mt-2 w-40 bg-white border rounded shadow-lg z-10">
              {['Dark', 'Chill', 'Aggressive', 'Happy'].map((mood) => (
                <div
                  key={mood}
                  onClick={() => {
                    setSelectedMood(mood === selectedMood ? '' : mood);
                    setShowMoodDropdown(false);
                  }}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {mood}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Key Filter */}
        <div className="relative">
          <button
            onClick={() => setShowKeyDropdown(!showKeyDropdown)}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            {selectedKey ? `Key: ${selectedKey}` : 'Filter Key'}
          </button>
          {showKeyDropdown && (
            <div className="absolute mt-2 w-40 bg-white border rounded shadow-lg z-10">
              {['C Minor', 'A Minor', 'G Major', 'D Major'].map((key) => (
                <div
                  key={key}
                  onClick={() => {
                    setSelectedKey(key === selectedKey ? '' : key);
                    setShowKeyDropdown(false);
                  }}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {key}
                </div>
              ))}
            </div>
          )}
        </div>

        {(selectedMood || selectedKey) && (
          <button
            onClick={() => {
              setSelectedMood('');
              setSelectedKey('');
            }}
            className="px-4 py-2 bg-red-400 text-white rounded hover:bg-red-500"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Carousel */}
      <BeatCarousel beats={beatsWithAudio} />

      {/* Filtered Beat Grid */}
      {(searchTerm || selectedMood || selectedKey) && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold mt-6">Search Results:</h2>
          {filteredBeats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredBeats.map((beat) => (
                <div
                  key={beat.id}
                  className="p-4 rounded-lg border hover:shadow-md transition flex items-center gap-4"
                >
                  <img
                    src={beat.cover || '/images/beats/default-cover.png'}
                    alt={beat.name}
                    className="w-16 h-16 rounded object-cover cursor-pointer"
                    onClick={() => playBeat(beat)}
                  />
                  <div className="flex flex-col flex-grow">
                    <h3 className="text-lg font-bold">{beat.name}</h3>
                    <p className="text-gray-500 text-sm">
  {beat.genre || 'N/A'} | {beat.mood || 'N/A'} | {beat.key || 'N/A'} | {beat.bpm ? `${beat.bpm} ` : 'N/A'} | {beat.artist || 'Unknown'}
</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openLicenseModal(beat);
                    }}
                    className="bg-pink-400 hover:bg-pink-500 text-white font-bold py-2 px-4 rounded shadow"
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
