// src/components/SiteMenu.jsx
//
// The full-screen menu. Renders its own trigger, so any page can drop in
// <SiteMenu /> — the scroll page floats it top-right, Navbar inlines it.

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { loadSupabase } from '@/lib/supabaseLazy';
import { useCart } from '@/context/CartContext';
import { getTheme, setTheme } from '@/lib/theme';

const PRIMARY = [
  { href: '/#scope', label: 'Scope', note: 'The oscilloscope' },
  { href: '/#beats', label: 'Beats', note: 'Pick a case' },
  { href: '/#about', label: 'About', note: 'Hit the pads' },
  { href: '/#freedom', label: 'Freedom' },
  { href: '/account', label: 'Account', note: 'Profile & purchases' },
  { href: '/cart', label: 'Cart' },
];

const SECONDARY = [
  { href: '/beats', label: 'Beat list' },
  { href: '/account?tab=library', label: 'Downloads' },
  { href: '/license', label: 'Licensing' },
  { href: 'https://www.youtube.com/@AntonBoss-pd', label: 'YouTube', external: true },
  { href: 'mailto:antonbosspd@gmail.com', label: 'Email', external: true },
];

export default function SiteMenu({ floating = false }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState('dark');
  const router = useRouter();
  const { cart } = useCart();
  const count = cart?.length ?? 0;

  useEffect(() => {
    setMounted(true);
    // The boot script in _document has already applied the stored theme.
    setThemeState(getTheme());
  }, []);

  const chooseTheme = (t) => {
    setTheme(t);
    setThemeState(t);
  };

  useEffect(() => {
    // Loaded on demand — see lib/supabaseLazy.js.
    let listener;
    let cancelled = false;
    loadSupabase().then((supabase) => {
      if (cancelled) return;
      supabase.auth.getUser().then(({ data }) => !cancelled && setUser(data?.user ?? null));
      ({ data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ?? null);
      }));
    });
    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // Close on navigation, on Escape, and lock the page scroll while open.
  useEffect(() => {
    const close = () => setOpen(false);
    router.events.on('routeChangeStart', close);
    router.events.on('hashChangeStart', close);
    return () => {
      router.events.off('routeChangeStart', close);
      router.events.off('hashChangeStart', close);
    };
  }, [router.events]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const signOut = async () => {
    await (await loadSupabase()).auth.signOut();
    setOpen(false);
  };

  // On the home page, in-page links scroll rather than routing.
  const go = (e, href) => {
    if (!href.startsWith('/#') || router.pathname !== '/') return;
    e.preventDefault();
    setOpen(false);
    const id = href.slice(2);
    // Wait a frame for the scroll lock to release before scrolling.
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
    });
  };

  const name = user?.user_metadata?.full_name || user?.email;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="site-menu"
        // Same white pill everywhere; on the scroll page it floats.
        className={floating ? 'site-menu-trigger fixed right-5 top-5' : 'site-menu-trigger'}
        style={floating ? { zIndex: 'var(--z-chrome)' } : undefined}
      >
        <span className="site-menu-burger" aria-hidden="true">
          <i /><i />
        </span>
        Menu
      </button>

      {/* Portaled to <body> so no header's stacking context can trap it
          beneath the playbar. */}
      {mounted && createPortal(
        <div
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className={`site-menu ${open ? 'is-open' : ''}`}
          style={{ zIndex: 'var(--z-dialog)' }}
          inert={!open}
        >
          <div className="flex items-center justify-between px-6 py-5 sm:px-10">
            <Link href="/" onClick={() => setOpen(false)}>
              <img
                src="/images/logo-256.webp"
                alt="Anton Boss"
                width={256}
                height={256}
                decoding="async"
                className="h-10 w-auto"
              />
            </Link>
            <button onClick={() => setOpen(false)} className="ab-btn">
              Close ×
            </button>
          </div>

          <div className="mx-auto grid w-full max-w-6xl flex-1 gap-12 overflow-y-auto px-6 pb-12 sm:px-10 md:grid-cols-[3fr_2fr]">
            <nav aria-label="Main">
              <ol className="space-y-1">
                {PRIMARY.map((item, i) => (
                  <li key={item.href} className="site-menu-item" style={{ '--i': i }}>
                    <Link
                      href={item.href}
                      onClick={(e) => go(e, item.href)}
                      className="group flex items-baseline gap-5 py-2"
                    >
                      <span className="ab-label-dim w-6">{String(i + 1).padStart(2, '0')}</span>
                      <span className="site-menu-link">
                        {item.label}
                        {item.href === '/cart' && count > 0 && (
                          <sup className="ml-2 text-base text-[var(--accent)]">{count}</sup>
                        )}
                      </span>
                      {item.note && (
                        <span className="ab-label-dim hidden transition-colors group-hover:text-[var(--accent)] sm:inline">
                          {item.note}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="flex flex-col justify-end gap-10 md:pb-4">
              <div className="ab-card p-5">
                {user ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={user.user_metadata?.avatar_url || '/images/user-default.png'}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover grayscale"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="ab-label-dim">Signed in</p>
                      <p className="truncate text-sm">{name}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link href="/account" className="ab-btn ab-btn-sm">Account</Link>
                      <button onClick={signOut} className="ab-btn ab-btn-sm">Sign out</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="ab-label-dim">Not signed in</p>
                      <p className="ab-body mt-1">Sign in to see your purchases.</p>
                    </div>
                    <Link href="/signin?redirectTo=/account" className="ab-btn ab-btn-solid">
                      Sign in
                    </Link>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
              <span className="ab-label-dim">Theme</span>
              <div className="theme-switch" role="radiogroup" aria-label="Colour theme">
                {['dark', 'light'].map((t) => (
                  <button
                    key={t}
                    role="radio"
                    aria-checked={theme === t}
                    onClick={() => chooseTheme(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <ul className="flex flex-wrap gap-x-6 gap-y-3">
                {SECONDARY.map((item) => (
                  <li key={item.href}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target={item.href.startsWith('http') ? '_blank' : undefined}
                        rel="noreferrer"
                        className="ab-label hover:text-white"
                      >
                        {item.label} ↗
                      </a>
                    ) : (
                      <Link href={item.href} className="ab-label hover:text-white">
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
