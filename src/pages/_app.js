// pages/_app.js
import "@/styles/globals.css";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CartProvider } from "@/context/CartContext";
import { PlayerProvider, usePlayer } from "@/context/PlayerContext";
import { BeatQueueProvider } from "@/context/BeatQueueContext";
import { LicenseModalProvider, useLicenseModal } from "@/context/LicenseModalContext";

import VhsOverlay from "@/components/VhsOverlay";
import { createBrowserClient } from "@supabase/ssr";
import Cookies from "js-cookie";
import { Analytics } from "@vercel/analytics/next";

// PayPalScriptProvider used to wrap the whole app, which meant every page —
// the homepage included — fetched the PayPal SDK from paypal.com before it
// could settle. It now lives on /cart, the only page that checks out.

// The playbar's transport icons and queue panel are dead weight until a beat
// plays; the license modal until a license is opened.
const BeatPlayer = dynamic(() => import("@/components/BeatPlayer"), { ssr: false });
const LicenseModal = dynamic(() => import("@/components/LicenseModal"), { ssr: false });

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// A little wrapper so the player only mounts on the client, and only once a
// beat exists — which is also when its chunk gets fetched.
function GlobalBeatPlayer() {
  const { currentBeat } = usePlayer();
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  if (!hasMounted || !currentBeat) return null;
  return <BeatPlayer />;
}

// Same idea: don't pull the modal's chunk until something opens it.
function GlobalLicenseModal() {
  const { isOpen } = useLicenseModal();
  if (!isOpen) return null;
  return <LicenseModal />;
}

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        Cookies.set("sb-access-token", session.access_token, { path: "/" });
        Cookies.set("sb-refresh-token", session.refresh_token, { path: "/" });
      }
      if (event === "SIGNED_OUT") {
        Cookies.remove("sb-access-token");
        Cookies.remove("sb-refresh-token");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <CartProvider>
      <PlayerProvider>
        <BeatQueueProvider>
          <LicenseModalProvider>
            <div className="min-h-screen flex flex-col">
              <div className="flex-grow">
                <Component {...pageProps} />
              </div>
              <GlobalBeatPlayer />
              <GlobalLicenseModal />
              {/* Tape grain over the page content. */}
              <VhsOverlay />
            </div>
          </LicenseModalProvider>
        </BeatQueueProvider>
      </PlayerProvider>
      <Analytics />
    </CartProvider>
  );
}
