import "@/styles/globals.css";
import { useEffect, useState } from "react";
import { CartProvider } from "@/context/CartContext";
import { PlayerProvider, usePlayer } from "@/context/PlayerContext";
import { BeatQueueProvider } from "@/context/BeatQueueContext";
import { LicenseModalProvider } from "@/context/LicenseModalContext";
import BeatPlayer from "@/components/BeatPlayer";
import LicenseModal from "@/components/LicenseModal";

// ✅ MOUNT-SAFE wrapper to avoid hydration issues
function GlobalBeatPlayer() {
  const { currentBeat } = usePlayer();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted || !currentBeat) return null;

  return <BeatPlayer />;
}

export default function App({ Component, pageProps }) {
  return (
    <CartProvider>
      <PlayerProvider>
        <BeatQueueProvider>
          <LicenseModalProvider>
            <div className="min-h-screen flex flex-col">
              <div className="flex-grow">
                <Component {...pageProps} />
              </div>
              {/* ✅ BeatPlayer rendered only once, conditionally */}
              <GlobalBeatPlayer />
              <LicenseModal />
            </div>
          </LicenseModalProvider>
        </BeatQueueProvider>
      </PlayerProvider>
    </CartProvider>
  );
}
