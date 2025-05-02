// pages/signin.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SignIn() {
  const router = useRouter();
  const redirectTo = router.query.redirectTo || '/';

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // ✅ Send user directly to the destination, not back to /signin
        redirectTo: `${window.location.origin}${redirectTo}`,
      },
    });

    if (error) {
      console.error('Google sign-in error:', error.message);
    }
  };

  useEffect(() => {
    const handleRedirect = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (data?.session) {
        // ✅ Clean up the URL hash fragment from Supabase
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }

        router.push(redirectTo);
      } else if (error) {
        console.error('❌ Session fetch error:', error.message);
      }
    };

    handleRedirect();
  }, [router, redirectTo]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/images/signinbk.png')] bg-cover bg-center relative">
      {/* 🔙 Back Arrow */}
      <button
        onClick={() => {
          if (router.query.redirectTo) {
            router.push('/');
          } else if (window.history.length > 1) {
            router.back();
          } else {
            router.push('/');
          }
        }}
        className="absolute top-6 left-6 cursor-pointer text-white hover:text-gray-300 text-2xl"
      >
        ← Back
      </button>

      <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-10 w-[90%] max-w-4xl border border-white">
        {/* Left: Google Sign-In */}
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-4xl font-bold text-white mb-8">Sign In</h2>
          <button
            onClick={handleGoogleSignIn}
            className="bg-white text-black py-3 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition w-full"
          >
            <img src="/images/google-icon.png" alt="Google" className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>

        {/* Right: Art */}
        <div className="flex-1 hidden md:flex items-center justify-center">
          <img
            src="/images/signin.gif"
            alt="Sign In Art"
            className="rounded-xl w-full h-auto object-cover"
          />
        </div>
      </div>
    </div>
  );
}
