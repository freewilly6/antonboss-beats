// src/pages/index.js — the whole site, one scroll.

import { useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Scope from '@/components/sections/Scope';
import Beats from '@/components/sections/Beats';
import About from '@/components/sections/About';
import Freedom from '@/components/sections/Freedom';
import Horse from '@/components/sections/Horse';
import SiteFooter from '@/components/SiteFooter';
import PillNav from '@/components/PillNav';
import { useHashTarget } from '@/hooks/useHashTarget';

// Only fetched when the cart is opened.
const CartDrawer = dynamic(() => import('@/components/CartDrawer'), { ssr: false });

export default function Home() {
  const [cartOpen, setCartOpen] = useState(false);

  useHashTarget();

  return (
    <>
      <Head>
        <title>Anton Boss — Beats</title>
        <meta
          name="description"
          content="Beats, and an oscilloscope that reacts to them. Type a lyric, drop a font, watch it break."
        />
      </Head>

      {/* pb-32 clears the global BeatPlayer once a track is playing. */}
      <main className="pb-32">
        <Scope />
        <Beats />
        <About />
        <Freedom />
        <Horse />
        <SiteFooter />
      </main>

      <PillNav onOpenCart={() => setCartOpen(true)} />
      {cartOpen && <CartDrawer open onClose={() => setCartOpen(false)} />}
    </>
  );
}
