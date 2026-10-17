// pages/account.js
//
// The signed-in visitor's home: who they are, what they own, what they've
// ordered, and the one profile field worth editing.

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';

// In tier order — the index decides which files a license unlocks.
const TIERS = ['Basic License', 'Premium License', 'Premium Plus License', 'Unlimited License'];

const TABS = [
  { id: 'library', label: 'Library' },
  { id: 'orders', label: 'Orders' },
  { id: 'profile', label: 'Profile' },
];

function parseBeats(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeItem(b, purchase) {
  const license = (b.licenseType ?? b.license ?? b.name ?? '').trim();
  return {
    id: b.id ?? b.beatId,
    name: b.name || b.title || 'Untitled',
    cover: b.cover,
    license,
    tier: TIERS.indexOf(license),
    price: Number(b.price) || null,
    mp3Url: b.audioUrl ?? b.mp3 ?? b.file_path,
    wavUrl: b.wav,
    stemsUrl: b.stems,
    purchasedAt: purchase.created_at,
  };
}

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const tab = TABS.some((t) => t.id === router.query.tab) ? router.query.tab : 'library';
  const setTab = (id) => router.replace({ query: { tab: id } }, undefined, { shallow: true, scroll: false });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/signin?redirectTo=/account');
        return;
      }
      if (cancelled) return;
      setUser(session.user);

      // Seeded rows only carry an email, so match on either.
      const { data, error: err } = await supabase
        .from('purchases')
        .select('*')
        .or(`user_id.eq.${session.user.id},email.eq."${session.user.email}"`)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (err) {
        console.error('Error loading purchases:', err);
        setError('Couldn’t load your purchases. Try refreshing.');
      } else {
        setPurchases(data || []);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const library = useMemo(
    () => purchases.flatMap((p) => parseBeats(p.beats).map((b) => normalizeItem(b, p))),
    [purchases]
  );

  const totalSpent = useMemo(
    () => purchases.reduce((sum, p) => sum + (Number(p.total) || 0), 0),
    [purchases]
  );

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (!user) {
    return (
      <Layout>
        <p className="ab-label-dim py-32 text-center">Loading your account…</p>
      </Layout>
    );
  }

  const meta = user.user_metadata || {};
  const displayName = meta.full_name || meta.name || user.email.split('@')[0];
  const provider = user.app_metadata?.provider;

  return (
    <Layout>
      <Head>
        <title>Account — Anton Boss</title>
      </Head>

      <div className="mx-auto max-w-5xl py-12">
        {/* Header */}
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-6">
            <img
              src={meta.avatar_url || '/images/user-default.png'}
              alt=""
              className="h-20 w-20 rounded-full border border-[var(--fg-20)] object-cover grayscale"
            />
            <div className="min-w-0">
              <p className="ab-label mb-3">Account</p>
              <h1 className="ab-display truncate">{displayName}</h1>
              <p className="ab-meta mt-2 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={signOut} className="ab-btn self-start sm:self-auto">
            Sign out
          </button>
        </div>

        {/* Stats */}
        <dl className="mt-12 grid grid-cols-2 border-y border-[var(--fg-10)] sm:grid-cols-4">
          {[
            ['Beats owned', library.length],
            ['Orders', purchases.length],
            ['Spent', `$${totalSpent.toFixed(2)}`],
            ['Member since', formatDate(user.created_at)],
          ].map(([label, value]) => (
            <div key={label} className="border-[var(--fg-10)] px-1 py-6 sm:border-r sm:px-6 sm:last:border-r-0">
              <dt className="ab-label-dim">{label}</dt>
              <dd className="mt-3 text-xl">{loading && label !== 'Member since' ? '—' : value}</dd>
            </div>
          ))}
        </dl>

        {/* Tabs */}
        <div role="tablist" aria-label="Account sections" className="mt-12 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`ab-btn ${tab === t.id ? 'ab-btn-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="mt-8">
          {error && <p className="ab-body mb-6 text-[var(--accent)]">{error}</p>}
          {tab === 'library' && <Library items={library} loading={loading} />}
          {tab === 'orders' && <Orders purchases={purchases} loading={loading} />}
          {tab === 'profile' && <Profile user={user} provider={provider} onSaved={setUser} />}
        </div>
      </div>
    </Layout>
  );
}

