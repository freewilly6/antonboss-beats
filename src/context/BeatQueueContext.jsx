// BeatQueueContext.jsx
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
        .select('id,name,artist,audiourl,cover,genre,key,bpm,licenses') // ← here
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching beats from Supabase:', error.message);
        return;
      }

      const validBeats = (data || []).filter((beat) => beat.audiourl);

      const normalizedBeats = validBeats.map((beat) => ({
        ...beat,
        name:       beat.name || 'Untitled',
        audioUrl:   beat.audiourl,
        cover:      beat.cover || '/images/beats/default-cover.png',
        artist:     beat.artist || 'Anton Boss',
        genre:      beat.genre || 'Unknown',
        // licenses is already an array of {name,price,file_path}
        licenses:   beat.licenses || [],
      }));

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
