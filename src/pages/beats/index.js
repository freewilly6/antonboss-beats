// src/pages/beats/index.js
import Layout from '../../components/Layout';
import BeatList from '../../components/BeatList';
import { beatsData } from '../../data/beats'; // import beats here

// Your local beats data
const beats = [
  { id: 1, title: 'Quag', price: 29.99, cover: '/images/beats/beat1.png', bpm: 140, mood: 'Dark', key: 'C Minor', artistType: 'Travis Scott' },
  { id: 2, title: 'Bonix', price: 24.99, cover: '/images/beats/beat2.png', bpm: 130, mood: 'Chill', key: 'A Minor', artistType: 'Drake' },
];

// Static Generation function
export async function getStaticProps() {
  return {
    props: {
      beats,
    },
  };
}

// Main Beats Page
export default function Beats({ beats }) {
  return (
    <Layout>
      <div className="mt-10">
        <h1 className="text-3xl font-bold mb-8 text-center">All Beats</h1>
        <BeatList beats={beats} />
      </div>
    </Layout>
  );
}
