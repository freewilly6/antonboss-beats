// pages/beats/index.js
import Layout from '../../components/Layout';
import BeatList from '../../components/BeatList';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function BeatsPage() {
  const [beats, setBeats] = useState([]);

  useEffect(() => {
    const fetchBeats = async () => {
      const { data, error } = await supabase.from('BeatFiles').select('*');
      if (error) console.error('Error loading beats:', error);
      else setBeats(data);
    };

    fetchBeats();
  }, []);

  return (
    <Layout>
      <div className="mt-10">
        <h1 className="text-3xl font-bold mb-8 text-center">All Beats</h1>
        <BeatList beats={beats} />
      </div>
    </Layout>
  );
}