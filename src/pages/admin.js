import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Layout from '../components/Layout';

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [beatFiles, setBeatFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newForm, setNewForm] = useState({
    name: '', artist: '', genre: '', mood: '', key: '',
    bpm: '', wav: '', stems: ''
  });
  const [coverFile, setCoverFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session:', session); // add this
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', currentUser.id)
          .single();

        if (error || profile?.email !== 'antonbosspd@gmail.com') {
          setAccessDenied(true);
          return;
        }

        fetchBeatFiles();
      }
    };

    getUser();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchBeatFiles = async () => {
    const { data, error } = await supabase.from('BeatFiles').select('*');
    if (error) setMessage(`Error loading beats: ${error.message}`);
    else setBeatFiles(data);
  };

  const handleEdit = (beat) => {
    setEditingId(beat.id);
    setEditForm({ ...beat });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    const { error } = await supabase
      .from('BeatFiles')
      .update(editForm)
      .eq('id', editingId)
      .eq('user_id', user.id);

    if (error) setMessage(`Failed to save: ${error.message}`);
    else {
      setMessage('✅ Beat updated');
      setEditingId(null);
      fetchBeatFiles();
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('BeatFiles').delete().eq('id', id).eq('user_id', user.id);
    if (error) setMessage(`Delete failed: ${error.message}`);
    else {
      setMessage('🗑️ Beat deleted');
      fetchBeatFiles();
    }
  };

  const handleReplaceFile = async (file, type) => {
    if (!file || !(file instanceof File) || !editingId || !user?.id) {
      setMessage('❌ Invalid file or user session.');
      return;
    }
  
    const sanitized = file.name.replace(/[^a-z0-9.\-_]/gi, '_');
    const bucket = type === 'audio' ? 'audio' : 'covers';
    const filePath = `${Date.now()}-${sanitized}`;
  
    console.log(`📁 Uploading to ${bucket}/${filePath}`);
  
    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
      upsert: true,
      contentType: type === 'audio' ? 'audio/mpeg' : file.type
    });
  
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return setMessage(`❌ Upload error: ${uploadError.message}`);
    }
  
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 311040000); // 99 years
  
    if (!signedData?.signedUrl || signedError) {
      console.error(`Failed to create signed URL:`, signedError);
      return setMessage(`❌ Failed to create signed URL`);
    }
  
    const column = type === 'audio' ? 'audiourl' : 'cover';
    const { error: updateError } = await supabase
      .from('BeatFiles')
      .update({ [column]: signedData.signedUrl })
      .eq('id', editingId)
      .eq('user_id', user.id);
  
    if (updateError) setMessage(`DB update failed: ${updateError.message}`);
    else {
      setMessage(`✅ ${type} file updated`);
      setEditForm((prev) => ({ ...prev, [column]: signedData.signedUrl }));
      fetchBeatFiles();
    }
  };
  
  const handleAddBeat = async () => {
    if (!audioFile || !coverFile || !newForm.name || !user?.id) {
      setMessage('Please fill all fields and upload audio & cover.');
      return;
    }
  
    if (!(audioFile instanceof File) || !(coverFile instanceof File)) {
      setMessage('Invalid file type.');
      return;
    }
  
    const sanitizedAudio = audioFile.name.replace(/[^a-z0-9.\-_]/gi, '_');
    const sanitizedCover = coverFile.name.replace(/[^a-z0-9.\-_]/gi, '_');
    const audioPath = `${Date.now()}-${sanitizedAudio}`;
    const coverPath = `${Date.now()}-${sanitizedCover}`;
  
    const audioUpload = await supabase.storage.from('audio').upload(audioPath, audioFile, {
      upsert: true,
      contentType: 'audio/mpeg'
    });
  
    const coverUpload = await supabase.storage.from('covers').upload(coverPath, coverFile, {
      upsert: true,
      contentType: coverFile.type
    });
  
    if (audioUpload.error || coverUpload.error) {
      console.error('Upload errors:', audioUpload.error, coverUpload.error);
      return setMessage('Upload failed');
    }
  
    const { data: audioSigned } = await supabase.storage.from('audio').createSignedUrl(audioPath, 311040000);
    const { data: coverSigned } = await supabase.storage.from('covers').createSignedUrl(coverPath, 311040000);
  
    if (!audioSigned?.signedUrl || !coverSigned?.signedUrl) {
      console.error('Signed URL generation failed');
      return setMessage('❌ Failed to create signed URLs');
    }
  
    const { error } = await supabase.from('BeatFiles').insert([{
      ...newForm,
      audiourl: audioSigned.signedUrl,
      cover: coverSigned.signedUrl,
      user_id: user.id
    }]);
  
    if (error) setMessage(`Insert error: ${error.message}`);
    else {
      setMessage('✅ Beat added');
      setNewForm({ name: '', artist: '', genre: '', mood: '', key: '', bpm: '', wav: '', stems: '' });
      setAudioFile(null);
      setCoverFile(null);
      fetchBeatFiles();
    }
  };
  
  if (!user) return <p>Loading...</p>;
  if (accessDenied) return <p className="text-center mt-20 text-xl">🚫 Access Denied</p>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto mt-10 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Manage BeatFiles</h1>
        {message && <p className="mb-4 text-blue-600 text-sm">{message}</p>}

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {['Name', 'Artist', 'Genre', 'Mood', 'Key', 'BPM', 'Cover', 'Audio', 'Actions'].map((h) => (
                <th key={h} className="p-2 border">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-green-50">
              {['name', 'artist', 'genre', 'mood', 'key', 'bpm'].map((field) => (
                <td key={field} className="p-2 border">
                  <input
                    value={newForm[field]}
                    onChange={(e) => setNewForm({ ...newForm, [field]: e.target.value })}
                    className="w-full border px-1 py-1"
                  />
                </td>
              ))}
              <td className="p-2 border">
                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} />
              </td>
              <td className="p-2 border">
                <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} />
              </td>
              <td className="p-2 border">
                <button onClick={handleAddBeat} className="bg-green-600 text-white px-2 py-1 rounded">Add</button>
              </td>
            </tr>

            {beatFiles.map((beat) => (
              <tr key={beat.id} className="border-b">
                {editingId === beat.id ? (
                  <>
                    {['name', 'artist', 'genre', 'mood', 'key', 'bpm'].map((field) => (
                      <td key={field} className="p-2 border">
                        <input
                          value={editForm[field] || ''}
                          onChange={(e) => handleEditChange(field, e.target.value)}
                          className="w-full border px-1 py-1"
                        />
                      </td>
                    ))}
                    <td className="p-2 border">
                      <img src={editForm.cover} alt="cover" className="w-12 h-12 mb-2" />
                      <input type="file" accept="image/*" onChange={(e) => handleReplaceFile(e.target.files[0], 'cover')} />
                    </td>
                    <td className="p-2 border">
                      <audio controls src={editForm.audiourl} className="w-32 mb-2" />
                      <input type="file" accept="audio/*" onChange={(e) => handleReplaceFile(e.target.files[0], 'audio')} />
                    </td>
                    <td className="p-2 border">
                      <button onClick={handleSaveEdit} className="bg-blue-500 text-white px-2 py-1 mr-2 rounded">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-500 underline">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2 border">{beat.name}</td>
                    <td className="p-2 border">{beat.artist}</td>
                    <td className="p-2 border">{beat.genre}</td>
                    <td className="p-2 border">{beat.mood}</td>
                    <td className="p-2 border">{beat.key}</td>
                    <td className="p-2 border">{beat.bpm}</td>
                    <td className="p-2 border">
                      <img src={beat.cover} alt="cover" className="w-12 h-12" />
                    </td>
                    <td className="p-2 border">
                      <audio controls src={beat.audiourl} className="w-32" />
                    </td>
                    <td className="p-2 border">
                      <button onClick={() => handleEdit(beat)} className="text-blue-500 underline mr-3">Edit</button>
                      <button onClick={() => handleDelete(beat.id)} className="text-red-500 underline">Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
