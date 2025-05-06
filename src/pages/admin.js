// pages/admin.js
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';
import { createServerSupabaseClient } from '@/utils/supabase/server';

export const getServerSideProps = async ({ req, res }) => {
  const supabaseServer = createServerSupabaseClient(req, res);

  // 1) read the session cookie
  const {
    data: { session },
  } = await supabaseServer.auth.getSession();

  const user = session?.user ?? null;
  let accessDenied = false;

  if (!user) {
    // no session
    accessDenied = true;
  } else {
    // check email
    const { data: profile, error } = await supabaseServer
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (error || profile.email !== 'antonbosspd@gmail.com') {
      accessDenied = true;
    }
  }

  return {
    props: {
      initialSession: session ?? null,
      user,
      accessDenied,
    },
  };
};

export default function AdminPage({ user, accessDenied }) {
  // ─── Hooks (always in the same order) ─────────────────────────────────────────
  const [beatFiles, setBeatFiles]     = useState([]);
  const [message, setMessage]         = useState('');
  const [editingId, setEditingId]     = useState(null);
  const [editForm, setEditForm]       = useState({});
  const [newForm, setNewForm]         = useState({
    name: '', artist: '', genre: '', mood: '',
    key: '', bpm: '', wav: '', stems: '',
  });
  const [coverFile, setCoverFile]     = useState(null);
  const [audioFile, setAudioFile]     = useState(null);

  // ─── Data-fetch helper ───────────────────────────────────────────────────────
  const fetchBeatFiles = async () => {
    const { data, error } = await supabase
      .from('BeatFiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setMessage(`Error loading beats: ${error.message}`);
    } else {
      setBeatFiles(data);
    }
  };

  // ─── Effects ─────────────────────────────────────────────────────────────────
  // load beats on mount (only if allowed)
  useEffect(() => {
    if (!accessDenied) {
      fetchBeatFiles();
    }
  }, [accessDenied]);

  // clear flash messages after 4s
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(t);
  }, [message]);

  // ─── Access guard (after all hooks) ─────────────────────────────────────────
  if (accessDenied) {
    return (
      <Layout>
        <p className="text-center mt-20 text-xl">🚫 Access Denied</p>
      </Layout>
    );
  }

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleEdit = (beat) => {
    setEditingId(beat.id);
    setEditForm({ ...beat });
  };

  const handleEditChange = (field, val) =>
    setEditForm(prev => ({ ...prev, [field]: val }));

  const handleSaveEdit = async () => {
    const { error } = await supabase
      .from('BeatFiles')
      .update(editForm)
      .eq('id', editingId)
      .eq('user_id', user.id);

    if (error) {
      setMessage(`Failed to save: ${error.message}`);
    } else {
      setMessage('✅ Beat updated');
      setEditingId(null);
      fetchBeatFiles();
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from('BeatFiles')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      setMessage(`Delete failed: ${error.message}`);
    } else {
      setMessage('🗑️ Beat deleted');
      fetchBeatFiles();
    }
  };

  const handleReplaceFile = async (file, type) => {
    if (!file || !editingId) {
      return setMessage('❌ Invalid file or session.');
    }
    const sanitized = file.name.replace(/[^a-z0-9.\-_]/gi, '_');
    const bucket    = type === 'audio' ? 'audio' : 'covers';
    const filePath  = `${Date.now()}-${sanitized}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert: true,
        contentType: type === 'audio' ? 'audio/mpeg' : file.type,
      });
    if (uploadError) {
      console.error(uploadError);
      return setMessage(`❌ Upload error: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
      error: publicError,
    } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (publicError) {
      console.error(publicError);
      return setMessage('❌ Couldn’t get public URL');
    }

    const column = type === 'audio' ? 'audiourl' : 'cover';
    const { error: updateError } = await supabase
      .from('BeatFiles')
      .update({ [column]: publicUrl })
      .eq('id', editingId)
      .eq('user_id', user.id);

    if (updateError) {
      setMessage(`DB update failed: ${updateError.message}`);
    } else {
      setMessage(`✅ ${type} file updated`);
      setEditForm(prev => ({ ...prev, [column]: publicUrl }));
      fetchBeatFiles();
    }
  };

  const handleAddBeat = async () => {
    if (!audioFile || !coverFile || !newForm.name) {
      return setMessage('Please fill all fields and upload audio & cover.');
    }

    // Upload audio
    const audioPath = `${Date.now()}-${audioFile.name.replace(/[^a-z0-9.\-_]/gi, '_')}`;
    const { error: audioErr } = await supabase.storage
      .from('audio')
      .upload(audioPath, audioFile, {
        upsert: true,
        contentType: 'audio/mpeg',
      });
    if (audioErr) {
      console.error(audioErr);
      return setMessage('❌ Audio upload failed');
    }

    // Upload cover
    const coverPath = `${Date.now()}-${coverFile.name.replace(/[^a-z0-9.\-_]/gi, '_')}`;
    const { error: coverErr } = await supabase.storage
      .from('covers')
      .upload(coverPath, coverFile, {
        upsert: true,
        contentType: coverFile.type,
      });
    if (coverErr) {
      console.error(coverErr);
      return setMessage('❌ Cover upload failed');
    }

    // Get URLs
    const { data: { publicUrl: audiourl }, error: auUrlErr } =
      supabase.storage.from('audio').getPublicUrl(audioPath);
    const { data: { publicUrl: cover }, error: cvUrlErr } =
      supabase.storage.from('covers').getPublicUrl(coverPath);
    if (auUrlErr || cvUrlErr) {
      console.error(auUrlErr, cvUrlErr);
      return setMessage('❌ Failed to get public URLs');
    }

    const licenses = [
      { name: 'Basic',     price: 29.99,  file_path: audiourl },
      { name: 'Standard',  price: 49.99,  file_path: audiourl },
      { name: 'Premium',   price: 79.99,  file_path: audiourl },
      { name: 'Exclusive', price: 199.99, file_path: audiourl },
    ];

    const { error } = await supabase
      .from('BeatFiles')
      .insert([{
        ...newForm,
        audiourl,
        cover,
        user_id: user.id,
        licenses,
      }]);

    if (error) {
      console.error(error);
      setMessage(`Insert error: ${error.message}`);
    } else {
      setMessage('✅ Beat added with 4 licenses');
      setNewForm({
        name: '', artist: '', genre: '', mood: '',
        key: '', bpm: '', wav: '', stems: '',
      });
      setAudioFile(null);
      setCoverFile(null);
      fetchBeatFiles();
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto mt-10 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Manage BeatFiles</h1>
        {message && <p className="mb-4 text-blue-600 text-sm">{message}</p>}

        {/* …the rest of your table/form JSX stays exactly the same… */}
      </div>
    </Layout>
  );
}
