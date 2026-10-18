// pages/beats.js
//
// The whole catalogue as a compact list: one row per beat, sortable columns,
// search and genre filters. For browsing fast — the shelf on the home page is
// for browsing slowly. Same data (BeatQueueContext), same player, same
// license modal.

import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useBeatQueue } from '@/context/BeatQueueContext';
import { usePlayer } from '@/context/PlayerContext';
import { useLicenseModal } from '@/context/LicenseModalContext';

const BASE_PRICE = 24.99;

const bpmNumber = (v) => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;
const clean = (v) => (v && v !== 'Unknown' ? v : '');

// Column definitions double as the sort options.
const COLUMNS = [
  { id: 'name', label: 'Title', sort: (b) => b.name.toLowerCase() },
  { id: 'genre', label: 'Genre', sort: (b) => clean(b.genre).toLowerCase(), wide: true },
  { id: 'mood', label: 'Mood', sort: (b) => clean(b.mood).toLowerCase(), wide: true },
  { id: 'key', label: 'Key', sort: (b) => String(b.key || '').toLowerCase(), wide: true },
  { id: 'bpm', label: 'BPM', sort: (b) => bpmNumber(b.bpm), wide: true },
];

function PlayIcon({ playing }) {
  return playing ? (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <rect x="3" y="2" width="3.5" height="12" fill="currentColor" />
      <rect x="9.5" y="2" width="3.5" height="12" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M4 2l10 6-10 6z" fill="currentColor" />
    </svg>
  );
}

export default function BeatListPage() {
  const { queue } = useBeatQueue();
  const { toggleBeat, currentBeat, isPlaying } = usePlayer();
  const { openLicenseModal } = useLicenseModal();

  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  // null = the catalogue's own order, newest first.
  const [sort, setSort] = useState({ id: null, dir: 1 });

  const genres = useMemo(
    () => Array.from(new Set(queue.map((b) => clean(b.genre)).filter(Boolean))).sort(),
    [queue]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = queue.filter((b) => {
      if (genre && clean(b.genre) !== genre) return false;
      if (!q) return true;
      return [b.name, b.artist, b.genre, b.mood, b.key, b.bpm]
        .some((v) => String(v ?? '').toLowerCase().includes(q));
    });
    const col = COLUMNS.find((c) => c.id === sort.id);
    if (!col) return list;
    return [...list].sort((a, b) => {
      const va = col.sort(a);
      const vb = col.sort(b);
      // Blanks always sink to the bottom, whichever way it's sorted.
      if (va === '' || va === 0) return 1;
      if (vb === '' || vb === 0) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [queue, query, genre, sort]);

  const toggleSort = (id) =>
    setSort((s) => (s.id !== id ? { id, dir: 1 } : s.dir === 1 ? { id, dir: -1 } : { id: null, dir: 1 }));

  const loading = queue.length === 0;

  return (
    <Layout>
      <Head>
        <title>All beats — Anton Boss</title>
      </Head>

      <div className="mx-auto max-w-5xl py-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="ab-label mb-3">Beats</p>
            <h1 className="ab-display">{loading ? 'All beats' : `${queue.length} beats`}</h1>
          </div>
          <Link href="/#beats" className="ab-btn">
            Shelf view
          </Link>
        </div>

        {/* Search + genre chips */}
        <div className="mt-10">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, artist, mood, key, BPM…"
            className="ab-field"
            aria-label="Search beats"
          />
          {genres.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by genre">
              <button onClick={() => setGenre('')} className={`ab-btn ab-btn-sm ${!genre ? 'ab-btn-active' : ''}`}>
                All
              </button>
              {genres.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(genre === g ? '' : g)}
                  aria-pressed={genre === g}
                  className={`ab-btn ab-btn-sm ${genre === g ? 'ab-btn-active' : ''}`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Header row, doubling as sort controls. Header and rows are separate
            grids, so every column is fixed or fractional — an auto column
            would size differently in each and knock the headings askew. */}
        <div className="mt-8 grid grid-cols-[2.5rem_1fr_5.5rem] items-center gap-4 border-b border-[var(--fg-10)] pb-3 md:grid-cols-[2.5rem_minmax(0,2.4fr)_1fr_1fr_4rem_3.5rem_8rem]">
          <span />
          {COLUMNS.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleSort(c.id)}
              className={`ab-label text-left hover:text-[var(--fg)] ${c.wide ? 'hidden md:block' : ''} ${
                sort.id === c.id ? '!text-[var(--fg)]' : ''
              }`}
              aria-label={`Sort by ${c.label}`}
            >
              {c.label}
              {sort.id === c.id && <span className="ml-1 text-[var(--accent)]">{sort.dir === 1 ? '↑' : '↓'}</span>}
            </button>
          ))}
          <span className="ab-label text-right">License</span>
        </div>

        {/* Rows */}
        {loading ? (
          <p className="ab-label-dim py-20 text-center">Loading beats…</p>
        ) : rows.length === 0 ? (
          <p className="ab-label-dim py-20 text-center">No beats match</p>
        ) : (
          <ul>
            {rows.map((beat) => {
              const active = currentBeat?.id === beat.id;
              const playing = active && isPlaying;
              const meta = [clean(beat.genre), clean(beat.mood), beat.key, beat.bpm && `${bpmNumber(beat.bpm) || beat.bpm} BPM`]
                .filter(Boolean)
                .join(' · ');
              return (
                <li
                  key={beat.id}
                  className={`grid grid-cols-[2.5rem_1fr_5.5rem] items-center gap-4 border-b border-[var(--fg-10)] py-2.5 transition-colors md:grid-cols-[2.5rem_minmax(0,2.4fr)_1fr_1fr_4rem_3.5rem_8rem] ${
                    active ? 'bg-[var(--fg-10)]' : 'hover:bg-[color-mix(in_srgb,var(--fg)_4%,transparent)]'
                  }`}
                >
                  {/* Cover doubles as the play button */}
                  <button
                    onClick={() => toggleBeat(beat)}
                    className="group relative h-10 w-10 overflow-hidden"
                    aria-label={playing ? `Pause ${beat.name}` : `Play ${beat.name}`}
                  >
                    <img src={beat.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                    <span
                      className={`absolute inset-0 flex items-center justify-center bg-black/55 text-white transition-opacity ${
                        active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                      }`}
                    >
                      <PlayIcon playing={playing} />
                    </span>
                  </button>

                  <div className="min-w-0">
                    <p className={`truncate text-sm ${active ? 'text-[var(--accent)]' : ''}`}>{beat.name}</p>
                    <p className="ab-meta truncate">
                      {beat.artist}
                      {/* On phones the other columns fold into this line. */}
                      {meta && <span className="md:hidden"> · {meta}</span>}
                    </p>
                  </div>

                  <span className="ab-meta hidden truncate md:block">{clean(beat.genre) || '—'}</span>
                  <span className="ab-meta hidden truncate md:block">{clean(beat.mood) || '—'}</span>
                  <span className="ab-meta hidden truncate md:block">{beat.key || '—'}</span>
                  <span className="ab-meta hidden md:block">{bpmNumber(beat.bpm) || '—'}</span>

                  <button
                    onClick={() => openLicenseModal(beat)}
                    className="ab-btn ab-btn-sm justify-self-end"
                    aria-label={`Licenses for ${beat.name}, from $${BASE_PRICE.toFixed(2)}`}
                  >
                    <span className="hidden sm:inline">From </span>${BASE_PRICE.toFixed(2)}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && (
          <p className="ab-label-dim mt-6">
            {rows.length} of {queue.length}
          </p>
        )}
      </div>
    </Layout>
  );
}
