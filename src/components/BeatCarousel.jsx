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
  className="
    relative w-[280px] h-[280px]
    rounded-full overflow-hidden
    ring-4 ring-gray-200 shadow-lg
    bg-gradient-to-br from-gray-100 via-gray-300 to-gray-100
  "
  style={{
    WebkitMaskImage: 'radial-gradient(circle at center, transparent 8%, black 10%)',
    maskImage:       'radial-gradient(circle at center, transparent 8%, black 10%)',
  }}
>
  {/* — COVER ART (z-0) — */}
  <div
  className={`absolute inset-0 z-0 ${
    isActive
      ? 'animate-[spin_4s_linear_infinite]'
      : ''
  }`}
>
  <Image
    src={cover}
    alt={title}
    fill
    className="object-cover"
  />
</div>

  {/* — CENTER RING OVERLAY (z-30) — */}
  <div className="absolute inset-0 z-30 pointer-events-none">
    <Image
      src="/images/cd-overlay.png"
      alt="CD Overlay"
      fill
      className="object-contain"
    />
  </div>
</div>

              {/* INFO BELOW */}
              <div className="mt-4 text-center space-y-1">
                {infoParts.length > 0 && (
                  <p className="text-sm text-gray-500">
                    {infoParts.join(' | ')}
                  </p>
                )}
                <h2 className="text-black text-2xl font-bold">
                  {title}
                </h2>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
