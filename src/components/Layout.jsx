// src/components/Layout.jsx
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-950 text-white">
      <Navbar />
      <main className="container mx-auto px-4 flex-grow py-8">{children}</main>
      <Footer />
    </div>
  );
}
