import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useVocab } from '../../hooks/useVocab.js';
import { searchItems } from '../../lib/vocab.js';
import { SearchBar, VocabState } from './VocabHome.jsx';
import StudyView from './StudyView.jsx';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const { data, error } = useVocab();
  const hits = useMemo(() => (data ? searchItems(data.all, q) : []), [data, q]);
  if (!data) return <VocabState error={error} />;
  return (
    <>
      <div className="wrap" style={{ paddingTop: 8 }}><SearchBar key={q} initial={q} /></div>
      <StudyView key={q} title={`Kết quả cho “${q}”`} sub={hits.length >= 300 ? 'Hiện 300 kết quả đầu tiên' : `${hits.length} thẻ`} items={hits} pool={data.all}
        back="/vocab" backLabel="Kho từ" initialMode="list" emptyText="Không tìm thấy từ nào khớp. Thử gõ ít chữ hơn hoặc gõ không dấu." />
    </>
  );
}
