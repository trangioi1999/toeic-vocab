import { useEffect, useState } from 'react';
import { loadVocab } from '../lib/vocab.js';

export function useVocab() {
  const [st, setSt] = useState({ data: null, error: false });
  useEffect(() => {
    let alive = true;
    loadVocab().then(data => alive && setSt({ data, error: false })).catch(() => alive && setSt({ data: null, error: true }));
    return () => { alive = false; };
  }, []);
  return st;
}
