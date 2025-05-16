import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Navigation, Keyboard } from 'swiper/modules';
import { usePlayer } from '@/context/PlayerContext';
import Image from 'next/image';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-coverflow';
import 'swiper/css/keyboard';

export default function BeatCarousel({ beats }) {
  const { playBeat, currentBeat } = usePlayer();

  const handleSelectBeat = (beat) => {
    const currentUrl = currentBeat?.audioUrl || currentBeat?.audiourl;
    const beatUrl    = beat.audioUrl    || beat.audiourl;
    if (currentUrl === beatUrl) return;

    playBeat({
      name:     beat.name       || beat.title            || 'Untitled',
      audioUrl: beatUrl,
      cover:    beat.cover      || '/images/beats/default-cover.png',
      artist:   beat.artistType || beat.artist           || 'Anton Boss',
    });
  };

  return (
    <>
      <div className="w-full max-w-5xl mx-auto mt-10">
        <Swiper
          modules={[EffectCoverflow, Navigation, Keyboard]}
          effect="coverflow"
          grabCursor
          centeredSlides
          slidesPerView="auto"
          coverflowEffect={{
            rotate:       0,
            stretch:      0,
            depth:        150,
            modifier:     2.5,
            slideShadows: false,
          }}
          navigation
          keyboard={{ enabled: true, onlyInViewport: true }}
          className="mySwiper"
        >
          {beats.map((beat) => {
            const title     = beat.name       || beat.title || 'Untitled';
            const cover     = beat.cover      || '/images/beats/default-cover.png';
            const infoParts = [
              beat.genre, beat.mood, beat.key, beat.bpm,
              beat.artistType || beat.artist,
            ].filter(Boolean);

            const beatUrl = beat.audioUrl || beat.audiourl;
            const isActive = currentBeat?.audioUrl === beatUrl;

            return (
              <SwiperSlide
                key={beat.id}
                onClick={() => handleSelectBeat(beat)}
                className="flex-shrink-0 cursor-pointer"
                style={{ width: 300 }}
              >
                {/* DISC WRAPPER */}
                <div
                  className="disc-wrapper mx-auto"
                  style={{
                    WebkitMaskImage: 'radial-gradient(circle at center, transparent 8%, black 10%)',
                    maskImage:       'radial-gradient(circle at center, transparent 8%, black 10%)',
                  }}
                >
                  {/* ROTATING LAYER (with shine) */}
                  <div
                    className={`disc-rotator absolute inset-0 z-0 ${
                      isActive ? 'animate-[spin_4s_linear_infinite]' : ''
                    }`}
                  >
                    <Image
                      src={cover}
                      alt={title}
                      fill
                      sizes="280px"
                      className="object-cover"
                    />
                  </div>

                  {/* STATIC CD OVERLAY */}
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    <Image
                      src="/images/cd-overlay.png"
                      alt="CD Overlay"
                      fill
                      sizes="280px"
                      className="object-contain"
                    />
                  </div>
                </div>

                {/* INFO UNDERNEATH */}
 <div className="mt-4 w-[280px] mx-auto text-center space-y-1">
    {infoParts.length > 0 && (
      <p className="text-sm text-gray-500">
        {infoParts.join(' | ')}
      </p>
    )}
    <h2 className="text-black text-2xl font-bold">{title}</h2>
  </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>

      {/* scoped styles for rim + shine */}
      <style jsx>{`
        .disc-wrapper {
          position: relative;
          width: 280px;
          height: 280px;
          border-radius: 9999px;
          overflow: hidden;
          background: linear-gradient(to bottom right, #f0f0f0, #dcdcdc, #f0f0f0);
          border: 4px solid #222;
          box-shadow:
            0 0 0 2px rgba(255,255,255,0.1),
            0 0 10px 2px rgba(0,0,0,0.5);
          /* centers wrapper in the 300px slide */
          margin: 0 auto;
        }
        .disc-rotator::after {
          content: '';
          position: absolute;
          top: -100%;
          left: -100%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            60deg,
            rgba(255,255,255,0) 30%,
            rgba(255,255,255,0.4) 50%,
            rgba(255,255,255,0) 70%
          );
          transform: rotate(25deg) translateX(-100%);
          pointer-events: none;
          animation: shine 3s ease-in-out infinite;
        }
        @keyframes shine {
          to {
            transform: rotate(25deg) translateX(100%);
          }
        }
      `}</style>
    </>
  );
}
