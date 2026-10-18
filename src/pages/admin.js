// pages/admin.js
//
// The store's back office: add beats, edit their details, swap their files,
// delete them. middleware.ts keeps non-admins off this page, and every API
// route it calls checks the admin session again (lib/adminAuth.js), since
// those routes are reachable without the page.

import { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useDropzone } from 'react-dropzone';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabaseClient';
import { isAdminEmail } from '../lib/admin';

const PAGE_SIZE = 10;
const TEXT_FIELDS = ['name', 'artist', 'genre', 'mood', 'key', 'bpm'];
const EMPTY_FORM = { name: '', artist: '', genre: '', mood: '', key: '', bpm: '' };
const LABELS = { name: 'Name', artist: 'Artist', genre: 'Genre', mood: 'Mood', key: 'Key', bpm: 'BPM' };

const SORTS = [
  ['created_at-desc', 'Newest first'],
  ['created_at-asc', 'Oldest first'],
  ['name-asc', 'Name A→Z'],
  ['name-desc', 'Name Z→A'],
  ['artist-asc', 'Artist A→Z'],
  ['artist-desc', 'Artist Z→A'],
  ['bpm-asc', 'BPM low→high'],
  ['bpm-desc', 'BPM high→low'],
];

// react-dropzone 14 takes accept as { mime: [extensions] }; a bare MIME
// string is ignored, which let any file through the MP3 and cover drops.
const ACCEPT = {
  audio: { 'audio/mpeg': ['.mp3'] },
  wav: { 'audio/wav': ['.wav'], 'audio/x-wav': ['.wav'], 'audio/wave': ['.wav'] },
  stems: { 'application/zip': ['.zip'], 'application/x-zip-compressed': ['.zip'] },
  cover: { 'image/*': [] },
};

const bpmNumber = (v) => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;

/** fetch() with the admin's session token attached. */
async function authedFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

