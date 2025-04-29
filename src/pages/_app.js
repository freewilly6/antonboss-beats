import "@/styles/globals.css";
import { PlayerProvider } from '../context/PlayerContext';

export default function App({ Component, pageProps }) {
  return (
    <PlayerProvider>
      <Component {...pageProps} />
    </PlayerProvider>
  );
}