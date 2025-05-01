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
    if (currentBeat?.audioUrl === beat.audioUrl) return;

    playBeat({
      name: beat.title,
      audioUrl: beat.audioUrl,
      cover: beat.cover,
      artist: beat.artistType || 'Anton Boss',
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
        {beats.map((beat) => (
          <SwiperSlide
            key={beat.id}
            style={{ width: '300px', height: '420px' }}
            onClick={() => handleSelectBeat(beat)}
            className="flex flex-col items-center justify-start cursor-pointer space-y-2"
          >
            <Image
              src={beat.cover}
              alt={beat.title}
              width={300}
              height={300}
              className="rounded-xl object-cover"
            />
            <div className="flex flex-wrap gap-2 justify-center text-xs text-gray-400 mt-2">
              {beat.bpm && <span>BPM: {beat.bpm}</span>}
              {beat.mood && <span>Mood: {beat.mood}</span>}
              {beat.key && <span>Key: {beat.key}</span>}
              {beat.artistType && <span>Artist: {beat.artistType}</span>}
            </div>
            <h2 className="text-black text-2xl font-bold text-center mt-3">
              {beat.title}
            </h2>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