function Dropzone({ label, hint, accept, file, onFile, error, preview }) {
  const onDrop = useCallback((files) => files[0] && onFile(files[0]), [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept, multiple: false });
  return (
    <div>
      <p className="ab-label-dim mb-2">{label}</p>
      <div
        {...getRootProps()}
        className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed p-4 text-center transition-colors ${
          isDragActive ? 'border-[var(--accent)]' : 'border-[var(--fg-20)] hover:border-[var(--fg-50)]'
        }`}
      >
        <input {...getInputProps()} />
        {preview ? (
          <img src={preview} alt="" className="h-20 w-20 object-cover" />
        ) : (
          <span className="ab-meta">{file ? file.name : hint}</span>
        )}
      </div>
      {error && <p className="ab-meta mt-1 text-[var(--accent)]">{error}</p>}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();

  // Auth & data
  const [user, setUser] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [beatFiles, setBeatFiles] = useState([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [busyId, setBusyId] = useState(null); // row with a request in flight
  const [notice, setNotice] = useState(null); // { ok, text }

  // Add beat
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [audioFile, setAudioFile] = useState(null);
  const [wavFile, setWavFile] = useState(null);
  const [stemsFile, setStemsFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [uploading, setUploading] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  // Search, sort, pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('created_at-desc');
  const [currentPage, setCurrentPage] = useState(1);

  const say = (ok, text) => setNotice({ ok, text });

  useEffect(() => {
    if (!notice?.ok) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // One object URL per chosen cover, revoked when it changes. Creating it
  // inline in render leaked a new blob URL on every keystroke in the form.
  const coverPreview = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : null), [coverFile]);
  useEffect(() => () => coverPreview && URL.revokeObjectURL(coverPreview), [coverPreview]);

  const fetchBeatFiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('BeatFiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) say(false, `Couldn’t load beats: ${error.message}`);
    else setBeatFiles(data || []);
    setInitialLoad(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data?.session?.user;
      if (!sessionUser) {
        router.replace('/signin?redirectTo=/admin');
        return;
      }
      if (!isAdminEmail(sessionUser.email)) {
        setAccessDenied(true);
        return;
      }
      setUser(sessionUser);
      fetchBeatFiles();
    })();
  }, [router, fetchBeatFiles]);

  // Search + sort. Null-safe: a beat saved without an artist used to crash
  // the whole page on the first keystroke in the search box.
  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const arr = beatFiles.filter(
      (b) => !q || [b.name, b.artist, b.genre, b.mood].some((v) => String(v ?? '').toLowerCase().includes(q))
    );
    const [field, dir] = sortOption.split('-');
    const sign = dir === 'asc' ? 1 : -1;
    return arr.sort((a, b) => {
      if (field === 'bpm') return (bpmNumber(a.bpm) - bpmNumber(b.bpm)) * sign;
      return String(a[field] ?? '').localeCompare(String(b[field] ?? '')) * sign;
    });
  }, [beatFiles, searchQuery, sortOption]);

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const paginated = filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // R2 upload, through the admin-only route.
  const uploadToR2 = async (file, folder = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    const { url } = await authedFetch('/api/upload-beats', { method: 'POST', body: formData });
    return url;
  };

  const uploadCover = async (file, prefix = '') => {
    const path = `${prefix}${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, '_')}`;
    const { error } = await supabase.storage.from('covers').upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return supabase.storage.from('covers').getPublicUrl(path).data.publicUrl;
  };

  const updateBeat = (id, fieldsToUpdate) =>
    authedFetch('/api/update-beat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, fieldsToUpdate }),
    });

  const resetAddForm = () => {
    setNewForm(EMPTY_FORM);
    setAudioFile(null);
    setWavFile(null);
    setStemsFile(null);
    setCoverFile(null);
    setFormErrors({});
  };

  const handleAddBeat = async () => {
    const errs = {};
    if (!newForm.name.trim()) errs.name = 'Name required';
    if (!audioFile) errs.audio = 'MP3 required';
    if (!coverFile) errs.cover = 'Cover required';
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    setUploading(true);
    try {
      const [audioUrl, wavUrl, stemsUrl, coverUrl] = await Promise.all([
        uploadToR2(audioFile, ''),
        wavFile ? uploadToR2(wavFile, 'wav') : null,
        stemsFile ? uploadToR2(stemsFile, 'stems') : null,
        uploadCover(coverFile),
      ]);

      const { error } = await supabase.from('BeatFiles').insert([
        {
          ...newForm,
          audiourl: audioUrl,
          wav: wavUrl,
          stems: stemsUrl,
          cover: coverUrl,
          user_id: user.id,
          licenses: [
            { name: 'Basic License', price: 24.99, file_path: audioUrl },
            { name: 'Premium License', price: 34.99, file_path: wavUrl },
            // Same spelling as LicenseModal, account and the downloads tiers.
            { name: 'Premium Plus License', price: 49.99, file_path: stemsUrl },
            { name: 'Unlimited License', price: 74.99, file_path: stemsUrl },
          ],
        },
      ]);
      if (error) throw error;

      say(true, `Added “${newForm.name}”`);
      setShowAddModal(false);
      resetAddForm();
      fetchBeatFiles();
    } catch (err) {
      say(false, `Couldn’t add the beat: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (beat) => {
    setEditingId(beat.id);
    setEditForm(Object.fromEntries(TEXT_FIELDS.map((f) => [f, beat[f] ?? ''])));
  };

  const handleSaveEdit = async () => {
    const id = editingId;
    setBusyId(id);
    try {
      await updateBeat(id, editForm);
      say(true, 'Saved');
      setEditingId(null);
      fetchBeatFiles();
    } catch (err) {
      say(false, `Save failed: ${err.message}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleReplaceFile = async (file, type) => {
    const id = editingId;
    if (!file || !id) return;
    if (type === 'stems' && !file.name.toLowerCase().endsWith('.zip')) return say(false, 'Stems must be a ZIP');
    if (type === 'cover' && !file.type.startsWith('image/')) return say(false, 'Cover must be an image');

    setBusyId(id);
    try {
      const url =
        type === 'cover'
          ? await uploadCover(file, `${id}-`)
          : await uploadToR2(file, type === 'wav' ? 'wav' : type === 'stems' ? 'stems' : '');
      const column = { audio: 'audiourl', wav: 'wav', stems: 'stems', cover: 'cover' }[type];
      await updateBeat(id, { [column]: url });
      say(true, `${type === 'audio' ? 'MP3' : type === 'wav' ? 'WAV' : type === 'stems' ? 'Stems' : 'Cover'} replaced`);
      fetchBeatFiles();
    } catch (err) {
      say(false, `Upload failed: ${err.message}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (beat) => {
    if (!confirm(`Delete “${beat.name}”? This also removes its files.`)) return;
    setBusyId(beat.id);
    try {
      await authedFetch('/api/delete-beat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: beat.id }),
      });
      say(true, `Deleted “${beat.name}”`);
      fetchBeatFiles();
    } catch (err) {
      say(false, `Delete failed: ${err.message}`);
    } finally {
      setBusyId(null);
    }
  };

  if (accessDenied) {
    return (
      <Layout>
        <div className="py-32 text-center">
          <p className="ab-label mb-4">Admin</p>
          <p className="ab-display">This page is for the store owner.</p>
        </div>
      </Layout>
    );
  }
  if (!user || initialLoad) {
    return (
      <Layout>
        <p className="ab-label-dim py-32 text-center">Loading…</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Admin — Anton Boss</title>
      </Head>

      <div className="mx-auto max-w-5xl py-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="ab-label mb-3">Admin</p>
            <h1 className="ab-display">
              {beatFiles.length} beat{beatFiles.length === 1 ? '' : 's'}
            </h1>
          </div>
          <button onClick={() => setShowAddModal(true)} className="ab-btn ab-btn-solid">
            + Add beat
          </button>
        </div>

        {/* Toolbar */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          {/* Sized wrappers: .ab-field sets width: 100% outside Tailwind's
              layers, so it overrides width utilities on the field itself. */}
          <div className="min-w-0 flex-1">
            <input
              type="search"
              placeholder="Search name, artist, genre, mood…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="ab-field"
              aria-label="Search beats"
            />
          </div>
          <div className="sm:w-52 sm:flex-none">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="ab-field"
              aria-label="Sort"
            >
              {SORTS.map(([v, l]) => (
                <option key={v} value={v} className="bg-[var(--bg)]">
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Beats */}
        {paginated.length === 0 ? (
          <p className="ab-label-dim py-20 text-center">
            {beatFiles.length ? 'No beats match that search' : 'No beats yet — add the first one'}
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-[var(--fg-10)] border-y border-[var(--fg-10)]">
            {paginated.map((beat) => {
              const editing = editingId === beat.id;
              const busy = busyId === beat.id;
              return (
                <li key={beat.id} className={`py-5 ${busy ? 'opacity-60' : ''}`}>
                  <div className="flex flex-wrap items-center gap-4">
                    <img
                      src={beat.cover || '/images/beats/default-cover.png'}
                      alt=""
                      className="h-16 w-16 flex-none object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{beat.name || 'Untitled'}</p>
                      <p className="ab-meta mt-1 truncate">
                        {[beat.artist, beat.genre, beat.mood, beat.key, beat.bpm && `${bpmNumber(beat.bpm) || beat.bpm} BPM`]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                      <p className="ab-meta mt-1">
                        {[beat.audiourl && 'MP3', beat.wav && 'WAV', beat.stems && 'Stems'].filter(Boolean).join(' · ') ||
                          'No files'}
                      </p>
                    </div>
                    {beat.audiourl && (
                      <audio controls preload="none" src={beat.audiourl} className="h-8 w-full sm:w-56" />
                    )}
                    <div className="flex gap-2">
                      {editing ? (
                        <>
                          <button onClick={handleSaveEdit} disabled={busy} className="ab-btn ab-btn-sm ab-btn-active">
                            {busy ? 'Saving…' : 'Save'}
                          </button>
                          <button onClick={() => setEditingId(null)} className="ab-btn ab-btn-sm">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(beat)} disabled={busy} className="ab-btn ab-btn-sm">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(beat)} disabled={busy} className="ab-btn ab-btn-sm">
                            {busy ? '…' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editing && (
                    <div className="mt-6 border border-[var(--fg-10)] p-5">
                      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
                        {TEXT_FIELDS.map((f) => (
                          <label key={f} className="block">
                            <span className="ab-label-dim">{LABELS[f]}</span>
                            <input
                              className="ab-input mt-1"
                              value={editForm[f]}
                              placeholder={f === 'bpm' ? 'e.g. 86' : ''}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, [f]: e.target.value }))}
                            />
                          </label>
                        ))}
                      </div>
                      <div className="mt-6 flex flex-wrap gap-2">
                        {[
                          ['audio', 'Replace MP3', '.mp3,audio/mpeg'],
                          ['wav', 'Replace WAV', '.wav'],
                          ['stems', 'Replace stems', '.zip'],
                          ['cover', 'Replace cover', 'image/*'],
                        ].map(([type, label, accept]) => (
                          <label key={type} className="ab-btn ab-btn-sm cursor-pointer">
                            {label}
                            <input
                              type="file"
                              hidden
                              accept={accept}
                              onChange={(e) => {
                                handleReplaceFile(e.target.files[0], type);
                                e.target.value = ''; // allow picking the same file again
                              }}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setCurrentPage(Math.max(page - 1, 1))} disabled={page === 1} className="ab-btn ab-btn-sm">
              ← Prev
            </button>
            <span className="ab-label-dim">
              Page {page} of {pageCount}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(page + 1, pageCount))}
              disabled={page === pageCount}
              className="ab-btn ab-btn-sm"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Status line */}
      {notice && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 flex max-w-[90vw] -translate-x-1/2 items-center gap-4 border border-[var(--fg-20)] bg-[var(--bg)] px-5 py-3"
          style={{ zIndex: 'var(--z-dialog)' }}
        >
          <span className={`text-sm ${notice.ok ? '' : 'text-[var(--accent)]'}`}>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="ab-btn ab-btn-bare ab-btn-sm" aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {/* Add beat */}
      {showAddModal && (
        <div
          className="fixed inset-0 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10"
          style={{ zIndex: 'var(--z-dialog)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-beat-title"
        >
          <div className="w-full max-w-2xl border border-[var(--fg-20)] bg-[var(--bg)] p-6 sm:p-8">
            <div className="mb-8 flex items-center justify-between">
              <h2 id="add-beat-title" className="ab-label">
                Add beat
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetAddForm();
                }}
                disabled={uploading}
                className="ab-btn ab-btn-bare ab-btn-sm"
              >
                Close ×
              </button>
            </div>

            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
              {TEXT_FIELDS.map((f) => (
                <label key={f} className="block">
                  <span className="ab-label-dim">
                    {LABELS[f]}
                    {f === 'name' && ' *'}
                  </span>
                  <input
                    className="ab-input mt-1"
                    value={newForm[f]}
                    placeholder={f === 'bpm' ? 'e.g. 86' : ''}
                    onChange={(e) => setNewForm({ ...newForm, [f]: e.target.value })}
                  />
                  {formErrors[f] && <span className="ab-meta mt-1 block text-[var(--accent)]">{formErrors[f]}</span>}
                </label>
              ))}
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <Dropzone label="MP3 *" hint="Drop MP3 or click" accept={ACCEPT.audio} file={audioFile} onFile={setAudioFile} error={formErrors.audio} />
              <Dropzone label="Cover *" hint="Drop image or click" accept={ACCEPT.cover} file={coverFile} onFile={setCoverFile} error={formErrors.cover} preview={coverPreview} />
              <Dropzone label="WAV" hint="Drop WAV or click" accept={ACCEPT.wav} file={wavFile} onFile={setWavFile} />
              <Dropzone label="Stems ZIP" hint="Drop ZIP or click" accept={ACCEPT.stems} file={stemsFile} onFile={setStemsFile} />
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              {uploading && <span className="ab-label-dim">Uploading — keep this tab open</span>}
              <button onClick={handleAddBeat} disabled={uploading} className="ab-btn ab-btn-solid">
                {uploading ? 'Uploading…' : 'Add beat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
