// src/components/Navbar.jsx
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="flex justify-between py-4 items-center">
      <Link href="/">
        <img src="/images/logo.png" alt="AntonBoss Logo" className="h-12" />
      </Link>
      <div className="flex gap-6">
        <Link href="/">Home</Link>
        <Link href="/beats">Beats</Link>
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
      </div>
    </nav>
  );
}
