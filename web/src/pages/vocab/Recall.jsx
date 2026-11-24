import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useVocab } from '../../hooks/useVocab.js';
import { useStore } from '../../hooks/useStore.js';
import { useToday } from '../../hooks/useToday.js';
import { getCardStatus, getPrefs, saveRecall } from '../../services/store.js';
import { recallFor, recallNeeded, RECALL_PASS } from '../../lib/recall.js';
import { enVi } from '../../lib/vocab.js';
import { todayISO, dmy, weekdayName } from '../../lib/dates.js';
import { VocabState } from './VocabHome.jsx';
import Quiz from './modes/Quiz.jsx';
import './vocab.css';

/** Multiple-choice check on the cards the previous study day assigned; the score gates "Hoàn thành hôm nay". */
export default function Recall() {
  const today = useToday();
  const { data, error } = useVocab();
  const prefs = useStore(getPrefs);
  const status = useStore(getCardStatus);
  const toast = useToast();
  const navigate = useNavigate();
  const [round, setRound] = useState(0);
  const rc = recallFor(today);
  if (!rc) return <Navigate to="/today" replace />;
  if (!data) return <VocabState error={error} />;
  const items = rc.sets.flatMap(s => (data.setMap.get(s.id) || { items: [] }).items);
  const need = recallNeeded(items.length);
  const names = rc.sets.map(s => s.name).join(', ');

  const finish = S => {
    if (todayISO() !== today) { toast('Đã sang ngày mới nên kết quả này không được tính. Mở lại trang Hôm nay.'); return; }
    const right = new Set(S.right.map(it => it.key));
    try { saveRecall(today, { from: rc.from, right: right.size, total: items.length, wrong: items.filter(it => !right.has(it.key)).map(it => it.key) }); }
    catch (e) { toast(e.message); }
  };
  const result = S => {
    const right = new Set(S.right.map(it => it.key));
    const wrong = items.filter(it => !right.has(it.key));
    const ok = S.g >= need;
    return (
      <div className="sheet qcard result">
        <span className="sub">Kiểm tra bài cũ</span>
        <div className="big">{S.g}/{items.length}</div>
        <p className={'recall-verdict' + (ok ? ' ok' : '')}>{ok ? 'Đạt. Xong các việc còn lại là bạn hoàn thành được hôm nay.' : `Chưa đạt, cần đúng ít nhất ${need} câu. Ôn lại các từ sai rồi làm lại nhé.`}</p>
        <div className="qact" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          {wrong.length > 0 && (
            <button className={'btn' + (ok ? '' : ' primary')} type="button" onClick={() => navigate('/vocab/session', { state: { title: 'Ôn từ sai của bài cũ', keys: wrong.map(it => it.key), back: '/recall', backLabel: 'Kiểm tra bài cũ' } })}>Ôn {wrong.length} từ sai</button>
          )}
          <button className="btn" type="button" onClick={() => setRound(r => r + 1)}>Làm lại</button>
          <Link className={'btn' + (ok ? ' primary' : '')} to="/today">Về Hôm nay</Link>
        </div>
        {wrong.length > 0 && (
          <ul className="recall-wrong" style={{ maxWidth: 480 }} aria-label="Các từ trả lời sai">
            {wrong.map(it => { const [en, vi] = enVi(it); return <li key={it.key}><b>{en}</b><span>{vi}</span></li>; })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="wrap page">
      <Link className="backlink" to="/today"><Icon name="back" />Hôm nay</Link>
      <div className="study-head">
        <h1>Kiểm tra bài cũ</h1>
        <p className="sub">{names}, học {weekdayName(rc.from)} {dmy(rc.from)}. {items.length} câu trắc nghiệm, cần đúng {need} câu ({Math.round(RECALL_PASS * 100)}%). Câu sai sẽ chuyển sang Đang học.</p>
      </div>
      <Quiz key={round} items={items} pool={data.all} prefs={prefs} status={status} empty="Chưa tải được thẻ của bài cũ." onFinish={finish} renderFinish={result} />
    </div>
  );
}
