// src/components/BeatCard.jsx
import Link from 'next/link';

export default function BeatCard({ beat }) {
  return (
    <Link href={`/beats/${beat.id}`}>
      <div className="rounded shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
        <img src={beat.cover} alt={beat.title} className="rounded-t" />
        <div className="p-4">
          <h3 className="font-bold">{beat.title}</h3>
          <p className="text-gray-500">${beat.price}</p>
        </div>
      </div>
    </Link>
  );
}
