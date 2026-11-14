import { Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import SegBar from '../../components/SegBar.jsx';
import { useVocab } from '../../hooks/useVocab.js';
import { useStore } from '../../hooks/useStore.js';
import { getCardStatus } from '../../services/store.js';
import { counts, shuffle } from '../../lib/vocab.js';
import { VocabState } from './VocabHome.jsx';
import './vocab.css';

export default function Group() {
  const { gid } = useParams();
  const { data, error } = useVocab();
  const status = useStore(getCardStatus);
  const navigate = useNavigate();
  if (!data) return <VocabState error={error} />;
  const g = data.groups.get(gid);
  if (!g) return <Navigate to="/vocab" replace />;
  const c = counts(g.items, status);
  const back = '/vocab/g/' + g.id;
  const session = (title, items) => navigate('/vocab/session', { state: { title, keys: items.map(it => it.key), back, backLabel: g.name } });
  const subs = new Map();
  for (const s of g.sets) { const k = g.sub ? g.sub(s.title) : ''; if (!subs.has(k)) subs.set(k, []); subs.get(k).push(s); }
  return (
    <div className="wrap page">
      <Link className="backlink" to="/vocab"><Icon name="back" />Kho từ</Link>
      <div className="page-head">
        <h1>{g.name}</h1>
        <p className="sub">{g.sets.length} học phần, {g.items.length} thẻ. Đã thuộc {c[2]}, đang học {c[1]}.</p>
      </div>
      <div className="opts">
        <button className="btn primary" type="button" onClick={() => session(g.name + ': cả nhóm', g.items)}>Học cả nhóm</button>
        <button className="btn" type="button" disabled={!c[1]} onClick={() => session(g.name + ': thẻ đang học', shuffle(g.items.filter(x => status[x.key] === 1)))}>Ôn thẻ đang học ({c[1]})</button>
      </div>
      {[...subs].sort((a, b) => a[0].localeCompare(b[0], 'vi', { numeric: true })).map(([k, list]) => (
        <section key={k || 'all'} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {k && <h3 className="subhead">{k}</h3>}
          <div className="sheet sets">
            {list.map(s => {
              const sc = counts(s.items, status);
              return (
                <Link key={s.id} className="setrow" to={'/vocab/set/' + s.id}>
                  <b>{s.title}</b><SegBar c={sc} thin /><span className="n">{sc[2]}/{s.items.length}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
