// src/components/Layout.jsx
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children, showNavbar = true, showFooter = true }) {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {showNavbar && <Navbar />}

      <main className="container mx-auto px-4 flex-grow pt-22">
        {children}
      </main>

      {showFooter && <Footer />}
    </div>
  );
}
