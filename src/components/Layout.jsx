// src/components/Layout.jsx
import Navbar from './Navbar';
import Footer from './Footer';
import { usePlayer } from '../context/PlayerContext';
import BeatPlayer from './BeatPlayer';

export default function Layout({ children, showNavbar = true, showFooter = true }) {
  const { currentBeat } = usePlayer();

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      {showNavbar && <Navbar />}
      
      {/* Main page content */}
      <main className="container mx-auto px-4 flex-grow py-8 pb-32">
        {children}
      </main>

      {/* Sticky BeatPlayer at bottom */}
      {currentBeat && (
        <div className="fixed bottom-0 w-full z-50 bg-gray-900 border-t border-gray-700">
          <BeatPlayer beat={currentBeat} />
        </div>
      )}

      {showFooter && <Footer />}
    </div>
  );
}
