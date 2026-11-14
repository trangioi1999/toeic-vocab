import { Navigate, useParams } from 'react-router-dom';
import { useVocab } from '../../hooks/useVocab.js';
import { VocabState } from './VocabHome.jsx';
import StudyView from './StudyView.jsx';

export default function SetPage() {
  const { sid } = useParams();
  const { data, error } = useVocab();
  if (!data) return <VocabState error={error} />;
  const s = data.setMap.get(sid);
  if (!s) return <Navigate to="/vocab" replace />;
  return <StudyView key={s.id} title={s.title} sub={`${s.group.name}, ${s.items.length} thẻ`} items={s.items} pool={data.all} back={'/vocab/g/' + s.group.id} backLabel={s.group.name} />;
}
