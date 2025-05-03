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
        .select('id, beats, created_at')
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

  // Spinner while loading
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen p-6 bg-white text-black">
        {/* Back to Cart */}
        <button
          onClick={() => router.push('/cart')}
          className="mb-4 bg-pink-500 hover:bg-pink-600 text-white font-semibold px-4 py-2 rounded"
        >
          ← Back to Cart
        </button>

        <h1 className="text-3xl font-bold mb-6">Your Downloads</h1>

        {/* No purchases */}
        {purchases.length === 0 ? (
          <p className="text-gray-600">
            You haven&apos;t purchased any beats yet.
          </p>
        ) : (
          <div className="space-y-8">
            {/* One card per purchase session */}
            {purchases.map((purchase) => (
              <div key={purchase.id} className="space-y-4">
                <h2 className="text-xl font-semibold">
                  Purchased on{' '}
                  {new Date(purchase.created_at).toLocaleDateString()}
                </h2>

                <div className="space-y-4">
                  {(purchase.beats || []).map((beat, idx) => {
                    const lic = (beat.license || '').toLowerCase();
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
                          {beat.audioUrl && (
                            <a
                              href={beat.audioUrl}
                              download
                              className="text-pink-600 underline text-sm"
                            >
                              Download MP3
                            </a>
                          )}
                          {(lic.includes('premium') || lic.includes('unlimited')) &&
                            beat.wav && (
                              <a
                                href={beat.wav}
                                download
                                className="text-pink-600 underline text-sm"
                              >
                                Download WAV
                              </a>
                            )}
                          {(lic.includes('premium plus') ||
                            lic.includes('unlimited')) &&
                            beat.stems && (
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
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
