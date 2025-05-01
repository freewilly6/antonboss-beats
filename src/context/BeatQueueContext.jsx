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
        .from('BeatFiles') // your table name
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching beats from Supabase:', error.message);
        return;
      }

      // Optional: filter for valid audioUrl
      const validBeats = (data || []).filter((beat) => beat.audiourl || beat.audioUrl);

      // Normalize data
      const normalizedBeats = validBeats.map((beat) => ({
        ...beat,
        name: beat.name || beat.title || 'Untitled',
        audioUrl: beat.audiourl || beat.audioUrl,
        cover: beat.cover || '/images/beats/default-cover.png',
        artist: beat.artist || 'Anton Boss',
        genre: beat.genre || 'Unknown',
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
