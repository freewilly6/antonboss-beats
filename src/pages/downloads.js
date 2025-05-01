// pages/downloads.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Navbar from '../components/Navbar';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DownloadsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const fetchPurchases = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/signin?redirectTo=/downloads');
        return;
      }

      setUser(session.user);

      const { data, error } = await supabase
        .from('purchases')
        .select('beats, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Failed to load purchases:', error.message);
      } else {
        setPurchases(data || []);
      }

      setLoading(false);
    };

    fetchPurchases();
  }, [router]);

  if (loading) return null;

  const allBeats = purchases.flatMap(p => p.beats || []);

  const renderDownloads = (beat) => {
    const license = (beat.license || '').toLowerCase();

    return (
      <div className="flex flex-col gap-1 mt-2">
        {beat.audioUrl && (
          <a href={beat.audioUrl} download className="text-pink-600 underline text-sm">
            Download MP3
          </a>
        )}
        {(license.includes('premium') || license.includes('unlimited')) && beat.wav && (
          <a href={beat.wav} download className="text-pink-600 underline text-sm">
            Download WAV
          </a>
        )}
        {(license.includes('premium plus') || license.includes('unlimited')) && beat.stems && (
          <a href={beat.stems} download className="text-pink-600 underline text-sm">
            Download STEMS
          </a>
        )}
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen p-6 bg-white text-black">
        <h1 className="text-3xl font-bold mb-6">Your Downloads</h1>

        {allBeats.length === 0 ? (
          <p className="text-gray-600">You haven't purchased any beats yet.</p>
        ) : (
          <div className="space-y-4">
            {allBeats.map((beat, index) => (
              <div
                key={`${beat.id || index}-${beat.name}`}
                className="bg-gray-100 p-4 rounded shadow"
              >
                <h2 className="font-semibold">{beat.name}</h2>
                <p className="text-sm text-gray-500">
                  License: {beat.license || 'N/A'}
                </p>
                {renderDownloads(beat)}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
