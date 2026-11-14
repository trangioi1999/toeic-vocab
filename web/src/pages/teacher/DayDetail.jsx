import { Link, Navigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import PlanTasks from '../../components/PlanTasks.jsx';
import PartBars, { worstPart } from '../../components/PartBars.jsx';
import { useStore } from '../../hooks/useStore.js';
import { useToday } from '../../hooks/useToday.js';
import { getCheckins, getPlanState, getActivity } from '../../services/store.js';
import { dayOf, KIND, shortTest } from '../../lib/plan.js';
import { dayStatus, tasksDone } from '../../lib/progress.js';
import { todayISO, dmy, weekdayName, timeHM } from '../../lib/dates.js';
import './teacher.css';

const STATUS = { done: 'Đã hoàn thành', missed: 'Bỏ buổi', rest: 'Ngày nghỉ, không bắt buộc', pending: 'Chưa hoàn thành', future: 'Chưa tới ngày', none: 'Ngoài lộ trình' };

export default function DayDetail() {
  const { date } = useParams();
  const checkins = useStore(getCheckins);
  const plan = useStore(getPlanState);
  const activity = useStore(getActivity);
  const today = useToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return <Navigate to="/teacher" replace />;
  const day = dayOf(date), c = checkins[date], p = plan[date] || {};
  const s = dayStatus(date, { checkins, today });
  const cards = c ? c.cards : (activity[date] || []).length;
  const sum = +p.l > 0 && +p.r > 0 ? +p.l + +p.r : null;
  const worst = day && day.kind === 'test' ? worstPart(p.parts) : null;
  return (
    <div className="wrap teacher-page" style={{ maxWidth: 680 }}>
      <Link className="backlink" to="/teacher"><Icon name="back" />Tổng quan</Link>
      <div className="day-hero">
        <span className={'seal' + (s === 'done' ? '' : s === 'missed' ? ' missed' : ' open')} aria-hidden="true">{s === 'done' && <Icon name="check" size={24} strokeWidth={2.5} />}</span>
        <div className="tx">
          <span className="when">{weekdayName(date)}, {dmy(date)}</span>
          <h1 style={{ fontSize: 24 }}>{day ? (day.kind === 'test' ? 'Làm đề ' + shortTest(day.test) : day.title) : 'Ôn từ vựng'}</h1>
          <span className={'st ' + s}>{s === 'done' ? `Hoàn thành lúc ${timeHM(c.at)}` : STATUS[s]}{day && day.kind !== 'off' ? `. ${KIND[day.kind]}` : ''}</span>
        </div>
      </div>
      {c && c.note && <blockquote className="sheet sheet-pad quote"><b>Học viên ghi chú</b><span>{c.note}</span></blockquote>}
      {day && day.kind === 'test' && (sum || p.parts) && (
        <section className="sheet sheet-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sum && <div className="bigscore"><div><span className="t">{sum}</span><span>tổng điểm</span></div><div><span className="s">{p.l}</span><span>Nghe</span></div><div><span className="s">{p.r}</span><span>Đọc</span></div></div>}
          <PartBars parts={p.parts} />
          {worst && <p style={{ fontSize: 14, color: 'var(--guide-strong)' }}>Part {worst.n} đúng thấp nhất: {worst.c}/{worst.t} câu.</p>}
        </section>
      )}
      {day && day.kind !== 'off' && (
        <section className="sheet" style={{ padding: '14px 16px 4px' }}>
          <div className="section-head"><h2>Việc trong lộ trình</h2><span className="num" style={{ fontWeight: 600, color: tasksDone(day, p) === day.tasks.length ? 'var(--known)' : 'var(--soft)' }}>{tasksDone(day, p)}/{day.tasks.length}</span></div>
          <PlanTasks day={day} entry={p} readOnly noLinks />
        </section>
      )}
      <div className="sheet kv"><span>Thẻ đã ôn trong ngày</span><b>{cards}</b></div>
    </div>
  );
}
