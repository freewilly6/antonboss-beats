// pages/downloads.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';

export default function DownloadsPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchPurchases() {
      const { data: { session }} = await supabase.auth.getSession();
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

  // Flatten & parse beats, preserving whatever keys you saved (beatId/id, licenseType, etc.)
  const downloadItems = purchases.flatMap(purchase => {
    let beatsArr = purchase.beats;
    if (typeof beatsArr === 'string') {
      try { beatsArr = JSON.parse(beatsArr) }
      catch { beatsArr = [] }
    }
    return beatsArr.map(item => ({
      ...item,
      purchasedAt: purchase.created_at,
    }));
  });

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Your Downloads</h1>
        <div className="space-y-4">
          {downloadItems.map(item => {
           const itemId = item.id ?? item.beatId;
            // normalize your license field
            const license = item.licenseType ?? item.license ?? '';

            // the three possible files
            const mp3Url   = item.audioUrl ?? item.mp3;
            const wavUrl   = item.wav;
            const stemsUrl = item.stems;

            // flags for which links to show
            const isBasic       = license === 'Basic License';
            const isPremium     = license === 'Premium License';
            const isPremiumPlus = license === 'Premium Plus License';
            const isUnlimited   = license === 'Unlimited License';

            return (
              <div
                key={`${itemId}-${license}-${item.purchasedAt}`}
                className="p-4 bg-white shadow rounded-lg"
              >
                <h2 className="font-semibold text-lg">
                  {item.name}
                  {license && (
                    <span className="text-gray-500"> ({license})</span>
                  )}
                </h2>
                <p className="text-sm text-gray-400 mb-2">
                  Purchased on{' '}
                  {new Date(item.purchasedAt).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-4">
                  {/* always show MP3 if it exists */}
                  {mp3Url && (
                    <a href={mp3Url} download className="text-pink-600 hover:underline">
                      Download MP3
                    </a>
                  )}

                  {/* show WAV only for Premium or better */}
                  {(isPremium || isPremiumPlus || isUnlimited) && wavUrl && (
                    <a href={wavUrl} download className="text-pink-600 hover:underline">
                      Download WAV
                    </a>
                  )}

                  {/* show Stems only for Premium Plus or Unlimited */}
                  {(isPremiumPlus || isUnlimited) && stemsUrl && (
                    <a href={stemsUrl} download className="text-pink-600 hover:underline">
                      Download Stems
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
