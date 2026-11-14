import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../../components/Icon.jsx';
import { useSpeech } from '../../../hooks/useSpeech.js';
import { setCardStatus } from '../../../services/store.js';
import { ipaOf, shuffle } from '../../../lib/vocab.js';
import { frontOf, backOf, lg } from './shared.js';
import Finish from './Finish.jsx';

const newSession = items => ({ o: shuffle([...items]), i: 0, g: 0, r: 0, right: [] });

export default function Quiz({ items, pool, prefs, status, empty }) {
  const [S, setS] = useState(() => newSession(items));
  const [picked, setPicked] = useState(null);
  const { say } = useSpeech();
  const nextRef = useRef();
  const it = S.o[S.i];
  const opts = useMemo(() => {
    if (!it) return [];
    const ans = backOf(it, prefs).t, src = pool.length >= 8 ? pool : items, seen = new Set([ans]), w = [];
    for (let t = 0; t < 300 && w.length < 3; t++) { const x = backOf(src[Math.random() * src.length | 0], prefs).t; if (x && !seen.has(x)) { seen.add(x); w.push(x); } }
    return shuffle([ans, ...w]);
  }, [S.i, S.o]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (it && prefs.auto) { const f = frontOf(it, prefs); say(f.t, f.lang); } }, [S.i]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (picked !== null && nextRef.current) nextRef.current.focus(); }, [picked]);

  if (!S.o.length) return <p className="empty">{empty}</p>;
  if (S.i >= S.o.length) return <Finish S={S} again={() => { setS(newSession(items)); setPicked(null); }} />;
  const f = frontOf(it, prefs), ans = backOf(it, prefs).t, ipa = ipaOf(it);
  const choose = j => {
    if (picked !== null) return;
    setPicked(j);
    const ok = opts[j] === ans;
    setS(s => ok ? { ...s, g: s.g + 1, right: [...s.right, it] } : { ...s, r: s.r + 1 });
    if (!ok && (status[it.key] || 0) !== 1) setCardStatus(it.key, 1);
  };
  return (
    <div className="sheet qcard">
      <div className="qtop"><span>Câu {S.i + 1} / {S.o.length}</span><span><span className="g">Đúng {S.g}</span>, <span className="r">sai {S.r}</span></span></div>
      <div className="qprompt">
        <div className={(f.lang === 'en' ? 'word' : 'mean') + lg(f.t)}>{f.t}</div>
        {f.lang === 'en' && ipa && <div className="ipa">{ipa}</div>}
        <button className="sbtn" type="button" onClick={() => say(f.t, f.lang)}><Icon name="speaker" size={16} />Nghe</button>
      </div>
      <div className="answers">
        {opts.map((o, j) => {
          const cls = picked === null ? '' : o === ans ? ' right' : j === picked ? ' wrong' : '';
          return <button key={j} className={'ans' + cls} type="button" disabled={picked !== null} onClick={() => choose(j)}><span className="k">{'ABCD'[j]}</span><span>{o}</span></button>;
        })}
      </div>
      {picked !== null && (
        <div className="qact"><button ref={nextRef} className="btn primary" type="button" onClick={() => { setS(s => ({ ...s, i: s.i + 1 })); setPicked(null); }}>Câu tiếp</button></div>
      )}
    </div>
  );
}
