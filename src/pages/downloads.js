// pages/downloads.js
import { useEffect, useState } from 'react';
import { useRouter }     from 'next/router';
import Layout            from '@/components/Layout';
import { supabase }      from '@/lib/supabaseClient';

export default function DownloadsPage() {
  const [downloadItems, setDownloadItems] = useState([]);
  const [loading, setLoading]             = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchDownloads() {
      // 1) Ensure logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/signin?redirectTo=/downloads');
        return;
      }

      const userId    = session.user.id;
      const userEmail = session.user.email;

      // 2) Fetch all purchases by user_id OR by email (seeded rows use email) :contentReference[oaicite:1]{index=1}
      const orFilter = `user_id.eq.${userId},email.eq."${userEmail}"`;
      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('beats, created_at')
        .or(orFilter)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading purchases:', error);
        setLoading(false);
        return;
      }

      // 3) Flatten the beats array and carry over the purchase date
      const items = purchases.flatMap(p => {
        let beatsArr = p.beats;
        if (typeof beatsArr === 'string') {
          try { beatsArr = JSON.parse(beatsArr); }
          catch  { beatsArr = []; }
        }
        return beatsArr.map(b => {
          // normalize your keys
          const license = b.licenseType ?? b.license ?? b.name ?? '';
          const mp3Url   = b.audioUrl  ?? b.mp3   ?? b.file_path;
          const wavUrl   = b.wav;
          const stemsUrl = b.stems;

          return {
            id:          b.id ?? b.beatId,
            name:        b.name,
            license:     license.trim(),
            mp3Url,
            wavUrl,
            stemsUrl,
            purchasedAt: p.created_at,
          };
        });
      });

      setDownloadItems(items);
      setLoading(false);
    }

    fetchDownloads();
  }, [router]);

  // — Loading state
  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20">Loading your downloads…</div>
      </Layout>
    );
  }

  // — Empty state
  if (downloadItems.length === 0) {
    return (
      <Layout>
        <div className="text-center py-20">
          You haven’t purchased anything yet.
        </div>
      </Layout>
    );
  }

  // define your tiers in order
  const TIERS = [
    'Basic License',         // 0
    'Premium License',       // 1
    'Premium Plus License',  // 2
    'Unlimited License'      // 3
  ];

  // — Render downloads
  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Your Downloads</h1>
        <div className="space-y-4">
          {downloadItems.map(item => {
            const tierIndex = TIERS.indexOf(item.license);
            return (
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
                  {/* MP3 for everyone */}
                  {item.mp3Url && (
                    <a href={item.mp3Url} download className="text-pink-600 hover:underline">
                      Download MP3
                    </a>
                  )}
                  {/* WAV for Premium and above */}
                  {tierIndex >= 1 && item.wavUrl && (
                    <a href={item.wavUrl} download className="text-pink-600 hover:underline">
                      Download WAV
                    </a>
                  )}
                  {/* Stems for Premium Plus and Unlimited */}
                  {tierIndex >= 2 && item.stemsUrl && (
                    <a href={item.stemsUrl} download className="text-pink-600 hover:underline">
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
