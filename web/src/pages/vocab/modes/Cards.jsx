import { useEffect, useRef, useState } from 'react';
import Icon from '../../../components/Icon.jsx';
import { useToast } from '../../../components/Toast.jsx';
import { useSpeech } from '../../../hooks/useSpeech.js';
import { setCardStatus } from '../../../services/store.js';
import { enVi, ipaOf } from '../../../lib/vocab.js';
import { frontOf, backOf, lg, ST_LABEL, ST_CLS } from './shared.js';

function Face({ side, it, prefs, st, say, sayBoth }) {
  const f = frontOf(it, prefs), b = backOf(it, prefs), ipa = ipaOf(it);
  const s = side === 'front' ? f : b;
  const [en, vi] = enVi(it);
  const stop = fn => e => { e.stopPropagation(); fn(); };
  return (
    <div className={'face ' + side} aria-hidden={side === 'back' ? undefined : undefined}>
      <div className="face-top">
        <span className={'status-tag ' + ST_CLS[st]}><i className={'dot ' + ST_CLS[st]} />{ST_LABEL[st]}</span>
        <span className="lang">{s.lang === 'en' ? 'EN' : 'VI'}</span>
      </div>
      <div className="fc">
        <div className={(s.lang === 'en' ? 'word' : 'mean') + lg(s.t)}>{s.t || '—'}</div>
        {s.lang === 'en' && ipa && <div className="ipa">{ipa}</div>}
        {side === 'back' && <div className="small-term">{f.t}{f.lang === 'en' && ipa ? <> <span className="ipa sm">{ipa}</span></> : null}</div>}
        <div className="say">
          {side === 'front'
            ? <button className="sbtn" type="button" data-say onClick={stop(() => say(s.t, s.lang))}><Icon name="speaker" size={16} />{s.lang === 'en' ? 'Nghe' : 'Đọc'}</button>
            : <>
              <button className="sbtn" type="button" data-say onClick={stop(() => say(en, 'en'))}><Icon name="speaker" size={16} />Tiếng Anh</button>
              <button className="sbtn" type="button" data-say onClick={stop(() => say(vi, 'vi'))}><Icon name="speaker" size={16} />Tiếng Việt</button>
              <button className="sbtn" type="button" data-say onClick={stop(() => sayBoth(it))}><Icon name="speaker" size={16} />Cả hai</button>
            </>}
        </div>
      </div>
      {side === 'front' && <span className="hint">Chạm để lật, vuốt sang để qua thẻ</span>}
    </div>
  );
}

export default function Cards({ items, prefs, status, pos, setPos, empty }) {
  const [flip, setFlip] = useState(false);
  const toast = useToast();
  const { say, sayBoth } = useSpeech();
  const ref = useRef();
  const drag = useRef({ on: false, moved: false, sx: 0, sy: 0, dx: 0 });
  const n = items.length;
  const p = Math.min(pos, Math.max(0, n - 1));
  const it = items[p];

  const go = d => { const np = Math.max(0, Math.min(n - 1, p + d)); if (np !== p) { setPos(np); setFlip(false); } };
  const doFlip = () => setFlip(f => !f);
  const mark = v => {
    setCardStatus(it.key, v);
    if (p < n - 1) go(1); else toast(`Đã xem hết ${n} thẻ`);
  };

  // auto-read the visible side
  useEffect(() => {
    if (!it || !prefs.auto) return;
    const s = flip ? backOf(it, prefs) : frontOf(it, prefs);
    say(s.t, s.lang);
  }, [p, flip, it && it.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = e => {
      if (!it || /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName)) return;
      if (e.key === ' ') { e.preventDefault(); doFlip(); }
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === '0') mark(0);
      else if (e.key === '1') mark(1);
      else if (e.key === '2') mark(2);
      else if (e.key === 's' || e.key === 'S') say(enVi(it)[0], 'en');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (!n) return <p className="empty">{empty}</p>;
  const st = status[it.key] || 0;

  const onDown = e => { if (e.target.closest('[data-say]')) return; drag.current = { on: true, moved: false, sx: e.clientX, sy: e.clientY, dx: 0 }; };
  const onMove = e => {
    const d = drag.current; if (!d.on) return;
    d.dx = e.clientX - d.sx; const dy = e.clientY - d.sy;
    if (Math.abs(d.dx) > 10 && Math.abs(d.dx) > Math.abs(dy)) { d.moved = true; ref.current.style.translate = d.dx * 0.6 + 'px 0'; }
  };
  const onUp = () => { const d = drag.current; if (!d.on) return; d.on = false; ref.current.style.translate = ''; if (d.moved && Math.abs(d.dx) > 60) go(d.dx < 0 ? 1 : -1); };
  const onClick = () => { if (drag.current.moved) { drag.current.moved = false; return; } doFlip(); };

  return (
    <>
      <div className="progress-row"><div className="bar"><i style={{ width: ((p + 1) / n) * 100 + '%' }} /></div><span>{p + 1} / {n}</span></div>
      <div className="stage">
        <div ref={ref} className={'flip' + (flip ? ' on' : '')} role="button" tabIndex={0} aria-label={flip ? 'Lật về mặt trước' : 'Lật thẻ'}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current.on = false; ref.current.style.translate = ''; }}
          onClick={onClick} onKeyDown={e => { if (e.key === 'Enter') doFlip(); }}>
          <Face side="front" it={it} prefs={prefs} st={st} say={say} sayBoth={sayBoth} />
          <Face side="back" it={it} prefs={prefs} st={st} say={say} sayBoth={sayBoth} />
        </div>
      </div>
      <p className="sub" style={{ textAlign: 'center' }}>Bạn nhớ từ này đến đâu?</p>
      <div className="marks">
        <button className="icon-btn" type="button" aria-label="Thẻ trước" disabled={!p} onClick={() => go(-1)}><Icon name="back" /></button>
        <button className="mark n" type="button" aria-pressed={st === 0} onClick={() => mark(0)}><i className="ring" />Chưa học</button>
        <button className="mark l" type="button" aria-pressed={st === 1} onClick={() => mark(1)}><i className="dot l" />Đang học</button>
        <button className="mark k" type="button" aria-pressed={st === 2} onClick={() => mark(2)}><i className="dot k" />Đã thuộc</button>
        <button className="icon-btn" type="button" aria-label="Thẻ sau" disabled={p >= n - 1} onClick={() => go(1)}><Icon name="next" /></button>
      </div>
      <p className="keys"><kbd>Space</kbd> lật thẻ, <kbd>←</kbd> <kbd>→</kbd> chuyển thẻ, <kbd>0</kbd> <kbd>1</kbd> <kbd>2</kbd> chưa học, đang học, đã thuộc, <kbd>S</kbd> nghe</p>
    </>
  );
}
