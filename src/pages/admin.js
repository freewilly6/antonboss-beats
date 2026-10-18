// pages/admin.js
//
// The store's back office: add beats, edit their details, swap their files,
// delete them. Files upload straight from the browser to R2 via presigned
// links (/api/admin/upload-url): the tagged preview and cover to the public
// bucket, paid files (untagged MP3, WAV, stems) to the private one. This page
// only ever learns whether a beat HAS each paid file, never where it is. middleware.ts keeps non-admins off this page, and every API
// route it calls checks the admin session again (lib/serverAuth.js), since
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
  preview: { 'audio/mpeg': ['.mp3'] },
  mp3: { 'audio/mpeg': ['.mp3'] },
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

/**
 * @param {{ label: string, hint: string, accept: Record<string, string[]>, file: File | null,
 *           onFile: (f: File) => void, error?: string, preview?: string | null }} props
 */
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
  const [previewFile, setPreviewFile] = useState(null); // tagged MP3 (public)
  const [mp3File, setMp3File] = useState(null); // untagged MP3 (private)
  const [wavFile, setWavFile] = useState(null);
  const [stemsFile, setStemsFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [formErrors, setFormErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [uploading, setUploading] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  // Search, sort, pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMissingMp3, setOnlyMissingMp3] = useState(false);
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
    try {
      const { beats } = await authedFetch('/api/admin/beats');
      setBeatFiles(beats || []);
    } catch (err) {
      say(false, `Couldn’t load beats: ${err.message}`);
    }
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
      (b) =>
        (!onlyMissingMp3 || !b.has?.mp3) &&
        (!q || [b.name, b.artist, b.genre, b.mood].some((v) => String(v ?? '').toLowerCase().includes(q)))
    );
    const [field, dir] = sortOption.split('-');
    const sign = dir === 'asc' ? 1 : -1;
    return arr.sort((a, b) => {
      if (field === 'bpm') return (bpmNumber(a.bpm) - bpmNumber(b.bpm)) * sign;
      return String(a[field] ?? '').localeCompare(String(b[field] ?? '')) * sign;
    });
  }, [beatFiles, searchQuery, sortOption, onlyMissingMp3]);

  const missingMp3Count = beatFiles.filter((b) => !b.has?.mp3).length;

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const paginated = filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /**
   * Upload one file straight to R2. The server picks the bucket and key from
   * `kind`; we get back the key, plus the public URL for public kinds.
   */
  const uploadFile = async (kind, file) => {
    const { uploadUrl, contentType, key, publicUrl } = await authedFetch('/api/admin/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, filename: file.name, contentType: file.type }),
    });
    const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
    if (!put.ok) throw new Error(`Upload of ${file.name} failed (${put.status}) — check the bucket's CORS rule`);
    return { key, publicUrl };
  };

  const saveBeat = (method, body) =>
    authedFetch('/api/admin/beats', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const resetAddForm = () => {
    setNewForm(EMPTY_FORM);
    setPreviewFile(null);
    setMp3File(null);
    setWavFile(null);
    setStemsFile(null);
    setCoverFile(null);
    setFormErrors({});
  };

  const handleAddBeat = async () => {
    /** @type {Record<string, string>} */
    const errs = {};
    if (!newForm.name.trim()) errs.name = 'Name required';
    if (!previewFile) errs.preview = 'Tagged preview required';
    if (!coverFile) errs.cover = 'Cover required';
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    setUploading(true);
    try {
      const [preview, cover, mp3, wav, stems] = await Promise.all([
        uploadFile('preview', previewFile),
        uploadFile('cover', coverFile),
        mp3File ? uploadFile('mp3', mp3File) : null,
        wavFile ? uploadFile('wav', wavFile) : null,
        stemsFile ? uploadFile('stems', stemsFile) : null,
      ]);

      await saveBeat('POST', {
        ...newForm,
        previewUrl: preview.publicUrl,
        coverUrl: cover.publicUrl,
        mp3Key: mp3?.key,
        wavKey: wav?.key,
        stemsKey: stems?.key,
      });

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
    setEditForm(/** @type {typeof EMPTY_FORM} */ (Object.fromEntries(TEXT_FIELDS.map((f) => [f, beat[f] ?? '']))));
  };

  const handleSaveEdit = async () => {
    const id = editingId;
    setBusyId(id);
    try {
      await saveBeat('PATCH', { id, ...editForm });
      say(true, 'Saved');
      setEditingId(null);
      fetchBeatFiles();
    } catch (err) {
      say(false, `Save failed: ${err.message}`);
    } finally {
      setBusyId(null);
    }
  };

  // kind → [what the PATCH body calls it, use the public URL?, label]
  const REPLACE = {
    preview: ['previewUrl', true, 'Tagged preview'],
    cover: ['coverUrl', true, 'Cover'],
    mp3: ['mp3Key', false, 'Untagged MP3'],
    wav: ['wavKey', false, 'WAV'],
    stems: ['stemsKey', false, 'Stems'],
  };

  const handleReplaceFile = async (file, kind) => {
    const id = editingId;
    if (!file || !id) return;
    const [field, isPublic, label] = REPLACE[kind];
    setBusyId(id);
    try {
      const { key, publicUrl } = await uploadFile(kind, file);
      await saveBeat('PATCH', { id, [field]: isPublic ? publicUrl : key });
      say(true, `${label} ${kind === 'preview' || kind === 'cover' ? 'replaced' : 'uploaded'}`);
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
          {/* The to-do list for the untagged MP3 slot: until one is uploaded,
              Basic buyers of that beat receive the tagged preview. */}
          <button
            onClick={() => {
              setOnlyMissingMp3((v) => !v);
              setCurrentPage(1);
            }}
            aria-pressed={onlyMissingMp3}
            className={`ab-btn whitespace-nowrap ${onlyMissingMp3 ? 'ab-btn-active' : ''}`}
            disabled={!missingMp3Count && !onlyMissingMp3}
          >
            No untagged MP3 ({missingMp3Count})
          </button>
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
                        {[beat.audiourl && 'Preview', beat.has?.mp3 && 'Untagged MP3', beat.has?.wav && 'WAV', beat.has?.stems && 'Stems']
                          .filter(Boolean)
                          .join(' · ') || 'No files'}
                        {!beat.has?.mp3 && (
                          <span className="ml-2 text-[var(--accent)]" title="Basic buyers get the tagged preview until one is uploaded">
                            · No untagged MP3
                          </span>
                        )}
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
                          ['preview', 'Replace tagged preview', '.mp3,audio/mpeg'],
                          ['mp3', beat.has?.mp3 ? 'Replace untagged MP3' : 'Upload untagged MP3', '.mp3,audio/mpeg'],
                          ['wav', beat.has?.wav ? 'Replace WAV' : 'Upload WAV', '.wav'],
                          ['stems', beat.has?.stems ? 'Replace stems' : 'Upload stems', '.zip'],
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
              <Dropzone label="Tagged preview MP3 * — public" hint="Drop MP3 or click" accept={ACCEPT.preview} file={previewFile} onFile={setPreviewFile} error={formErrors.preview} />
              <Dropzone label="Cover * — public" hint="Drop image or click" accept={ACCEPT.cover} file={coverFile} onFile={setCoverFile} error={formErrors.cover} preview={coverPreview} />
              <Dropzone label="Untagged MP3 — buyers only" hint="Drop MP3 or click" accept={ACCEPT.mp3} file={mp3File} onFile={setMp3File} />
              <Dropzone label="WAV — buyers only" hint="Drop WAV or click" accept={ACCEPT.wav} file={wavFile} onFile={setWavFile} />
              <Dropzone label="Stems ZIP — buyers only" hint="Drop ZIP or click" accept={ACCEPT.stems} file={stemsFile} onFile={setStemsFile} />
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
