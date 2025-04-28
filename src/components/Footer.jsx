// src/components/Footer.jsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10 mt-16">
      <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="text-xl font-bold text-indigo-300">
          ANTONBOSS
        </div>
        <nav className="flex flex-col">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/beats" className="hover:text-white">Beats</Link>
          <Link href="/soundkits" className="hover:text-white">Sound Kits</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
        </nav>
        <nav className="flex flex-col">
          <Link href="/licensing" className="hover:text-white">Licensing Info</Link>
          <Link href="/terms" className="hover:text-white">Terms of Use</Link>
          <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
          <Link href="/youtube-terms" className="hover:text-white">YouTube Terms of Service</Link>
        </nav>
        <nav className="flex flex-col">
          <Link href="https://www.youtube.com/@AntonBoss-pd" className="hover:text-white">Youtube</Link>
        </nav>
      </div>
      <div className="text-center text-sm mt-8">
        &copy; {new Date().getFullYear()} AntonBoss. All Rights Reserved.
      </div>
    </footer>
  );
}
