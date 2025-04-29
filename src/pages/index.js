// src/pages/index.js
import Layout from '../components/Layout';
import Link from 'next/link';
import Image from 'next/image'; // <-- THIS IS THE IMPORTANT LINE

export default function Home() {
  return (
    <Layout showNavbar={false} showFooter={false}>
      <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="relative w-[320px] h-[520px] rounded-2xl flex flex-col items-center overflow-hidden">

          
          {/* Full background SVG */}
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

          {/* Tracks and About buttons */}
          
<div className="absolute top-[110px] right-[20px] flex space-x-2">
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
  {/* Center Image */}
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Image 
              src="/images/freedom2.png" // 👈 replace with your image path
              alt="Center Logo"
              width={300}
              height={200}
              className="object-contain opacity-100" // can adjust opacity, size, etc
            />
          </div>

        </div>
      </div>
    </Layout>
  );
}
