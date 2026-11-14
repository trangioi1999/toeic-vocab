import Icon from './Icon.jsx';
import { monthGrid } from '../lib/dates.js';

const LABEL = { done: 'đã học', missed: 'bỏ buổi', rest: 'ngày nghỉ', pending: 'hôm nay, chưa xong', future: 'chưa tới', none: 'ngoài lộ trình' };

/** Month of bubbles: filled = studied, pink ring = missed, dotted = rest day. */
export default function MonthCalendar({ year, month0, statusOf, onPick, onPrev, onNext, canPrev, canNext, today }) {
  const grid = monthGrid(year, month0);
  return (
    <div className="mcal">
      <div className="mcal-head">
        <button type="button" className="icon-btn" aria-label="Tháng trước" disabled={!canPrev} onClick={onPrev}><Icon name="back" size={18} /></button>
        <h2>Tháng {month0 + 1}/{year}</h2>
        <button type="button" className="icon-btn" aria-label="Tháng sau" disabled={!canNext} onClick={onNext}><Icon name="next" size={18} /></button>
      </div>
      <div className="mcal-grid">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <span key={d} className="colh">{d}</span>)}
        {grid.flat().map((iso, i) => {
          if (!iso) return <span key={'x' + i} />;
          const s = statusOf(iso);
          const clickable = s !== 'future' && s !== 'none';
          const n = +iso.slice(8);
          return clickable
            ? <button key={iso} type="button" className={'mday ' + s + (iso === today ? ' today' : '')} aria-label={`Ngày ${n}: ${LABEL[s]}`} onClick={() => onPick(iso)}>{n}</button>
            : <span key={iso} className={'mday ' + s + (iso === today ? ' today' : '')} aria-label={`Ngày ${n}: ${LABEL[s]}`}>{n}</span>;
        })}
      </div>
      <div className="key mkey">
        <span><i className="kd done" />Đã học</span><span><i className="kd missed" />Bỏ buổi</span><span><i className="kd rest" />Ngày nghỉ</span>
      </div>
    </div>
  );
}
