import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [user, setUser] = useState(null);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('User session:', session);
      setUser(session?.user ?? null);
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowSignOutModal(false);
    setUser(null);
  };

  return (
    <Layout showNavbar={false} showFooter={false}>
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">

        {/* Main Card */}
        <div className="relative w-[320px] h-[520px] rounded-2xl flex flex-col items-center overflow-hidden">

          {/* Background SVG */}
          <img 
            src="/images/curves/full-frame2.svg" 
            alt="Full card design"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* Anton Boss title */}
          <div className="absolute top-5 right-[8px] flex space-y-2">
            <h1 className="text-4xl font-bold text-black">Anton</h1>
            <h1 className="text-4xl font-bold text-black my-8">Boss</h1>
            </div>

          {/* Sign In / Sign Out Button */}
          <div className="absolute top-[18px] right-[233px] z-10">
            <button
              onClick={() => {
                if (user) {
                  setShowSignOutModal(true);
                } else {
                  window.location.href = '/signin';
                }
              }}
              className="bg-white text-black hover:bg-gray-200 hover:scale-105 transform transition text-base p-2 rounded-full mt-4 cursor-pointer"
            >
              👤
            </button>
          </div>

          {/* Tracks and About Buttons */}
          <div className="absolute top-[110px] right-[20px] flex space-x-2 z-10">
            <Link 
              href="/beats"
              className="w-16 h-8 flex items-center justify-center bg-white text-black rounded-full text-xs font-semibold hover:bg-gray-200 hover:scale-105 transform transition"
            >
              Tracks
            </Link>
            <Link 
              href="/about"
              className="w-16 h-8 flex items-center justify-center bg-white text-black rounded-full text-xs font-semibold hover:bg-gray-200 hover:scale-105 transform transition"
            >
              About
            </Link>
          </div>

          {/* YouTube Playlist Embed */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <iframe
              width="280"
              height="157"
              src="https://www.youtube.com/embed/videoseries?list=PLxKtOIeUvrIcAO3x86BlRFscyLnEM8HFT"
              title="Anton Boss Playlist"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-md pointer-events-auto"
            ></iframe>
          </div>

          {/* Sign Out Modal */}
          {showSignOutModal && (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 z-20">
              <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                <p className="mb-4">Do you want to sign out?</p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleSignOut}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Yes, sign out
                  </button>
                  <button
                    onClick={() => setShowSignOutModal(false)}
                    className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Freedom Text with Fade-In */}
        <div className="mt-8 text-center space-y-2 px-4 animate-fade-in">
          <h1 className="text-5xl font-sans font-semibold text-black">Freedom</h1>
          <p className="italic text-xl text-gray-700">/ˈfriːdəm/</p>
          <p className="text-md text-gray-600 max-w-xl mx-auto">
            “The power or right to act, speak, or think as one wants without hindrance or restraint.”
          </p>
        </div>
      </div>
    </Layout>
  );
}
