import { Navigate, useLocation } from 'react-router-dom';
import { useVocab } from '../../hooks/useVocab.js';
import { VocabState } from './VocabHome.jsx';
import StudyView from './StudyView.jsx';

export default function Session() {
  const { state, key } = useLocation();
  const { data, error } = useVocab();
  if (!state || !state.keys) return <Navigate to="/vocab" replace />;
  if (!data) return <VocabState error={error} />;
  const items = state.keys.map(k => data.itemMap.get(k)).filter(Boolean);
  return <StudyView key={key} title={state.title} items={items} pool={data.all} back={state.back} backLabel={state.backLabel} />;
}
