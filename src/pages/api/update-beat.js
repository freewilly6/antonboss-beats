import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireAdmin } from '../../lib/adminAuth';

// Columns an edit may touch. Prices, licenses and ownership stay out of reach
// of a request body.
const EDITABLE = ['name', 'artist', 'genre', 'mood', 'key', 'bpm', 'audiourl', 'wav', 'stems', 'cover'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Admin only: this writes with the service-role key.
  if (!(await requireAdmin(req, res))) return;

  try {
    const { id, fieldsToUpdate } = req.body || {};

    if (!id || !fieldsToUpdate || typeof fieldsToUpdate !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid parameters' });
    }

    const updates = Object.fromEntries(
      Object.entries(fieldsToUpdate).filter(([k]) => EDITABLE.includes(k))
    );
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const { error } = await supabaseAdmin
      .from('BeatFiles')
      .update(updates)
      .eq('id', id);

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
