// pages/_app.js
import "@/styles/globals.css";
import { useEffect, useState } from "react";
import { CartProvider } from "@/context/CartContext";
import { PlayerProvider, usePlayer } from "@/context/PlayerContext";
import { BeatQueueProvider } from "@/context/BeatQueueContext";

// 1) import your License modal context + component
import { LicenseModalProvider } from "@/context/LicenseModalContext";
import LicenseModal from "@/components/LicenseModal";

import BeatPlayer from "@/components/BeatPlayer";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

import { createBrowserClient } from "@supabase/ssr";
import Cookies from "js-cookie";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Keep this as-is: a little wrapper so the player only mounts on the client
function GlobalBeatPlayer() {
  const { currentBeat } = usePlayer();
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);
  if (!hasMounted || !currentBeat) return null;
  return <BeatPlayer />;
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
    <PayPalScriptProvider
      options={{
        "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
        currency: "USD",
      }}
    >
      <CartProvider>
        <PlayerProvider>
          <BeatQueueProvider>
            {/* 2) Wrap everything that might call openLicenseModal */}
            <LicenseModalProvider>
              <div className="min-h-screen flex flex-col">
                <div className="flex-grow">
                  <Component {...pageProps} />
                </div>
                <GlobalBeatPlayer />
                {/* 3) Mount the modal so it can render on top of any page */}
                <LicenseModal />
              </div>
            </LicenseModalProvider>
          </BeatQueueProvider>
        </PlayerProvider>
      </CartProvider>
    </PayPalScriptProvider>
  );
}
