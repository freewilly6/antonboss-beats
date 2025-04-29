import { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import BeatCarousel from './BeatCarousel';

export default function BeatList({ beats }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [showMoodDropdown, setShowMoodDropdown] = useState(false);
  const [showKeyDropdown, setShowKeyDropdown] = useState(false);

  const { setCurrentBeat } = usePlayer();

  const handleSelectBeat = (beat) => {
    const safeAudioFile = beat.audioFile
      ? beat.audioFile
      : `${beat.title.replace(/\s+/g, '')}.mp3`;

    setCurrentBeat({
      name: beat.title,
      audioUrl: `/audio/${safeAudioFile}`,
      cover: beat.cover,
      price: beat.price,
    });
  };

  // Filter beats live
  const filteredBeats = beats.filter((beat) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = beat.title.toLowerCase().includes(search) ||
      beat.mood?.toLowerCase().includes(search) ||
      beat.key?.toLowerCase().includes(search) ||
      beat.artistType?.toLowerCase().includes(search);

    const matchesMood = selectedMood ? beat.mood === selectedMood : true;
    const matchesKey = selectedKey ? beat.key === selectedKey : true;

    return matchesSearch && matchesMood && matchesKey;
  });

  return (
    <div className="space-y-10">
      
      {/* Search Bar */}
      <input 
        type="text"
        placeholder="Search beats, mood, key, artist..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
      />

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap gap-6">
        
        {/* Mood Filter */}
        <div className="relative">
          <button
            onClick={() => setShowMoodDropdown(!showMoodDropdown)}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            {selectedMood ? `Mood: ${selectedMood}` : "Filter Mood"}
          </button>
          {showMoodDropdown && (
            <div className="absolute mt-2 w-40 bg-white border rounded shadow-lg z-10">
              {["Dark", "Chill", "Aggressive", "Happy"].map((mood) => (
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
            {selectedKey ? `Key: ${selectedKey}` : "Filter Key"}
          </button>
          {showKeyDropdown && (
            <div className="absolute mt-2 w-40 bg-white border rounded shadow-lg z-10">
              {["C Minor", "A Minor", "G Major", "D Major"].map((key) => (
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

        {/* Clear Filters */}
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

      {/* Beat Carousel */}
      <BeatCarousel beats={beats} onSelectBeat={handleSelectBeat} />

      {/* Live Search Results */}
      {searchTerm.trim() !== '' || selectedMood || selectedKey ? (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold mt-6">Search Results:</h2>

          {filteredBeats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredBeats.map((beat) => (
                <div
                  key={beat.id}
                  onClick={() => handleSelectBeat(beat)}
                  className="p-4 rounded-lg border hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                >
                  <h3 className="text-lg font-bold">{beat.title}</h3>
                  <p className="text-gray-500 text-sm">{beat.mood} | {beat.key} | {beat.artistType}</p>
                  <p className="text-green-500 font-bold">${beat.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No beats found!</p>
          )}
        </div>
      ) : null}
      
    </div>
  );
}
