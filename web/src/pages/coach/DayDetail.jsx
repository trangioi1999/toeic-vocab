import { Link, Navigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import PlanTasks from '../../components/PlanTasks.jsx';
import PartBars, { worstPart } from '../../components/PartBars.jsx';
import { useStore } from '../../hooks/useStore.js';
import { useVocab } from '../../hooks/useVocab.js';
import { useToday } from '../../hooks/useToday.js';
import { getCheckins, getPlanState, getActivity } from '../../services/store.js';
import { dayOf, KIND, shortTest } from '../../lib/plan.js';
import { dayStatus, dayProgress } from '../../lib/progress.js';
import { recallFor, recallPassed } from '../../lib/recall.js';
import { enVi } from '../../lib/vocab.js';
import { todayISO, dmy, weekdayName, timeHM } from '../../lib/dates.js';
import './coach.css';

/** Score of the check on the previous study day's cards, and the words the learner got wrong. */
function RecallBox({ due, rec }) {
  const { data } = useVocab();
  const wrong = (rec && rec.wrong) || [];
  return (
    <section className="sheet sheet-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="section-head">
        <h2>Kiểm tra bài cũ</h2>
        <span className="num" style={{ fontWeight: 600, color: recallPassed(rec) ? 'var(--known)' : 'var(--guide-strong)' }}>{rec ? `${rec.right}/${rec.total}` : 'Chưa làm'}</span>
      </div>
      <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0 }}>
        {due.sets.map(x => x.name).join(', ')} của {weekdayName(due.from)} {dmy(due.from)}.{rec ? ` ${recallPassed(rec) ? 'Đạt' : 'Chưa đạt'}, làm ${rec.tries || 1} lần, giữ lần cao nhất.` : ''}
      </p>
      {wrong.length > 0 && (
        <ul className="recall-wrong" aria-label="Từ trả lời sai">
          {wrong.map(k => { const it = data && data.itemMap.get(k); if (!it) return null; const [en, vi] = enVi(it); return <li key={k}><b>{en}</b><span>{vi}</span></li>; })}
        </ul>
      )}
    </section>
  );
}

const STATUS = { done: 'Đã hoàn thành', missed: 'Bỏ buổi', rest: 'Ngày nghỉ, không bắt buộc', pending: 'Chưa hoàn thành', future: 'Chưa tới ngày', none: 'Ngoài lộ trình' };

export default function DayDetail() {
  const { date } = useParams();
  const checkins = useStore(getCheckins);
  const plan = useStore(getPlanState);
  const activity = useStore(getActivity);
  const today = useToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return <Navigate to="/coach" replace />;
  const day = dayOf(date), c = checkins[date], p = plan[date] || {};
  const prog = dayProgress(day, p);
  const s = dayStatus(date, { checkins, today });
  const cards = c ? c.cards : (activity[date] || []).length;
  const sum = +p.l > 0 && +p.r > 0 ? +p.l + +p.r : null;
  const worst = day && day.kind === 'test' ? worstPart(p.parts) : null;
  return (
    <div className="wrap coach-page" style={{ maxWidth: 680 }}>
      <Link className="backlink" to="/coach"><Icon name="back" />Tổng quan</Link>
      <div className="day-hero">
        <span className={'seal' + (s === 'done' ? '' : s === 'missed' ? ' missed' : ' open')} aria-hidden="true">{s === 'done' && <Icon name="check" size={24} strokeWidth={2.5} />}</span>
        <div className="tx">
          <span className="when">{weekdayName(date)}, {dmy(date)}</span>
          <h1 style={{ fontSize: 24 }}>{day ? (day.kind === 'test' ? 'Làm đề ' + shortTest(day.test) : day.title) : 'Ôn từ vựng'}</h1>
          <span className={'st ' + s}>{s === 'done' ? `Hoàn thành lúc ${timeHM(c.at)}` : STATUS[s]}{day && day.kind !== 'off' ? `. ${KIND[day.kind]}` : ''}</span>
        </div>
      </div>
      {c && c.note && <blockquote className="sheet sheet-pad quote"><b>Người học ghi chú</b><span>{c.note}</span></blockquote>}
      {day && day.kind === 'test' && (sum || p.parts) && (
        <section className="sheet sheet-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sum && <div className="bigscore"><div><span className="t">{sum}</span><span>tổng điểm</span></div><div><span className="s">{p.l}</span><span>Nghe</span></div><div><span className="s">{p.r}</span><span>Đọc</span></div></div>}
          <PartBars parts={p.parts} />
          {worst && <p style={{ fontSize: 14, color: 'var(--guide-strong)' }}>Part {worst.n} đúng thấp nhất: {worst.c}/{worst.t} câu.</p>}
        </section>
      )}
      {recallFor(date) && (p.recall || date <= today) && <RecallBox due={recallFor(date)} rec={p.recall} />}
      {day && day.kind !== 'off' && (
        <section className="sheet" style={{ padding: '14px 16px 4px' }}>
          <div className="section-head"><h2>Việc trong lộ trình</h2><span className="num" style={{ fontWeight: 600, color: prog.done === prog.total ? 'var(--known)' : 'var(--soft)' }}>{prog.done}/{prog.total}</span></div>
          <PlanTasks day={day} entry={p} readOnly noLinks />
        </section>
      )}
      <div className="sheet kv"><span>Thẻ đã ôn trong ngày</span><b>{cards}</b></div>
    </div>
  );
}
