import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MonthCalendar from '../../components/MonthCalendar.jsx';
import ScoreChart from '../../components/ScoreChart.jsx';
import { useStore } from '../../hooks/useStore.js';
import { getCheckins, getPlanState, getActivity, getCardStatus } from '../../services/store.js';
import { dayOf, DAYS, PLAN_START, PLAN_END, shortTest } from '../../lib/plan.js';
import { streak, dayStatus, planStats, isWorkDay, tasksDone, REQUIRED_CARDS } from '../../lib/progress.js';
import { todayISO, addDays, dmy, weekdayName, timeHM, dm } from '../../lib/dates.js';
import './teacher.css';

const monthKey = iso => +iso.slice(0, 4) * 12 + (+iso.slice(5, 7) - 1);

export default function Overview() {
  const today = todayISO();
  const checkins = useStore(getCheckins);
  const plan = useStore(getPlanState);
  const activity = useStore(getActivity);
  const status = useStore(getCardStatus);
  const navigate = useNavigate();
  const min = Math.min(monthKey(PLAN_START), monthKey(today)), max = Math.max(monthKey(PLAN_END), monthKey(today));
  const [m, setM] = useState(monthKey(today));
  const stats = useMemo(() => planStats(plan), [plan]);
  const statusOf = iso => dayStatus(iso, { checkins, today });

  const day = dayOf(today);
  const check = checkins[today];
  const cards = (activity[today] || []).length;
  const work = isWorkDay(day);
  const done = tasksDone(day, plan[today]);
  const frac = check ? 1 : work ? done / day.tasks.length : Math.min(1, cards / REQUIRED_CARDS);
  const st = streak(checkins, today);
  const past = DAYS.filter(d => d.date < today && isWorkDay(d));
  const pastDone = past.filter(d => checkins[d.date]).length;
  const known = Object.values(status).filter(v => v === 2).length;
  const pts = stats.points, last = pts[pts.length - 1], prev = pts[pts.length - 2];

  const feed = [];
  for (let d = check ? today : addDays(today, -1), i = 0; feed.length < 7 && i < 60; i++, d = addDays(d, -1)) {
    const s = statusOf(d);
    if (s === 'done' || s === 'missed') feed.push({ d, s });
    if (d < PLAN_START && !checkins[d] && i > 14) break;
  }

  return (
    <div className="wrap teacher-page">
      <div className="page-head" style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="sub">{weekdayName(today)}, {dmy(today)}</span>
        <h1>Chào bạn</h1>
      </div>
      <Link className="hero-status" to={'/teacher/day/' + today}>
        <span className="mini" style={{ '--p': Math.round(frac * 100) + '%' }}><span>{check ? '✓' : work ? `${done}/${day.tasks.length}` : `${cards}`}</span></span>
        <span className="tx">
          {check ? (
            <><b>Hôm nay học viên đã hoàn thành lúc {timeHM(check.at)}</b><span>{check.note ? `“${check.note}”` : `${day ? day.title + '. ' : ''}Đã ôn ${check.cards} thẻ.`}</span></>
          ) : (
            <><b>Hôm nay học viên chưa hoàn thành</b><span>{day && day.kind !== 'off' ? `${day.title}. ${work ? `Đã làm ${done}/${day.tasks.length} việc và ` : ''}` : ''}ôn {cards} thẻ.</span></>
          )}
        </span>
      </Link>
      <div className="stats4">
        <div><b>{st} ngày</b><span>học liên tiếp</span></div>
        <div><b>{past.length ? <>{pastDone}<small>/{past.length}</small></> : '–'}</b><span>{past.length ? 'buổi đã hoàn thành' : 'lộ trình chưa bắt đầu'}</span></div>
        <div><b>{last ? last.v : '–'}</b><span>{last ? `điểm đề gần nhất${prev ? (last.v >= prev.v ? `, tăng ${last.v - prev.v}` : `, giảm ${prev.v - last.v}`) : ''}` : 'chưa có điểm đề'}</span></div>
        <div><b>{known.toLocaleString('vi-VN')}</b><span>thẻ từ đã thuộc</span></div>
      </div>
      <div className="t-grid">
        <div className="t-col">
          <section className="sheet sheet-pad">
            <MonthCalendar year={Math.floor(m / 12)} month0={m % 12} today={today} statusOf={statusOf}
              onPick={iso => navigate('/teacher/day/' + iso)} canPrev={m > min} canNext={m < max} onPrev={() => setM(m - 1)} onNext={() => setM(m + 1)} />
            <p className="sub" style={{ fontSize: 12, marginTop: 6 }}>Bấm vào một ngày để xem chi tiết.</p>
          </section>
        </div>
        <div className="t-col">
          <section className="sheet sheet-pad">
            <div className="section-head"><h2>Điểm qua từng đề</h2><span style={{ fontSize: 12, color: 'var(--guide)' }}>Mục tiêu 700</span></div>
            {!pts.length && <p className="sub" style={{ fontSize: 13, marginTop: 6 }}>Chưa có điểm đề nào.</p>}
            <ScoreChart points={pts} />
          </section>
          <section className="feed">
            <h2>Gần đây</h2>
            {!feed.length && <p className="empty" style={{ padding: 20 }}>Chưa có ngày học nào được ghi lại. Khi học viên bấm Hoàn thành, ngày đó sẽ hiện ở đây.</p>}
            {feed.map(({ d, s }) => {
              const c = checkins[d], dd = dayOf(d), p = plan[d] || {};
              const sum = dd && dd.kind === 'test' && +p.l > 0 && +p.r > 0 ? +p.l + +p.r : null;
              return (
                <Link key={d} to={'/teacher/day/' + d}>
                  <span className={'bubble' + (s === 'done' ? ' filled' : '')} style={{ marginTop: 2 }} aria-hidden="true" />
                  <span className="tx">
                    <b>{weekdayName(d)}, {dm(d)}, {s === 'done' ? `xong lúc ${timeHM(c.at)}` : 'bỏ buổi'}</b>
                    <span>{s === 'done'
                      ? (c.note ? `“${c.note}”` : sum ? `Đề ${shortTest(dd.test)} được ${sum} điểm: Nghe ${p.l}, Đọc ${p.r}.` : `${c.planTitle || 'Ôn từ vựng'}. Ôn ${c.cards} thẻ.`)
                      : `Chưa ${dd ? dd.title.charAt(0).toLowerCase() + dd.title.slice(1) : 'học'}.`}</span>
                  </span>
                </Link>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}
