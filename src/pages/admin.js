// pages/admin.js

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';

export default function AdminPage() {
  // 🔐 Auth & data
  const [user, setUser]                 = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [beatFiles, setBeatFiles]       = useState([]);
  const [loadingBeats, setLoadingBeats] = useState(true);
  const [message, setMessage]           = useState('');

  // ➕ “Add New Beat” modal & form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '', artist: '', genre: '', mood: '', key: '', bpm: ''
  });
  const [audioFile, setAudioFile] = useState(null);
  const [wavFile, setWavFile]     = useState(null);
  const [stemsFile, setStemsFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  // ✏️ Inline edit state & form
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm]   = useState({});
  
  // 🔍 Search + sort + pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption]   = useState('created_at-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 📂 Drag-and-drop hooks for Add
  const onDropAudio = useCallback(files => setAudioFile(files[0]), []);
  const { getRootProps: getAudioRoot, getInputProps: getAudioInput } = useDropzone({
    onDrop: onDropAudio, accept: 'audio/mpeg', multiple: false,
  });

  const onDropWav = useCallback(files => setWavFile(files[0]), []);
  const { getRootProps: getWavRoot, getInputProps: getWavInput } = useDropzone({
    onDrop: onDropWav,
    multiple: false,
    accept: {
      'audio/wav':      ['.wav'],
      'audio/x-wav':    ['.wav'],
      'audio/wave':     ['.wav'],
    },
  });

  const onDropStems = useCallback(files => setStemsFile(files[0]), []);
  const { getRootProps: getStemsRoot, getInputProps: getStemsInput } = useDropzone({
    onDrop: onDropStems,
    multiple: false,
    accept: {
      'application/zip':            ['.zip'],
      'application/x-zip-compressed':['.zip'],
    },
  });

  const onDropCover = useCallback(files => setCoverFile(files[0]), []);
  const { getRootProps: getCoverRoot, getInputProps: getCoverInput } = useDropzone({
    onDrop: onDropCover, accept: 'image/*', multiple: false,
  });

  // 🔄 Fetch beats from Supabase
  const fetchBeatFiles = async () => {
    setLoadingBeats(true);
    const { data, error } = await supabase
      .from('BeatFiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setMessage(`Error loading beats: ${error.message}`);
    else setBeatFiles(data);
    setLoadingBeats(false);
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      const email = data?.user?.email?.toLowerCase() || '';
      if (error || email !== 'antonbosspd@gmail.com') {
        setAccessDenied(true);
      } else {
        setUser(data.user);
        fetchBeatFiles();
      }
    })();
  }, []);

  // 🛠 Search + sort logic
  const filteredSorted = useMemo(() => {
    let arr = beatFiles.filter(b =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const [field, dir] = sortOption.split('-');
    arr.sort((a, b) => {
      let va = a[field] || '', vb = b[field] || '';
      if (field === 'bpm') {
        va = parseInt(va.replace(/\D/g,'')) || 0;
        vb = parseInt(vb.replace(/\D/g,'')) || 0;
      }
      if (va < vb) return dir==='asc' ? -1 : 1;
      if (va > vb) return dir==='asc' ? 1  : -1;
      return 0;
    });
    return arr;
  }, [beatFiles, searchQuery, sortOption]);

  const pageCount = Math.ceil(filteredSorted.length / pageSize);
  const paginated = useMemo(() =>
    filteredSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
  [filteredSorted, currentPage]);

  // ☁️ R2 upload helper
  const uploadToR2 = async (file, folder = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    const res = await fetch('/api/upload-beats', { method: 'POST', body: formData });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.url;
  };

  // ➕ Add New Beat handler
  const handleAddBeat = async () => {
    const errs = {};
    if (!newForm.name)  errs.name  = 'Name required';
    if (!audioFile)     errs.audio = 'MP3 required';
    if (!coverFile)     errs.cover = 'Cover required';
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    setUploading(true);
    try {
      const [audioUrl, wavUrl, stemsUrl] = await Promise.all([
        uploadToR2(audioFile, ''), 
        wavFile   ? uploadToR2(wavFile,   'wav')   : null,
        stemsFile ? uploadToR2(stemsFile, 'stems') : null,
      ]);

      // cover → Supabase storage
      const coverPath = `${Date.now()}-${coverFile.name.replace(/[^a-z0-9.\-_]/gi,'_')}`;
      const { error: covErr } = await supabase
        .storage.from('covers')
        .upload(coverPath, coverFile, { upsert: true, contentType: coverFile.type });
      if (covErr) throw covErr;
      const { data: { publicUrl: coverUrl } } = supabase
        .storage.from('covers').getPublicUrl(coverPath);

      // insert
      const { error: dbErr } = await supabase
        .from('BeatFiles')
        .insert([{
          ...newForm,
          bpm:      newForm.bpm,
          audiourl: audioUrl,
          wav:      wavUrl,
          stems:    stemsUrl,
          cover:    coverUrl,
          user_id:  user.id,
          licenses: [
            { name:'Basic',     price:24.99,  file_path:audioUrl },
            { name:'Premium',  price:34.99,  file_path:wavUrl },
            { name:'Premium-Plus',   price:49.99,  file_path:stemsUrl },
            { name:'Unlimited', price:99.99, file_path:stemsUrl },
          ],
        }]);
      if (dbErr) throw dbErr;

      setMessage('✅ Beat added');
      setShowAddModal(false);
      setNewForm({ name:'',artist:'',genre:'',mood:'',key:'',bpm:'' });
      setAudioFile(null); setWavFile(null);
      setStemsFile(null); setCoverFile(null);
      fetchBeatFiles();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // ✏️ Begin editing a beat
  const handleEdit = (beat) => {
    setEditingId(beat.id);
    setEditForm({
      name: beat.name || '',
      artist: beat.artist || '',
      genre: beat.genre || '',
      mood: beat.mood || '',
      key: beat.key || '',
      bpm: beat.bpm || '',
    });
  };

  // ✏️ Handle input changes in edit form
  const handleEditChange = (field, val) => {
    setEditForm(prev => ({ ...prev, [field]: val }));
  };

  // ✏️ Save edits
  const handleSaveEdit = async () => {
    if (!editingId || !user?.id) {
      setMessage('❌ Invalid edit session');
      return;
    }
    const updates = { ...editForm };
    try {
      const { error } = await supabase
        .from('BeatFiles')
        .update(updates)
        .eq('id', editingId)
        .eq('user_id', user.id);
      if (error) throw error;
      setMessage('✅ Beat updated');
      setEditingId(null);
      fetchBeatFiles();
    } catch (err) {
      setMessage(`❌ Save failed: ${err.message}`);
    }
  };

  // ✏️ Replace file (audio, wav, stems, cover) during edit
  const handleReplaceFile = async (file, type) => {
    if (!file || !editingId || !user?.id) {
      setMessage('❌ Invalid file or session');
      return;
    }
    // extension/MIME checks
    if (type === 'stems') {
      const ok = file.name.toLowerCase().endsWith('.zip')
              || file.type === 'application/zip'
              || file.type === 'application/x-zip-compressed';
      if (!ok) return setMessage('❌ Stems must be ZIP');
    }
    if (type === 'cover') {
      if (!file.type.startsWith('image/'))
        return setMessage('❌ Cover must be image');
    }
    try {
      let url;
      if (type === 'cover') {
        const path = `${editingId}-${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi,'_')}`;
        const { error: uErr } = await supabase
          .storage.from('covers')
          .upload(path, file, { upsert: true, contentType: file.type });
        if (uErr) throw uErr;
        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path);
        url = publicUrl;
      } else {
        url = await uploadToR2(
          file,
          type==='wav'   ? 'wav' :
          type==='stems' ? 'stems' : ''
        );
      }
      const column = (
        type==='audio' ? 'audiourl' :
        type==='wav'   ? 'wav'      :
        type==='stems' ? 'stems'    :
        type==='cover' ? 'cover'    :
        null
      );
      if (!column) throw new Error('Unknown type');
      const { error } = await supabase
        .from('BeatFiles')
        .update({ [column]: url })
        .eq('id', editingId)
        .eq('user_id', user.id);
      if (error) throw error;
      setMessage(`✅ ${type} updated`);
      fetchBeatFiles();
    } catch (err) {
      setMessage(`❌ Upload failed: ${err.message}`);
    }
  };

  // 🗑 Delete handler
  const handleDelete = async (beat) => {
    if (!confirm(`Delete "${beat.name}"?`)) return;
    setLoadingBeats(true);
    const audioKey = beat.audiourl?.split('/').pop();
    const wavKey   = beat.wav?.split('/').pop();
    const stemsKey = beat.stems?.split('/').pop();
    try {
      const res = await fetch('/api/delete-beat', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ id:beat.id, userId:user.id, audioKey, wavKey, stemsKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error||'Unknown');
      setMessage('🗑️ Beat deleted');
      fetchBeatFiles();
    } catch (err) {
      setMessage(`❌ Delete failed: ${err.message}`);
    } finally {
      setLoadingBeats(false);
    }
  };

  if (accessDenied) {
    return <Layout><p className="text-center mt-20 text-xl">🚫 Access Denied</p></Layout>;
  }
  if (!user || loadingBeats) {
    return <Layout><p className="text-center mt-20 text-xl">🔄 Loading…</p></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto mt-10 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Manage BeatFiles</h1>
        {message && <p className="mb-4 text-blue-600 text-sm">{message}</p>}

        {/* Toolbar */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >➕ Add New Beat</button>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Search name or artist…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="border p-2 rounded"
            />
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="created_at-desc">Date (New→Old)</option>
              <option value="created_at-asc">Date (Old→New)</option>
              <option value="name-asc">Name (A→Z)</option>
              <option value="name-desc">Name (Z→A)</option>
              <option value="artist-asc">Artist (A→Z)</option>
              <option value="artist-desc">Artist (Z→A)</option>
              <option value="bpm-asc">BPM (Low→High)</option>
              <option value="bpm-desc">BPM (High→Low)</option>
            </select>
          </div>
        </div>

        {/* Table */}
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
            {paginated.map(beat => (
              <tr key={beat.id}>
                <td className="border p-2">
                  <img src={beat.cover} className="w-16 h-16 object-cover rounded" />
                </td>
                <td className="border p-2">
                  {beat.audiourl
                    ? <audio controls src={beat.audiourl} className="w-40" />
                    : <span className="text-gray-500 italic">No preview</span>}
                </td>
                <td className="border p-2">
                  {editingId === beat.id ? (
                    <>
                      {['name','artist','genre','mood','key'].map(f => (
                        <input
                          key={f}
                          type="text"
                          className="border w-full my-1 p-1 rounded"
                          placeholder={f.charAt(0).toUpperCase()+f.slice(1)}
                          value={editForm[f]}
                          onChange={e => handleEditChange(f, e.target.value)}
                        />
                      ))}
                      <input
                        type="text"
                        className="border w-full my-1 p-1 rounded"
                        placeholder="BPM (e.g. 86 bpm)"
                        value={editForm.bpm}
                        onChange={e => handleEditChange('bpm', e.target.value)}
                      />
                      <div className="flex flex-wrap gap-2 mt-2 text-sm">
                        <button
                          onClick={() => document.getElementById(`audio-upload-${beat.id}`).click()}
                          className="text-blue-500"
                        >🎵 Replace MP3</button>
                        <button
                          onClick={() => document.getElementById(`wav-upload-${beat.id}`).click()}
                          className="text-purple-500"
                        >🔊 Replace WAV</button>
                        <button
                          onClick={() => document.getElementById(`stems-upload-${beat.id}`).click()}
                          className="text-orange-500"
                        >📦 Replace STEMS</button>
                        <button
                          onClick={() => document.getElementById(`cover-upload-${beat.id}`).click()}
                          className="text-green-500"
                        >🖼️ Replace Cover</button>
                      </div>
                      <input id={`audio-upload-${beat.id}`} type="file" hidden accept="audio/mpeg"
                        onChange={e => handleReplaceFile(e.target.files[0], 'audio')} />
                      <input id={`wav-upload-${beat.id}`} type="file" hidden accept=".wav"
                        onChange={e => handleReplaceFile(e.target.files[0], 'wav')} />
                      <input id={`stems-upload-${beat.id}`} type="file" hidden accept=".zip"
                        onChange={e => handleReplaceFile(e.target.files[0], 'stems')} />
                      <input id={`cover-upload-${beat.id}`} type="file" hidden accept="image/*"
                        onChange={e => handleReplaceFile(e.target.files[0], 'cover')} />
                    </>
                  ) : (
                    <>
                      <p><strong>{beat.name}</strong> by {beat.artist}</p>
                      <p className="text-xs">Key: {beat.key}, {beat.bpm}</p>
                    </>
                  )}
                </td>
                <td className="border p-2 space-x-2">
                  {editingId === beat.id ? (
                    <>
                      <button onClick={handleSaveEdit} className="text-green-600">💾 Save</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-500">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(beat)} className="text-blue-600">✏️ Edit</button>
                      <button onClick={() => handleDelete(beat)} className="text-red-600">🗑️ Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >Prev</button>
          <span>Page {currentPage} of {pageCount}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, pageCount))}
            disabled={currentPage === pageCount}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >Next</button>
        </div>
      </div>

      {/* Add New Beat Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
            >✕</button>
            <h2 className="text-xl font-semibold mb-4">Add New Beat</h2>
            <div className="grid grid-cols-2 gap-4">
              {['name','artist','genre','mood','key'].map(f => (
                <div key={f}>
                  <input
                    type="text"
                    placeholder={f.charAt(0).toUpperCase()+f.slice(1)}
                    value={newForm[f]}
                    onChange={e => setNewForm({...newForm, [f]: e.target.value})}
                    className="w-full border p-2 rounded"
                  />
                  {formErrors[f] && <p className="text-red-500 text-sm">{formErrors[f]}</p>}
                </div>
              ))}
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="BPM (e.g. 86 bpm)"
                  value={newForm.bpm}
                  onChange={e => setNewForm({...newForm, bpm: e.target.value})}
                  className="w-full border p-2 rounded"
                />
              </div>
              {/* Dropzones */}
              <div>
                <label className="block mb-1">MP3 (required)</label>
                <div {...getAudioRoot()} className="border-dashed border-2 border-gray-300 p-4 text-center rounded cursor-pointer">
                  <input {...getAudioInput()} />
                  {audioFile ? <p>{audioFile.name}</p> : <p>Drop MP3 or click</p>}
                </div>
                {formErrors.audio && <p className="text-red-500 text-sm">{formErrors.audio}</p>}
              </div>
              <div>
                <label className="block mb-1">WAV (optional)</label>
                <div {...getWavRoot()} className="border-dashed border-2 border-gray-300 p-4 text-center rounded cursor-pointer">
                  <input {...getWavInput()} />
                  {wavFile ? <p>{wavFile.name}</p> : <p>Drop WAV or click</p>}
                </div>
              </div>
              <div>
                <label className="block mb-1">Stems ZIP (optional)</label>
                <div {...getStemsRoot()} className="border-dashed border-2 border-gray-300 p-4 text-center rounded cursor-pointer">
                  <input {...getStemsInput()} />
                  {stemsFile ? <p>{stemsFile.name}</p> : <p>Drop ZIP or click</p>}
                </div>
              </div>
              <div>
                <label className="block mb-1">Cover (required)</label>
                <div {...getCoverRoot()} className="border-dashed border-2 border-gray-300 p-4 text-center rounded cursor-pointer">
                  <input {...getCoverInput()} />
                  {coverFile
                    ? <img src={URL.createObjectURL(coverFile)} alt="preview" className="mx-auto w-24 h-24 object-cover rounded" />
                    : <p>Drop image or click</p>}
                </div>
                {formErrors.cover && <p className="text-red-500 text-sm">{formErrors.cover}</p>}
              </div>
            </div>
            <div className="mt-6 flex items-center">
              <button
                onClick={handleAddBeat}
                disabled={uploading}
                className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : '➕ Add Beat'}
              </button>
              {uploading && <div className="ml-3 animate-spin">⏳</div>}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
