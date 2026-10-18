// src/context/BeatQueueContext.jsx
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { loadSupabase } from '@/lib/supabaseLazy';

const BeatQueueContext = createContext();

export function BeatQueueProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [shuffledQueue, setShuffledQueue] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const fetchBeats = async () => {
      // Loaded here, not imported up top: see lib/supabaseLazy.js.
      const supabase = await loadSupabase();
      if (cancelled) return;
      const { data, error } = await supabase
        .from('BeatFiles')
        .select('id,name,artist,audiourl,cover,genre,mood,key,bpm,licenses')
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
        // Without this the shelf's mood filter and the list view's mood
        // column had nothing to work with.
        mood:     b.mood      || '',
        key:      b.key,
        bpm:      b.bpm,
        licenses: b.licenses  || [],
      }));
      if (cancelled) return;
      setQueue(normalizedBeats);
      setShuffledQueue([...normalizedBeats].sort(() => Math.random() - 0.5));
    };

    // The beats section sits a full viewport below the fold and nothing can be
    // played before hydration finishes, so this request has no business
    // competing with first paint. Run it once the main thread goes quiet.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(fetchBeats, { timeout: 2500 })
      : setTimeout(fetchBeats, 300);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback && window.requestIdleCallback) window.cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
  }, []);

  // A fresh object literal here would re-render every consumer on any parent
  // render, even though the queue itself is fetched once.
  const value = useMemo(() => ({ queue, shuffledQueue }), [queue, shuffledQueue]);

  return (
    <BeatQueueContext.Provider value={value}>
      {children}
    </BeatQueueContext.Provider>
  );
}

export const useBeatQueue = () => useContext(BeatQueueContext);
