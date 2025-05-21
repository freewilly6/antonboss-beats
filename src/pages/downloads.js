import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';

export default function DownloadsPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading]     = useState(true);
  const router                    = useRouter();

  useEffect(() => {
    async function fetchPurchases() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/signin?redirectTo=/downloads');
        return;
      }

      const userId = session.user.id;
      const { data, error } = await supabase
        .from('purchases')
        .select('beats, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading purchases:', error);
        setPurchases([]);
      } else {
        setPurchases(data);
      }
      setLoading(false);
    }

    fetchPurchases();
  }, [router]);

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20">Loading your downloads…</div>
      </Layout>
    );
  }

  if (purchases.length === 0) {
    return (
      <Layout>
        <div className="text-center py-20">
          You haven’t purchased anything yet.
        </div>
      </Layout>
    );
  }

  // Flatten and parse beats, attach purchase timestamp
  const downloadItems = purchases.flatMap((purchase) => {
    let beatsArr = purchase.beats;
    if (typeof beatsArr === 'string') {
      try {
        beatsArr = JSON.parse(beatsArr);
      } catch (err) {
        console.error('Failed to parse purchase.beats:', purchase.beats);
        beatsArr = [];
      }
    }
    return beatsArr.map((item) => ({
      ...item,
      purchasedAt: purchase.created_at,
    }));
  });

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Your Downloads</h1>
        <div className="space-y-4">
          {downloadItems.map((item) => (
            <div
              key={`${item.id}-${item.license}-${item.purchasedAt}`}
              className="p-4 bg-white shadow rounded-lg"
            >
              <h2 className="font-semibold text-lg">
                {item.name}{' '}
                <span className="text-gray-500">({item.license})</span>
              </h2>
              <p className="text-sm text-gray-400 mb-2">
                Purchased on{' '}
                {new Date(item.purchasedAt).toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href={item.audioUrl}
                  download
                  className="text-pink-600 hover:underline"
                >
                  Download MP3
                </a>
                {item.wav && (
                  <a
                    href={item.wav}
                    download
                    className="text-pink-600 hover:underline"
                  >
                    Download WAV
                  </a>
                )}
                {item.stems && (
                  <a
                    href={item.stems}
                    download
                    className="text-pink-600 hover:underline"
                  >
                    Download Stems
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
