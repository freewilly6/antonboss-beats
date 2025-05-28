// src/context/BeatQueueContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const BeatQueueContext = createContext();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function BeatQueueProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [shuffledQueue, setShuffledQueue] = useState([]);

  useEffect(() => {
    const fetchBeats = async () => {
      const { data, error } = await supabase
        .from('BeatFiles')
        .select('id,name,artist,audiourl,cover,genre,key,bpm,licenses')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching beats from Supabase:', error.message);
        return;
      }

      // filter out any rows without an audio URL
      const validBeats = (data || []).filter((beat) => beat.audiourl);

      // normalize every beat so it always has a numeric `id`
      const normalizedBeats = validBeats.map((b) => ({
        id:       b.id        ?? b.beatId,
        name:     b.name      || 'Untitled',
        audioUrl: b.audiourl,
        cover:    b.cover     || '/images/beats/default-cover.png',
        artist:   b.artist    || 'Anton Boss',
        genre:    b.genre     || 'Unknown',
        key:      b.key,
        bpm:      b.bpm,
        licenses: b.licenses  || [],
      }));
console.log('🎧 normalizedBeats:', normalizedBeats)
      setQueue(normalizedBeats);
      setShuffledQueue([...normalizedBeats].sort(() => Math.random() - 0.5));
    };
    

    fetchBeats();
  }, []);

  return (
    <BeatQueueContext.Provider value={{ queue, shuffledQueue }}>
      {children}
    </BeatQueueContext.Provider>
  );
}

export const useBeatQueue = () => useContext(BeatQueueContext);
