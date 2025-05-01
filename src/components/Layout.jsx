// src/components/Layout.jsx
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children, showNavbar = true, showFooter = true }) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      {showNavbar && <Navbar />}

      <main className="container mx-auto px-4 flex-grow pt-20 pb-32">
        {children}
      </main>

      {showFooter && <Footer />}
    </div>
  );
}
