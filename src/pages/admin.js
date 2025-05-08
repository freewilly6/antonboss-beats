// pages/admin.js

import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';
import { createServerClient } from '@supabase/ssr';

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // ✅ Added loading state for auth
  const [beatFiles, setBeatFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newForm, setNewForm] = useState({
    name: '',
    artist: '',
    genre: '',
    mood: '',
    key: '',
    bpm: '',
    wav: null,
    stems: null,
  });
  const [coverFile, setCoverFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);


  // AUTH & INITIAL DATA FETCH
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser()
      const email = data?.user?.email?.toLowerCase() || ''
  
      if (error || email !== 'antonbosspd@gmail.com') {
        setAccessDenied(true)
      } else {
        setUser(data.user)
        fetchBeatFiles()
      }
      setIsLoading(false)
    })()
  }, [])
  

  // REALTIME SUBSCRIPTION
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('realtime:beats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'BeatFiles' },
        fetchBeatFiles
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  const fetchBeatFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('BeatFiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setMessage(`Error loading beats: ${error.message}`);
    else setBeatFiles(data);
    setLoading(false);
  };

  const uploadToR2 = async (file, folder = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    const res = await fetch('/api/upload-beats', { method: 'POST', body: formData });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    return result.url;
  };

  const handleEdit = (beat) => {
    setEditingId(beat.id);
    setEditForm({
      name: beat.name || '',
      artist: beat.artist || '',
      genre: beat.genre || '',
      mood: beat.mood || '',
      key: beat.key || '',
      bpm: beat.bpm || '',  // keep existing string
    });
  };

  const handleEditChange = (field, val) => {
    setEditForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSaveEdit = async () => {
    if (!user?.id) return setMessage('❌ Not authorized.');
    const updates = {
      ...editForm,
      bpm: editForm.bpm, // leave as string
    };
    const { error } = await supabase
      .from('BeatFiles')
      .update(updates)
      .eq('id', editingId)
      .eq('user_id', user.id);
    if (error) setMessage(`Failed to save: ${error.message}`);
    else {
      setMessage('✅ Beat updated');
      setEditingId(null);
      setEditForm({});
    }
  };

  const handleReplaceFile = async (file, type) => {
    if (!file || !editingId || !user?.id) {
      return setMessage('❌ Invalid file or session.');
    }
    if (type === 'stems' && !file.name.endsWith('.zip')) {
      return setMessage('❌ Stems must be a .zip file');
    }
    try {
      const url = await uploadToR2(
        file,
        type === 'wav' ? 'wav' : type === 'stems' ? 'stems' : ''
      );
      const column =
        type === 'audio' ? 'audiourl' :
        type === 'wav'   ? 'wav'      :
        type === 'stems' ? 'stems'    : null;
      if (!column) return setMessage('❌ Unknown file type');
      const { error } = await supabase
        .from('BeatFiles')
        .update({ [column]: url })
        .eq('id', editingId)
        .eq('user_id', user.id);
      if (error) throw new Error(error.message);
      setMessage(`✅ ${type.toUpperCase()} updated`);
    } catch (err) {
      setMessage(`❌ Upload failed: ${err.message}`);
    }
  };

  const handleDelete = async (beat) => {
    if (!user?.id) return setMessage('❌ Not authorized.');
    const audioKey = beat.audiourl?.split('/').pop();
    const wavKey   = beat.wav?.split('/').pop();
    const stemsKey = beat.stems?.split('/').pop();
    const prev = [...beatFiles];
    setBeatFiles(prev.filter((b) => b.id !== beat.id));
    setDeletingId(beat.id);
    try {
      const res = await fetch('/api/delete-beat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: beat.id, userId: user.id, audioKey, wavKey, stemsKey }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unknown error');
      setMessage('🗑️ Beat deleted');
    } catch (err) {
      setBeatFiles(prev);
      setMessage(`❌ Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddBeat = async () => {
    if (!user?.id || !audioFile || !coverFile || !newForm.name) {
      return setMessage('Please fill all fields and upload required files.');
    }
    try {
      const [audioUrl, wavUrl, stemsUrl] = await Promise.all([
        uploadToR2(audioFile, ''),
        newForm.wav   ? uploadToR2(newForm.wav,   'wav')   : null,
        newForm.stems ? uploadToR2(newForm.stems, 'stems') : null,
      ]);

      const coverPath = `${Date.now()}-${coverFile.name.replace(/[^a-z0-9.\-_]/gi, '_')}`;
      const { error: coverErr } = await supabase.storage
        .from('covers')
        .upload(coverPath, coverFile, { upsert: true, contentType: coverFile.type });
      if (coverErr) return setMessage('❌ Cover upload failed');
      const { data: coverUrlData } = supabase.storage.from('covers').getPublicUrl(coverPath);

      const licenses = [
        { name: 'Basic',     price: 29.99,  file_path: audioUrl },
        { name: 'Standard',  price: 49.99,  file_path: audioUrl },
        { name: 'Premium',   price: 79.99,  file_path: audioUrl },
        { name: 'Exclusive', price: 199.99, file_path: audioUrl },
      ];

      const { error } = await supabase
        .from('BeatFiles')
        .insert([{
          ...newForm,
          bpm: newForm.bpm,          // store the raw string
          audiourl: audioUrl,
          wav: wavUrl,
          stems: stemsUrl,
          cover: coverUrlData.publicUrl,
          user_id: user.id,
          licenses,
        }]);
      if (error) throw new Error(error.message);

      setMessage('✅ Beat added');
      setNewForm({ name: '', artist: '', genre: '', mood: '', key: '', bpm: '', wav: null, stems: null });
      setAudioFile(null);
      setCoverFile(null);
    } catch (err) {
      setMessage(`❌ Upload failed: ${err.message}`);
    }
  };

  if (accessDenied) return <Layout><p className="text-center mt-20 text-xl">🚫 Access Denied</p></Layout>;
  if (!user)          return <Layout><p className="text-center mt-20 text-xl">🔄 Loading...</p></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto mt-10 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Manage BeatFiles</h1>
        {message && <p className="mb-4 text-blue-600 text-sm">{message}</p>}

        {/* Add New Beat */}
        <div className="mb-8 border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Add New Beat</h2>
          <div className="grid grid-cols-2 gap-4">
            {['name','artist','genre','mood','key'].map(f => (
              <input
                key={f}
                type="text"
                className="border p-2"
                placeholder={f.charAt(0).toUpperCase()+f.slice(1)}
                value={newForm[f]}
                onChange={e => setNewForm({...newForm,[f]:e.target.value})}
              />
            ))}
            {/* BPM as free text */}
            <input
              type="text"
              className="border p-2"
              placeholder="BPM (e.g. 86 Bpm)"
              value={newForm.bpm}
              onChange={e => setNewForm({...newForm, bpm: e.target.value})}
            />
            {/* File inputs */}
            <div><label className="block mb-1">MP3 File:</label>
              <input type="file" accept="audio/mpeg" onChange={e=>setAudioFile(e.target.files[0])}/>
            </div>
            <div><label className="block mb-1">WAV File:</label>
              <input type="file" accept=".wav"   onChange={e=>setNewForm({...newForm, wav: e.target.files[0]})}/>
            </div>
            <div><label className="block mb-1">STEMS (.zip):</label>
              <input type="file" accept=".zip"   onChange={e=>setNewForm({...newForm, stems: e.target.files[0]})}/>
            </div>
            <div><label className="block mb-1">Cover Image:</label>
              <input type="file" accept="image/*" onChange={e=>setCoverFile(e.target.files[0])}/>
            </div>
          </div>
          <button
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleAddBeat}
          >➕ Add Beat</button>
        </div>

        {/* Beats Table */}
        <h2 className="text-xl font-semibold mb-2">Your Beats</h2>
        {loading
          ? <p className="text-center text-gray-500">🔄 Loading beats...</p>
          : (
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-2">Cover</th>
                  <th className="border px-2 py-2">Audio</th>
                  <th className="border px-2 py-2">Info</th>
                  <th className="border px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {beatFiles.map(beat => (
                  <tr key={beat.id}>
                    <td className="border p-2">
                      <img src={beat.cover} alt="Cover" className="w-16 h-16 object-cover rounded"/>
                    </td>
                    <td className="border p-2">
                      {beat.audiourl
                        ? <audio
                            controls
                            src={beat.audiourl}
                            className="w-40"
                            crossOrigin="anonymous"
                            onError={()=>setMessage(`❌ Could not load preview for "${beat.name}"`)}
                          >Your browser does not support audio.</audio>
                        : <p className="text-sm text-gray-500 italic">No audio preview</p>
                      }
                    </td>
                    <td className="border p-2">
                      {editingId === beat.id
                        ? <>
                            {['name','artist','genre','mood','key'].map(f => (
                              <input
                                key={f}
                                type="text"
                                className="border w-full my-1 p-1"
                                placeholder={f.charAt(0).toUpperCase()+f.slice(1)}
                                value={editForm[f]}
                                onChange={e=>handleEditChange(f, e.target.value)}
                              />
                            ))}
                            {/* BPM editable as free text */}
                            <input
                              type="text"
                              className="border w-full my-1 p-1"
                              placeholder="BPM (e.g. 86 Bpm)"
                              value={editForm.bpm}
                              onChange={e=>handleEditChange('bpm', e.target.value)}
                            />
                            <div className="flex flex-col gap-2 mt-2 text-sm">
                              <div className="flex gap-3 flex-wrap">
                                <button
                                  onClick={()=>document.getElementById(`audio-upload-${beat.id}`).click()}
                                  className="text-blue-500"
                                >🎵 Replace MP3</button>
                                <button
                                  onClick={()=>document.getElementById(`wav-upload-${beat.id}`).click()}
                                  className="text-purple-500"
                                >🔊 Replace WAV</button>
                                <button
                                  onClick={()=>document.getElementById(`stems-upload-${beat.id}`).click()}
                                  className="text-orange-500"
                                >📦 Replace STEMS</button>
                              </div>
                              <input
                                type="file"
                                id={`audio-upload-${beat.id}`}
                                hidden
                                accept="audio/mpeg"
                                onChange={e=>handleReplaceFile(e.target.files[0],'audio')}
                              />
                              <input
                                type="file"
                                id={`wav-upload-${beat.id}`}
                                hidden
                                accept=".wav"
                                onChange={e=>handleReplaceFile(e.target.files[0],'wav')}
                              />
                              <input
                                type="file"
                                id={`stems-upload-${beat.id}`}
                                hidden
                                accept=".zip"
                                onChange={e=>handleReplaceFile(e.target.files[0],'stems')}
                              />
                            </div>
                          </>
                        : (
                            <>
                              <p><strong>{beat.name}</strong> by {beat.artist}</p>
                              <p className="text-xs">
                                Key: {beat.key}, {beat.bpm}
                              </p>
                            </>
                          )
                      }
                    </td>
                    <td className="border p-2 space-x-2">
                      {editingId === beat.id
                        ? <>
                            <button onClick={handleSaveEdit} className="text-green-600">💾 Save</button>
                            <button onClick={()=>{setEditingId(null); setEditForm({});}} className="text-gray-500">Cancel</button>
                          </>
                        : <>
                            <button onClick={()=>handleEdit(beat)} className="text-blue-600">✏️ Edit</button>
                            <button
                              onClick={()=>handleDelete(beat)}
                              className="text-red-600"
                              disabled={deletingId===beat.id}
                            >🗑 Delete</button>
                          </>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </Layout>
  );
}
