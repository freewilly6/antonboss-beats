// pages/beats/index.js
import Layout from '@/components/Layout'
import BeatList from '@/components/BeatList'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function BeatsPage() {
  const [beats, setBeats] = useState([])

  useEffect(() => {
    const fetchBeats = async () => {
      const { data, error } = await supabase
        .from('BeatFiles')
        .select('id,name,artist,audiourl,cover,genre,mood,key,bpm,licenses')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading beats:', error)
        return
      }

      // ✨ Normalize every beat so it ALWAYS has a real `id`
      const normalized = (data || []).map((b) => ({
        id:       b.id,                            // ← guaranteed
        name:     b.name    || 'Untitled',
        artist:   b.artist  || 'Unknown Artist',
        audioUrl: b.audiourl,
        cover:    b.cover   || '/images/beats/default-cover.png',
        genre:    b.genre,
        mood:     b.mood   || '',
        key:      b.key,
        bpm:      b.bpm,
        licenses: b.licenses || [],
      }))

      // (Optional) sanity-check in your console:
      console.log('🎧 BeatsPage normalized:', normalized)

      setBeats(normalized)
    }

    fetchBeats()
  }, [])

  return (
    <Layout>
      <div className="mt-10">
        <h1 className="text-3xl font-bold mb-8 text-center">
          All Beats
        </h1>
        <BeatList beats={beats} />
      </div>
    </Layout>
  )
}
