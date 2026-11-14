import { useEffect, useRef, useState } from 'react';
import { useSpeech } from '../../../hooks/useSpeech.js';
import { setCardStatus } from '../../../services/store.js';
import { enVi, ipaOf, norm, shuffle } from '../../../lib/vocab.js';
import Finish from './Finish.jsx';

const newSession = items => ({ o: shuffle([...items]), i: 0, g: 0, r: 0, right: [] });

export default function Write({ items, prefs, status, empty }) {
  const [S, setS] = useState(() => newSession(items));
  const [value, setValue] = useState('');
  const [result, setResult] = useState(null); // null | 'ok' | 'bad'
  const { say } = useSpeech();
  const inputRef = useRef(), nextRef = useRef();
  useEffect(() => { if (result === null && inputRef.current) inputRef.current.focus(); else if (nextRef.current) nextRef.current.focus(); }, [S.i, result]);

  if (!S.o.length) return <p className="empty">{empty}</p>;
  if (S.i >= S.o.length) return <Finish S={S} again={() => { setS(newSession(items)); setResult(null); setValue(''); }} />;
  const it = S.o[S.i], [en, vi] = enVi(it), askVi = prefs.front !== 'vi', prompt = askVi ? vi : en, target = askVi ? en : vi, ipa = ipaOf(it);
  const check = give => {
    if (result !== null) { setS(s => ({ ...s, i: s.i + 1 })); setResult(null); setValue(''); return; }
    const ok = !give && !!norm(value) && norm(value) === norm(target);
    setResult(ok ? 'ok' : 'bad');
    setS(s => ok ? { ...s, g: s.g + 1, right: [...s.right, it] } : { ...s, r: s.r + 1 });
    if (!ok && (status[it.key] || 0) !== 1) setCardStatus(it.key, 1);
    say(en, 'en');
  };
  return (
    <div className="sheet qcard">
      <div className="qtop"><span>Câu {S.i + 1} / {S.o.length}</span><span><span className="g">Đúng {S.g}</span>, <span className="r">sai {S.r}</span></span></div>
      <div className="qprompt"><div className={askVi ? 'mean' : 'word'}>{prompt}</div></div>
      <form onSubmit={e => { e.preventDefault(); check(false); }}>
        <input ref={inputRef} className="input winput" type="text" autoComplete="off" autoCapitalize="off" spellCheck="false" value={value} disabled={result !== null}
          onChange={e => setValue(e.target.value)} placeholder={askVi ? 'Gõ từ tiếng Anh' : 'Gõ nghĩa tiếng Việt'} aria-label="Câu trả lời" />
      </form>
      {result === 'ok' && <div className="fb ok" role="status">Chính xác. {ipa && <span className="ipa sm">{ipa}</span>}</div>}
      {result === 'bad' && <div className="fb bad" role="status">Đáp án: <b>{target}</b> {ipa && <span className="ipa sm">{ipa}</span>}</div>}
      <div className="qact">
        {result === null && <button className="btn quiet" type="button" onClick={() => check(true)}>Không biết</button>}
        <button ref={nextRef} className="btn primary" type="button" onClick={() => check(false)}>{result === null ? 'Kiểm tra' : 'Câu tiếp'}</button>
      </div>
    </div>
  );
}
