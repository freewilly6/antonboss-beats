import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireAdmin, r2KeyFromUrl } from '../../lib/adminAuth';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Admin only: this deletes with the service-role key.
  if (!(await requireAdmin(req, res))) return;

  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Missing beat ID' });

  try {
    // Look the files up here rather than trusting keys from the client. The
    // client used to send just the last path segment, which dropped the
    // wav/ and stems/ folders, so those files were never actually deleted.
    const { data: beat, error: readErr } = await supabaseAdmin
      .from('BeatFiles')
      .select('audiourl, wav, stems')
      .eq('id', id)
      .single();
    if (readErr || !beat) return res.status(404).json({ error: 'Beat not found' });

    const { error: dbError } = await supabaseAdmin.from('BeatFiles').delete().eq('id', id);
    if (dbError) {
      console.error('[delete-beat] Supabase delete error:', dbError.message);
      return res.status(500).json({ error: dbError.message });
    }

    const keys = [beat.audiourl, beat.wav, beat.stems].map(r2KeyFromUrl).filter(Boolean);
    for (const key of keys) {
      try {
        await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
      } catch (err) {
        // The row is gone either way; a stray file is only wasted storage.
        console.warn(`[delete-beat] could not delete R2 object "${key}":`, err.message);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[delete-beat] unexpected error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
