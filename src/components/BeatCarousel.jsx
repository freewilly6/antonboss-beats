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
        keyboard={{
          enabled: true,
          onlyInViewport: true,    // set to false if you want it to work even when swiper isn't fully in view
        }}
        className="mySwiper"
      >
        {beats.map((beat) => {
          const title = beat.name       || beat.title            || 'Untitled';
          const cover = beat.cover      || '/images/beats/default-cover.png';
          const infoParts = [
            beat.genre,
            beat.mood,
            beat.key,
            beat.bpm,                          
            beat.artistType || beat.artist,
          ].filter(Boolean);

          return (
            <SwiperSlide
              key={beat.id}
              onClick={() => handleSelectBeat(beat)}
              className="flex-shrink-0 cursor-pointer"
              style={{ width: 300 }}
            >
              <div className="flex flex-col items-center">
                <div className="relative w-[300px] h-[300px] rounded-xl overflow-hidden">
                  <Image
                    src={cover}
                    alt={title}
                    fill
                    className="object-cover"
                  />
                </div>
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
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
