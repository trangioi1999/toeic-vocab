import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { useStore } from '../../hooks/useStore.js';
import { useToast } from '../../components/Toast.jsx';
import { getCardStatus, getPrefs, setPrefs } from '../../services/store.js';
import { counts, shuffle } from '../../lib/vocab.js';
import VoicePanel from './VoicePanel.jsx';
import Cards from './modes/Cards.jsx';
import Quiz from './modes/Quiz.jsx';
import Write from './modes/Write.jsx';
import List from './modes/List.jsx';
import './vocab.css';

const MODES = [['cards', 'Thẻ ghi nhớ'], ['quiz', 'Trắc nghiệm'], ['write', 'Gõ từ'], ['list', 'Danh sách']];
const FILTERS = [['all', 'Tất cả'], ['new', 'Chưa học'], ['learn', 'Đang học'], ['known', 'Đã thuộc']];
const WANT = { new: 0, learn: 1, known: 2 };

/** Shared study screen for a set, a group session or search results. */
export default function StudyView({ title, sub, items, back, backLabel, pool, initialMode = 'cards', emptyText }) {
  const status = useStore(getCardStatus);
  const prefs = useStore(getPrefs);
  const toast = useToast();
  const [mode, setMode] = useState(initialMode);
  const [filter, setFilter] = useState('all');
  const [order, setOrder] = useState(() => items.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [round, setRound] = useState(0);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const c = counts(items, status);

  const applyFilter = (f, sh) => {
    let o = items.map((_, i) => i);
    if (f !== 'all') o = o.filter(i => (status[items[i].key] || 0) === WANT[f]);
    if (sh) shuffle(o);
    setOrder(o); setPos(0); setRound(r => r + 1);
  };
  const view = useMemo(() => order.map(i => items[i]), [order, items]);
  const n = { all: items.length, new: c[0], learn: c[1], known: c[2] };
  const props = { items: view, pool: pool || items, prefs, empty: emptyText || 'Không có thẻ nào trong mục này.' };

  return (
    <div className="wrap page">
      {back && <Link className="backlink" to={back}><Icon name="back" />{backLabel}</Link>}
      <div className="study-head">
        <h1>{title}</h1>
        <p className="sub">{sub || `${items.length} thẻ`}</p>
      </div>
      <div className="scroll-row" role="tablist" aria-label="Cách học">
        {MODES.map(([m, l]) => (
          <button key={m} className="chip" role="tab" type="button" aria-selected={mode === m} onClick={() => { setMode(m); setRound(r => r + 1); }}>{l}</button>
        ))}
      </div>
      <div className="scroll-row" role="group" aria-label="Lọc theo trạng thái">
        {FILTERS.map(([f, l]) => (
          <button key={f} className="chip" type="button" aria-pressed={filter === f} onClick={() => { setFilter(f); applyFilter(f, false); }}>{l} <span className="c">{n[f]}</span></button>
        ))}
      </div>
      <div className="scroll-row">
        <button className="opt" type="button" aria-pressed={prefs.front === 'vi'} onClick={() => { setPrefs({ front: prefs.front === 'en' ? 'vi' : 'en' }); setRound(r => r + 1); }}>
          <Icon name="swap" size={15} />{prefs.front === 'vi' ? 'Mặt trước: Việt' : 'Mặt trước: Anh'}
        </button>
        <button className="opt" type="button" aria-pressed={!!prefs.auto} onClick={() => setPrefs({ auto: !prefs.auto })}><Icon name="autoplay" size={15} />Tự đọc</button>
        <button className="opt" type="button" onClick={() => { applyFilter(filter, true); toast('Đã trộn thứ tự thẻ'); }}><Icon name="shuffle" size={15} />Trộn</button>
        <button className="opt" type="button" aria-expanded={voiceOpen} onClick={() => setVoiceOpen(o => !o)}><Icon name="sliders" size={15} />Giọng đọc</button>
      </div>
      {voiceOpen && <VoicePanel prefs={prefs} />}
      {mode === 'cards' && <Cards key={'c' + round} {...props} pos={pos} setPos={setPos} status={status} />}
      {mode === 'quiz' && <Quiz key={'q' + round} {...props} status={status} />}
      {mode === 'write' && <Write key={'w' + round} {...props} status={status} />}
      {mode === 'list' && <List {...props} status={status} showFrom={new Set(items.map(i => i.sid)).size > 1} />}
    </div>
  );
}
