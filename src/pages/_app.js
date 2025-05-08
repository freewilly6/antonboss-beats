// pages/_app.js
import "@/styles/globals.css";
import { useEffect, useState } from "react";
import { CartProvider } from "@/context/CartContext";
import { PlayerProvider, usePlayer } from "@/context/PlayerContext";
import { BeatQueueProvider } from "@/context/BeatQueueContext";
import { LicenseModalProvider } from "@/context/LicenseModalContext";
import BeatPlayer from "@/components/BeatPlayer";
import LicenseModal from "@/components/LicenseModal";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

// ✅ Supabase setup
import { createBrowserClient } from "@supabase/ssr";
import Cookies from "js-cookie";

// ✅ Your custom browser Supabase client
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Optional: Global player mount logic
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
      console.log("Auth event:", event, session);

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
            <LicenseModalProvider>
              <div className="min-h-screen flex flex-col">
                <div className="flex-grow">
                  <Component {...pageProps} />
                </div>
                <GlobalBeatPlayer />
                <LicenseModal />
              </div>
            </LicenseModalProvider>
          </BeatQueueProvider>
        </PlayerProvider>
      </CartProvider>
    </PayPalScriptProvider>
  );
}
