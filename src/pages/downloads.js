// src/pages/downloads.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Navbar from '../components/Navbar';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function DownloadsPage() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [allBeats, setAllBeats] = useState([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/signin?redirectTo=/downloads');
        return;
      }

      const u = session.user;
      setUser(u);
      const adminFlag = u.email === ADMIN_EMAIL;
      setIsAdmin(adminFlag);

      if (adminFlag) {
        // ADMIN: fetch every beat, no licenseType column in BeatFiles
        const { data: beats, error } = await supabase
          .from('BeatFiles')
          .select('id, name, audiourl, wav, stems');
        if (error) {
          console.error('❌ Failed to load BeatFiles:', error.message);
        } else {
          setAllBeats(beats || []);
        }
      } else {
        // REGULAR: fetch only your own purchases, including any top-level URLs
        const { data, error } = await supabase
          .from('purchases')
          .select('id, beats, created_at, audiourl, wav, stems')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Failed to load purchases:', error.message);
        } else {
          setPurchases(data || []);
        }
      }

      setLoading(false);
    }
    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  let content;
  if (isAdmin) {
    // Show raw BeatFiles (no per-beat license here)
    content = (
      <div className="space-y-4">
        {allBeats.map((beat) => (
          <div key={beat.id} className="bg-gray-100 p-4 rounded shadow">
            <h3 className="font-semibold">{beat.name}</h3>
            <div className="flex flex-col gap-1 mt-2">
              {beat.audiourl && (
                <a
                  href={beat.audiourl}
                  download
                  className="text-pink-600 underline text-sm"
                >
                  Download MP3
                </a>
              )}
              {beat.wav && (
                <a
                  href={beat.wav}
                  download
                  className="text-pink-600 underline text-sm"
                >
                  Download WAV
                </a>
              )}
              {beat.stems && (
                <a
                  href={beat.stems}
                  download
                  className="text-pink-600 underline text-sm"
                >
                  Download STEMS
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  } else if (purchases.length === 0) {
    content = (
      <p className="text-gray-600">You haven&apos;t purchased any beats yet.</p>
    );
  } else {
    // Show only this user's purchases (each JSON beat has its `license`, `audioUrl`, etc.)
    content = (
      <div className="space-y-8">
        {purchases.map((purchase) => (
          <div key={purchase.id} className="space-y-4">
            <h2 className="text-xl font-semibold">
              Purchased on{' '}
              {new Date(purchase.created_at).toLocaleDateString()}
            </h2>
            <div className="space-y-4">
              {(purchase.beats || []).map((beat, idx) => {
                const lic = (beat.license || '').toLowerCase();
                // Prefer URLs embedded in each beat; fall back to top-level columns if needed
                const mp3   = beat.audiourl || purchase.audiourl;
                const wav   = beat.wav      || purchase.wav;
                const stems = beat.stems    || purchase.stems;

                return (
                  <div
                    key={beat.id ?? idx}
                    className="bg-gray-100 p-4 rounded shadow"
                  >
                    <h3 className="font-semibold">{beat.name}</h3>
                    <p className="text-sm text-gray-500">
                      License: {beat.license || 'N/A'}
                    </p>
                    <div className="flex flex-col gap-1 mt-2">
                      {mp3 && (
                        <a
                          href={mp3}
                          download
                          className="text-pink-600 underline text-sm"
                        >
                          Download MP3
                        </a>
                      )}
                      {(lic.includes('premium') || lic.includes('unlimited')) &&
                        wav && (
                          <a
                            href={wav}
                            download
                            className="text-pink-600 underline text-sm"
                          >
                            Download WAV
                          </a>
                        )}
                      {(lic.includes('premium plus') ||
                        lic.includes('unlimited')) &&
                        stems && (
                          <a
                            href={stems}
                            download
                            className="text-pink-600 underline text-sm"
                          >
                            Download STEMS
                          </a>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen p-6 bg-white text-black">
        <button
          onClick={() => router.push('/cart')}
          className="mb-4 bg-pink-500 hover:bg-pink-600 text-white font-semibold px-4 py-2 rounded"
        >
          ← Back to Cart
        </button>
        <h1 className="text-3xl font-bold mb-6">Your Downloads</h1>
        {content}
      </div>
    </>
  );
}
