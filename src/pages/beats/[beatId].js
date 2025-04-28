import Layout from '../../components/Layout';
import BeatPlayer from '../../components/BeatPlayer';

export default function BeatDetail() {
  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Quag</h1>
      <BeatPlayer audioSrc="/audio/Quag.mp3" />
      <p className="mt-4">$29.99</p>
    </Layout>
  );
}
