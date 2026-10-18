// pages/signin.js
//
// One way in: Google. Laid out like the rest of the site — the standalone
// nav, a display heading, square controls — rather than the old glass card
// over a photo.

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabaseClient';

const PERKS = [
  ['Your library', 'Every beat you’ve licensed, with its MP3, WAV and stems.'],
  ['Order history', 'Receipts and PayPal references, all in one place.'],
  ['Quicker checkout', 'Stay signed in and go straight to paying.'],
];

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function SignIn() {
  const router = useRouter();
  const redirectTo = typeof router.query.redirectTo === 'string' ? router.query.redirectTo : '/account';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Straight back to where they were headed, not to /signin.
      options: { redirectTo: `${window.location.origin}${redirectTo}` },
    });
    if (err) {
      console.error('Google sign-in error:', err.message);
      setError('Couldn’t reach Google. Please try again.');
      setBusy(false);
    }
  };

  // Already signed in (or just back from Google): go on through.
  useEffect(() => {
    if (!router.isReady) return;
    supabase.auth.getSession().then(({ data, error: err }) => {
      if (data?.session) {
        // Clear the token fragment Supabase leaves in the URL.
        if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
        router.replace(redirectTo);
      } else if (err) {
        console.error('Session fetch error:', err.message);
      }
    });
  }, [router, redirectTo]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      <Head>
        <title>Sign in — Anton Boss</title>
      </Head>
      <Navbar />

      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-16 px-6 pb-24 pt-36 md:grid-cols-2 md:pt-28">
        <section>
          <p className="ab-label mb-4">Account</p>
          <h1 className="ab-display" style={{ fontSize: 'clamp(2.5rem, 7vw, 4.5rem)' }}>
            Sign in.
          </h1>
          <p className="ab-body mt-6 max-w-sm">
            One tap with Google. Your beats, downloads and licenses live in your account.
          </p>

          <button
            onClick={handleGoogleSignIn}
            disabled={busy}
            className="mt-10 flex w-full max-w-sm items-center justify-center gap-3 border border-[var(--fg)] bg-[var(--fg)] px-6 py-4 font-mono text-[0.6875rem] uppercase tracking-[0.25em] text-[var(--bg)] transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
              <GoogleMark />
            </span>
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>

          {error && <p className="ab-body mt-4 text-[var(--accent)]">{error}</p>}

          <p className="ab-meta mt-6 max-w-sm">
            By continuing you agree to the{' '}
            <Link href="/license" className="underline hover:text-[var(--fg)]">
              license terms
            </Link>
            .
          </p>
        </section>

        <ol className="border-t border-[var(--fg-10)]">
          {PERKS.map(([title, text], i) => (
            <li key={title} className="flex gap-6 border-b border-[var(--fg-10)] py-6">
              <span className="ab-label-dim w-6 pt-1">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="text-sm uppercase tracking-[0.2em]">{title}</p>
                <p className="ab-body mt-2">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
