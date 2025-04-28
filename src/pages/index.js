// src/pages/index.js
import Layout from '../components/Layout';
import BeatList from '../components/BeatList';

const beats = [
  {
    id: 'Quag',
    title: 'Quag',
    price: 29.99,
    cover: '/images/beats/beat1.png',
  },
  {
    id: 'bonix',
    title: 'bonix',
    price: 24.99,
    cover: '/images/beats/beat2.png',
  },
  // add more beats here...
];

export default function Home() {
  return (
    <Layout>
      <h1 className="text-3xl font-bold my-8 text-center">AntonBoss Beats</h1>
      <BeatList beats={beats} />
    </Layout>
  );
}
