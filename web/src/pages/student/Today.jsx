import { useState } from 'react';
import { Link } from 'react-router-dom';
import PlanTasks from '../../components/PlanTasks.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useStore } from '../../hooks/useStore.js';
import { useToday } from '../../hooks/useToday.js';
import { getPlanState, getCheckins, getActivity, setPlanTask, completeDay, undoCheckin } from '../../services/store.js';
import { dayOf, KIND, PLAN_START, PLAN_END } from '../../lib/plan.js';
import { canComplete, streak, dayStatus, tasksDone, isWorkDay, REQUIRED_CARDS } from '../../lib/progress.js';
import { todayISO, addDays, dmy, weekdayName, daysBetween, timeHM } from '../../lib/dates.js';
import './student.css';

const KVAR = { test: 'var(--primary)', fixr: 'var(--guide)', fixl: 'var(--learn)', review: 'var(--known)', off: 'var(--soft)' };
const SHORT = { 'Chủ nhật': 'CN', 'Thứ 2': 'T2', 'Thứ 3': 'T3', 'Thứ 4': 'T4', 'Thứ 5': 'T5', 'Thứ 6': 'T6', 'Thứ 7': 'T7' };

export default function Today() {
  const today = useToday();
  const plan = useStore(getPlanState);
  const checkins = useStore(getCheckins);
  const activity = useStore(getActivity);
  const toast = useToast();
  const [note, setNote] = useState('');
  const day = dayOf(today);
  const entry = plan[today] || {};
  const cards = (activity[today] || []).length;
  const check = checkins[today];
  const can = canComplete({ day, planEntry: entry, cardsToday: cards });
  const work = isWorkDay(day);
  const done = tasksDone(day, entry);
  const progress = check ? 1 : work ? done / day.tasks.length : Math.min(1, cards / REQUIRED_CARDS);
  const st = streak(checkins, today);
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  let tag, title;
  if (day) { tag = `${KIND[day.kind]}${day.kind !== 'off' ? ', khoảng ' + day.hours : ''}`; title = day.title; }
  else if (today < PLAN_START) { tag = 'Trước lộ trình'; title = `Còn ${daysBetween(today, PLAN_START)} ngày nữa là bắt đầu lộ trình`; }
  else { tag = 'Sau lộ trình'; title = today > PLAN_END ? 'Lộ trình đã xong. Ôn từ mỗi ngày để giữ phong độ.' : 'Ôn từ hôm nay'; }

  const finish = () => {
    const now = todayISO();
    if (now !== today) { window.dispatchEvent(new Event('focus')); toast('Đã sang ngày mới. Trang vừa được cập nhật, hãy kiểm tra lại rồi bấm Hoàn thành.'); return; }
    try { completeDay(now, { note }); setNote(''); toast('Đã hoàn thành hôm nay. Cô sẽ nhận được thông báo.'); }
    catch (e) { toast(e.message); }
  };

  return (
    <div className="wrap today-page">
      <div className="today-head" style={{ '--k': day ? KVAR[day.kind] : 'var(--primary)' }}>
        <span className="date">{weekdayName(today)}, {dmy(today)}</span>
        <span className="tag kind-tag">{tag}</span>
        <h1>{title}</h1>
      </div>

      <section className="streak" aria-label={`Chuỗi ${st} ngày học liên tiếp`}>
        <div className="n"><b className="num">{st}</b><span>ngày liên tiếp</span></div>
        <div className="week7">
          {last7.map(d => <span key={'l' + d} className={'l' + (d === today ? ' t' : '')}>{SHORT[weekdayName(d)]}</span>)}
          {last7.map(d => { const s = dayStatus(d, { checkins, today }); return <span key={d} className={'c ' + s} title={`${weekdayName(d)} ${dmy(d)}`} />; })}
        </div>
      </section>

      {day && day.kind !== 'off' && (
        <section className="sheet" style={{ padding: '16px 16px 4px' }}>
          <div className="section-head"><h2>Việc hôm nay</h2><span className="num" style={{ color: 'var(--soft)', fontWeight: 600 }}>{done}/{day.tasks.length}</span></div>
          <PlanTasks day={day} entry={entry} onToggle={(i, v) => { if (todayISO() === today) setPlanTask(today, i, v); else { window.dispatchEvent(new Event('focus')); toast('Đã sang ngày mới. Trang vừa được cập nhật.'); } }} readOnly={!!check} />
        </section>
      )}

      <section className="cards-today">
        <div className="section-head"><h2>Thẻ đã ôn hôm nay</h2><span className="num" style={{ fontWeight: 600 }}>{cards}<span style={{ color: 'var(--faint)' }}> / {REQUIRED_CARDS}</span></span></div>
        <div className="segs" role="img" aria-label={`Đã ôn ${cards} trên ${REQUIRED_CARDS} thẻ`}>
          {Array.from({ length: REQUIRED_CARDS }, (_, i) => <i key={i} className={i < cards ? 'on' : ''} />)}
        </div>
        <Link className="btn" style={{ alignSelf: 'flex-start' }} to="/vocab">{cards < REQUIRED_CARDS ? `Ôn tiếp ${REQUIRED_CARDS - cards} thẻ` : 'Ôn thêm thẻ'}</Link>
      </section>

      {!check && (
        <label className="field" style={{ font: '600 17px var(--display)' }}>Ghi chú gửi cô
          <textarea className="input" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Hôm nay mình sai nhiều ở phần nào, có gì muốn hỏi cô…" />
        </label>
      )}

      <section className="finish" aria-live="polite">
        <div className="ring" style={{ '--p': Math.round(progress * 100) + '%' }}>
          {check
            ? <span className="sealed">Đã xong hôm nay</span>
            : <button type="button" className={can.ok ? 'ready' : ''} disabled={!can.ok} onClick={finish}>Hoàn thành hôm nay</button>}
        </div>
        <div className="txt">
          {check ? (
            <>
              <b>Đã hoàn thành lúc {timeHM(check.at)}</b>
              <span>Cô sẽ nhận được thông báo kèm ghi chú của bạn.</span>
              {check.note && <span className="sent-note">“{check.note}”</span>}
              <button type="button" className="btn quiet" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => undoCheckin(today)}>Hoàn tác</button>
            </>
          ) : can.ok ? (
            <><b>Đủ rồi, tô ô này thôi</b><span>Bấm để báo cô là hôm nay bạn đã học xong.</span></>
          ) : (
            <><b>{can.reason}</b><span>Tô xong ô này, cô sẽ nhận được thông báo kèm ghi chú của bạn.</span></>
          )}
        </div>
      </section>
    </div>
  );
}
