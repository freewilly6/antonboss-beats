import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id, userId, fieldsToUpdate } = req.body;

    if (!id || !userId || !fieldsToUpdate || typeof fieldsToUpdate !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid parameters' });
    }

    const { error } = await supabaseAdmin
      .from('BeatFiles')
      .update(fieldsToUpdate)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Supabase update error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('🔥 Unexpected server error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
