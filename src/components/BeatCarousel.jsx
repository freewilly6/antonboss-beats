import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Navigation } from 'swiper/modules';
import { usePlayer } from '@/context/PlayerContext';
import Image from 'next/image';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-coverflow';

export default function BeatCarousel({ beats }) {
  const { playBeat, currentBeat } = usePlayer();

  const handleSelectBeat = (beat) => {
    const currentUrl = currentBeat?.audioUrl || currentBeat?.audiourl;
    const beatUrl = beat.audioUrl || beat.audiourl;

    if (currentUrl === beatUrl) return;

    playBeat({
      name: beat.name || beat.title || 'Untitled',
      audioUrl: beatUrl,
      cover: beat.cover || '/images/beats/default-cover.png',
      artist: beat.artistType || beat.artist || 'Anton Boss',
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-10">
      <Swiper
        modules={[EffectCoverflow, Navigation]}
        effect="coverflow"
        grabCursor
        centeredSlides
        slidesPerView="auto"
        coverflowEffect={{
          rotate: 0,
          stretch: 0,
          depth: 150,
          modifier: 2.5,
          slideShadows: false,
        }}
        navigation
        className="mySwiper"
      >
        {beats.map((beat) => {
          const title = beat.name || beat.title || 'Untitled';
          const cover = beat.cover || '/images/beats/default-cover.png';

          // Build info line with |
          const infoParts = [
            beat.genre,
            beat.mood,
            beat.key,
            beat.bpm ? `${beat.bpm}` : null,
            beat.artistType || beat.artist,
          ].filter(Boolean); // Remove undefined/null

          return (
            <SwiperSlide
              key={beat.id}
              style={{ width: '300px', height: '460px' }}
              onClick={() => handleSelectBeat(beat)}
              className="flex flex-col items-center justify-start cursor-pointer space-y-2"
            >
              <Image
                src={cover}
                alt={title}
                width={300}
                height={300}
                className="rounded-xl object-cover"
              />
              {infoParts.length > 0 && (
                <div className="text-sm text-gray-500 mt-2 text-center">
                  {infoParts.join(' | ')}
                </div>
              )}
              <h2 className="text-black text-2xl font-bold text-center mt-3">
                {title}
              </h2>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
