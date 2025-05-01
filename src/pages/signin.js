import Link from 'next/link';

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/images/signinbk.png')] bg-cover bg-center relative">
      
      {/* 🔙 Back Arrow */}
      <Link href="/">
        <div className="absolute top-6 left-6 cursor-pointer text-white hover:text-gray-300 text-2xl">
          ← Back
        </div>
      </Link>

      <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-10 w-[90%] max-w-4xl border border-white">
        
        {/* Left: Sign In Form */}
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-4xl font-bold text-white mb-8">Sign In</h2>
          <form className="flex flex-col gap-5">
            <input
              type="email"
              placeholder="Enter your email address"
              className="p-3 rounded-lg bg-white/20 text-white placeholder-white focus:outline-none border border-white"
            />
            <input
              type="password"
              placeholder="Enter your password"
              className="p-3 rounded-lg bg-white/20 text-white placeholder-white focus:outline-none border border-white"
            />
            <a href="#" className="text-sm text-white underline">Forgotten Password?</a>
            <button className="bg-black hover:bg-gray-800 text-white py-3 rounded-lg transition">
              Login Now
            </button>

            {/* Google Sign-In */}
            <button className="bg-white text-black py-3 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition">
              <img src="/images/google-icon.png" alt="Google" className="w-5 h-5" />
              Sign in with Google
            </button>

            <p className="text-white text-sm mt-2">
              Don’t have an account yet? <button className="underline ml-1">Create Account</button>
            </p>
          </form>
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
