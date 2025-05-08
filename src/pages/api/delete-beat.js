import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Confirm body was parsed properly
    const body = req.body;
    console.log('🟢 Received delete request body:', body);

    if (!body || typeof body !== 'object') {
      console.error('❌ Invalid JSON body:', body);
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { id, userId, audioKey, wavKey, stemsKey } = body;

    if (!id || !userId) {
      console.error('❌ Missing required fields: id or userId');
      return res.status(400).json({ error: 'Missing beat ID or user ID' });
    }

    console.log(`🔄 Deleting beat ${id} for user ${userId}`);

    // Delete from Supabase
    const { error: dbError } = await supabaseAdmin
      .from('BeatFiles')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (dbError) {
      console.error('❌ Supabase delete error:', dbError.message);
      return res.status(500).json({ error: dbError.message });
    }

    // Delete associated R2 objects
    const keys = [audioKey, wavKey, stemsKey].filter(k => typeof k === 'string' && k.trim());
    console.log('🗑️ Deleting from R2:', keys);

    for (const key of keys) {
      try {
        await r2.send(new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: key,
        }));
        console.log(`✅ Deleted R2 object: ${key}`);
      } catch (err) {
        console.warn(`⚠️ Failed to delete R2 object "${key}":`, err.message);
      }
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('🔥 Unhandled server error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
