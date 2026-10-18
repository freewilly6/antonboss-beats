// pages/account.js
//
// The signed-in visitor's home: who they are, what they own, what they've
// ordered, and the one profile field worth editing.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';

const TABS = [
  { id: 'library', label: 'Library' },
  { id: 'orders', label: 'Orders' },
  { id: 'profile', label: 'Profile' },
];

const STATUS_LABELS = {
  paid: 'Paid',
  pending: 'Awaiting PayPal',
  refunded: 'Refunded',
  reversed: 'Reversed',
  denied: 'Declined',
};

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// While a payment awaits PayPal's confirmation, check back this often…
const POLL_MS = 5000;
// …for about two minutes, after which the buyer can refresh themselves.
const POLL_LIMIT = 24;

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  // { library, orders, pending, expiresAt } from /api/downloads. Files are
  // presigned server-side for exactly what each paid license includes.
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [polls, setPolls] = useState(0);

  const tab = TABS.some((t) => t.id === router.query.tab) ? router.query.tab : 'library';
  const setTab = (id) => router.replace({ query: { tab: id } }, undefined, { shallow: true, scroll: false });

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/signin?redirectTo=/account');
      return;
    }
    setUser((u) => u || session.user);
    try {
      const res = await fetch('/api/downloads', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
      setError('');
    } catch (err) {
      console.error('Error loading downloads:', err);
      setError('Couldn’t load your purchases. Try refreshing.');
      setData((d) => d || { library: [], orders: [], pending: false });
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while PayPal hasn't confirmed a payment yet, so files appear by themselves.
  useEffect(() => {
    if (!data?.pending || polls >= POLL_LIMIT) return;
    const t = setTimeout(() => {
      setPolls((n) => n + 1);
      load();
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [data, polls, load]);

  const loading = !data;
  const library = useMemo(() => data?.library || [], [data]);
  const orders = useMemo(() => data?.orders || [], [data]);
  const totalSpent = useMemo(
    () => orders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [orders]
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
            ['Orders', orders.length],
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
          {tab === 'library' && <Library items={library} loading={loading} pending={data?.pending} />}
          {tab === 'orders' && <Orders orders={orders} loading={loading} />}
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

function Library({ items, loading, pending }) {
  if (loading) return <p className="ab-label-dim">Loading…</p>;

  const notice = pending && (
    <p className="ab-card mb-6 px-4 py-3 text-sm" role="status">
      A payment is waiting for PayPal to confirm. Its files appear here automatically — usually within a minute.
    </p>
  );
  if (!items.length) return notice || <Empty>You haven’t picked up any beats yet.</Empty>;

  return (
    <>
      {notice}
      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.beatId} className="ab-card flex gap-4 p-4">
            <img
              src={item.cover || '/images/beats/default-cover.png'}
              alt=""
              className="h-20 w-20 flex-none object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="truncate text-sm">{item.name}</p>
              <p className="ab-meta truncate">
                {item.license} · {formatDate(item.purchasedAt)}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {item.files.map((f) => (
                  // Signed link with Content-Disposition: attachment, so it
                  // saves as f.filename. Valid for 24 hours from page load.
                  <a key={f.kind} href={f.url} rel="noopener" className="ab-btn ab-btn-sm" title={f.filename}>
                    {f.label}
                  </a>
                ))}
                {item.missing?.map((kind) => (
                  <span key={kind} className="ab-btn ab-btn-sm opacity-40" title="Not uploaded yet — contact us">
                    {kind === 'stems' ? 'Stems' : kind.toUpperCase()} soon
                  </span>
                ))}
                <Link href="/license" className="ab-btn ab-btn-sm ab-btn-bare">Terms</Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="ab-meta mt-6">Download links are personal and refresh each time you open this page.</p>
    </>
  );
}

function Orders({ orders, loading }) {
  if (loading) return <p className="ab-label-dim">Loading…</p>;
  if (!orders.length) return <Empty>No orders yet.</Empty>;

  return (
    <ul className="divide-y divide-[var(--fg-10)] border-y border-[var(--fg-10)]">
      {orders.map((o, i) => (
        <li key={o.orderId ?? i} className="flex flex-wrap items-baseline gap-x-8 gap-y-2 py-5">
          <span className="ab-meta w-28">{formatDate(o.createdAt)}</span>
          <span className="min-w-0 flex-1 text-sm">
            {o.items.map((b) => b.name).filter(Boolean).join(', ') || '—'}
            <span className="ab-meta ml-3">
              {o.items.length} item{o.items.length === 1 ? '' : 's'}
            </span>
          </span>
          <span className={`ab-label ${o.status === 'paid' ? '' : '!text-[var(--accent)]'}`}>
            {STATUS_LABELS[o.status] || o.status}
          </span>
          {o.total != null && <span className="text-sm">${Number(o.total).toFixed(2)}</span>}
          {o.orderId && <span className="ab-meta w-full truncate sm:w-auto">#{o.orderId}</span>}
        </li>
      ))}
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
