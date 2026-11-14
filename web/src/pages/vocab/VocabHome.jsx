import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import SegBar from '../../components/SegBar.jsx';
import { useVocab } from '../../hooks/useVocab.js';
import { useStore } from '../../hooks/useStore.js';
import { getCardStatus } from '../../services/store.js';
import { counts, shuffle } from '../../lib/vocab.js';
import './vocab.css';

const fmt = n => n.toLocaleString('vi-VN');

export function SearchBar({ initial = '' }) {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();
  return (
    <form className="searchbar" role="search" onSubmit={e => { e.preventDefault(); if (q.trim()) navigate('/vocab/search?q=' + encodeURIComponent(q.trim())); }}>
      <Icon name="search" size={18} />
      <input className="input" type="search" enterKeyHint="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt" aria-label="Tìm từ" />
    </form>
  );
}

export function VocabState({ error }) {
  return <div className="wrap page"><p className="empty">{error ? 'Không tải được dữ liệu từ vựng. Kiểm tra mạng rồi tải lại trang.' : 'Đang tải kho từ…'}</p></div>;
}

export default function VocabHome() {
  const { data, error } = useVocab();
  const status = useStore(getCardStatus);
  const navigate = useNavigate();
  if (!data) return <VocabState error={error} />;
  const c = counts(data.all, status);
  const learning = data.all.filter(it => status[it.key] === 1);
  const fresh = data.all.filter(it => !status[it.key]);
  const session = (title, items) => navigate('/vocab/session', { state: { title, keys: items.map(it => it.key), back: '/vocab', backLabel: 'Kho từ' } });
  return (
    <div className="wrap page">
      <div className="page-head">
        <h1>Kho từ</h1>
        <p className="sub">{data.groups.size} nhóm, {data.sets.length} học phần, {fmt(data.all.length)} thẻ của lớp TOEIC Online</p>
      </div>
      <SearchBar />
      <section className="sheet sheet-pad summary">
        <div>
          <div className="big">{fmt(c[2])}<small>thẻ đã thuộc trên {fmt(data.all.length)}</small></div>
          <div style={{ marginTop: 14 }}><SegBar c={c} /></div>
          <div className="legend">
            <span><i className="dot k" />Đã thuộc <b>{fmt(c[2])}</b></span>
            <span><i className="dot l" />Đang học <b>{fmt(c[1])}</b></span>
            <span><i className="dot" />Chưa học <b>{fmt(c[0])}</b></span>
          </div>
        </div>
        <div className="acts">
          <button className="btn primary" type="button" disabled={!learning.length} onClick={() => session('Ôn thẻ đang học', shuffle([...learning]).slice(0, 30))}>
            Ôn {Math.min(30, learning.length)} thẻ đang học
          </button>
          <button className="btn" type="button" disabled={!fresh.length} onClick={() => session('Học 20 thẻ mới', shuffle([...fresh]).slice(0, 20))}>Học 20 thẻ mới</button>
        </div>
      </section>
      <h2>Nhóm học phần</h2>
      <div className="groups">
        {[...data.groups.values()].map(g => {
          const gc = counts(g.items, status);
          return (
            <Link key={g.id} className="tile" to={'/vocab/g/' + g.id}>
              <div><div className="name">{g.name}</div><div className="desc">{g.desc}</div></div>
              <SegBar c={gc} thin />
              <div className="meta"><span>{g.sets.length} học phần, {fmt(g.items.length)} thẻ</span><b>{Math.round((gc[2] / g.items.length) * 100)}%</b></div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
