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
                className="disc-wrapper mx-auto"
                style={{
                  WebkitMaskImage: 'radial-gradient(circle at center, transparent 8%, black 10%)',
                  maskImage:       'radial-gradient(circle at center, transparent 8%, black 10%)',
                }}
              >
                {/* ROTATING LAYER */}
                <div
                  className={`disc-rotator absolute inset-0 ${
                    isActive ? 'animate-[spin_4s_linear_infinite]' : ''
                  }`}
                >
                  {/* COVER ART */}
                  <Image
                    src={cover}
                    alt={title}
                    fill
                    sizes="280px"
                    className="object-cover"
                  />

                  {/* BORDER WRAPPER */}
                  <div className="border-rotator absolute inset-0 pointer-events-none">
                    <Image
                      src="/images/cd-border.png"
                      alt="CD Border"
                      fill
                      sizes="280px"
                      className="object-cover"
                    />
                  </div>

           

                </div>

                {/* STATIC CENTER RING */}
                <div className="absolute inset-0 z-20 pointer-events-none">
                  <Image
                    src="/images/cd-overlay.png"
                    alt="CD Overlay"
                    fill
                    sizes="280px"
                    className="object-contain"
                  />
                </div>
              </div>

              {/* META UNDERNEATH */}
<div className="mt-4 w-[280px] mx-auto text-center">
  {infoParts.length > 0 && (
    <p className="text-sm text-gray-500 mb-1">
      {infoParts.join(' | ')}
    </p>
  )}
  <p className="text-2xl font-semibold text-black">
    {title}
  </p>
</div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
