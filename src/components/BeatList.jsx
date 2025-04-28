// src/components/BeatList.jsx
import BeatCard from './BeatCard';

export default function BeatList({ beats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {beats.map(beat => (
        <BeatCard key={beat.id} beat={beat} />
      ))}
    </div>
  );
}