function Empty({ children }) {
  return (
    <div className="ab-card flex flex-col items-center gap-6 px-6 py-16 text-center">
      <p className="ab-body">{children}</p>
      <Link href="/#beats" className="ab-btn ab-btn-solid">
        Browse beats
      </Link>
    </div>
  );
}

function Library({ items, loading }) {
  if (loading) return <p className="ab-label-dim">Loading…</p>;
  if (!items.length) return <Empty>You haven’t picked up any beats yet.</Empty>;

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <li key={`${item.id}-${item.license}-${item.purchasedAt}`} className="ab-card flex gap-4 p-4">
          <img
            src={item.cover || '/images/beats/default-cover.png'}
            alt=""
            className="h-20 w-20 flex-none object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-sm">{item.name}</p>
            <p className="ab-meta truncate">
              {item.license || 'License'} · {formatDate(item.purchasedAt)}
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              {item.mp3Url && (
                <a href={item.mp3Url} download className="ab-btn ab-btn-sm">MP3</a>
              )}
              {item.tier >= 1 && item.wavUrl && (
                <a href={item.wavUrl} download className="ab-btn ab-btn-sm">WAV</a>
              )}
              {item.tier >= 2 && item.stemsUrl && (
                <a href={item.stemsUrl} download className="ab-btn ab-btn-sm">Stems</a>
              )}
              <Link href="/license" className="ab-btn ab-btn-sm ab-btn-bare">Terms</Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Orders({ purchases, loading }) {
  if (loading) return <p className="ab-label-dim">Loading…</p>;
  if (!purchases.length) return <Empty>No orders yet.</Empty>;

  return (
    <ul className="divide-y divide-[var(--fg-10)] border-y border-[var(--fg-10)]">
      {purchases.map((p, i) => {
        const beats = parseBeats(p.beats);
        return (
          <li key={p.id ?? p.paypal_transaction_id ?? i} className="flex flex-wrap items-baseline gap-x-8 gap-y-2 py-5">
            <span className="ab-meta w-28">{formatDate(p.created_at)}</span>
            <span className="min-w-0 flex-1 text-sm">
              {beats.map((b) => b.name || b.title).filter(Boolean).join(', ') || '—'}
              <span className="ab-meta ml-3">
                {beats.length} item{beats.length === 1 ? '' : 's'}
              </span>
            </span>
            {p.total != null && <span className="text-sm">${Number(p.total).toFixed(2)}</span>}
            {p.paypal_transaction_id && (
              <span className="ab-meta w-full truncate sm:w-auto">#{p.paypal_transaction_id}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Profile({ user, provider, onSaved }) {
  const meta = user.user_metadata || {};
  const [name, setName] = useState(meta.full_name || meta.name || '');
  const [status, setStatus] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setStatus('Saving…');
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    if (error) {
      setStatus(error.message);
      return;
    }
    onSaved(data.user);
    setStatus('Saved');
  };

  return (
    <form onSubmit={save} className="max-w-md space-y-8">
      <label className="block">
        <span className="ab-label-dim">Display name</span>
        <input
          className="ab-input mt-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Your name"
        />
      </label>

      <label className="block">
        <span className="ab-label-dim">Email</span>
        <input className="ab-input mt-2 text-[var(--fg-50)]" value={user.email} readOnly />
      </label>

      {provider && (
        <p className="ab-meta">
          Signed in with <span className="text-white capitalize">{provider}</span>
        </p>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" className="ab-btn ab-btn-solid">
          Save changes
        </button>
        {status && <span className="ab-label-dim">{status}</span>}
      </div>
    </form>
  );
}
