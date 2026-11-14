import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import ScoreChart from '../../components/ScoreChart.jsx';
import PlanTasks from '../../components/PlanTasks.jsx';
import PartBars, { worstPart } from '../../components/PartBars.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useStore } from '../../hooks/useStore.js';
import { getPlanState, setPlanEntry, setPlanTask, replacePlanState } from '../../services/store.js';
import { DAYS, KIND, DOW, weeks, weekName, weekIndexOf, currentWeekIndex, testDay, shortTest, PLAN_START } from '../../lib/plan.js';
import { planStats, isWorkDay } from '../../lib/progress.js';
import { todayISO, dm, daysBetween } from '../../lib/dates.js';
import { decodeS4, mergeStudy4, bookmarkletHref, bookmarkletCode } from '../../lib/study4.js';
import './plan.css';

export const APP_URL = 'https://trangioi1999.github.io/toeic-vocab/app/';
const COLS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function cellState(d, s, today) {
  if (s.done) return 'done';
  if (d.date === today) return 'today';
  if (d.date < today && isWorkDay(d)) return 'missed';
  return '';
}

function DayCard({ d, s, today, open, onToggle }) {
  const isTest = d.kind === 'test';
  const sum = +s.l > 0 && +s.r > 0 ? +s.l + +s.r : null;
  const src = d.tid ? testDay(d.tid) : null;
  const parts = src ? (getPlanState()[src.date] || {}).parts : null;
  const want = d.kind === 'fixr' ? [5, 6, 7] : d.kind === 'fixl' ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6, 7];
  const worst = d.kind !== 'test' ? worstPart(parts, want) : null;
  const done = d.tasks.filter((_, i) => (s.tasks ? s.tasks[i] : s.done)).length;
  const score = (k, v) => setPlanEntry(d.date, { [k]: v.replace(/\D/g, '').slice(0, 3) });
  return (
    <article id={'d-' + d.date} className={`day k-${d.kind}${s.done ? ' done' : ''}${d.date === today ? ' is-today' : ''}`}>
      <button type="button" className="day-row" aria-expanded={open} onClick={onToggle}>
        <span className="b" aria-hidden="true" />
        <span className="tt">
          <b>{d.title}</b>
          <span>{d.date === today ? 'Hôm nay' : DOW[d.dow]}, {dm(d.date)}{d.kind !== 'off' ? `. ${KIND[d.kind]}, ${d.hours}` : ''}{!s.done && done && d.kind !== 'off' ? `. Đã làm ${done}/${d.tasks.length}` : ''}</span>
        </span>
        {sum ? <span className="right">{sum}</span> : s.done ? <span className="right ok">Xong</span> : null}
        <Icon name="next" size={18} />
      </button>
      {open && (
        <div className="day-body">
          <PlanTasks day={d} entry={s} onToggle={(i, v) => setPlanTask(d.date, i, v)} />
          {d.kind !== 'off' && (
            <div className="day-meta">
              <button type="button" className="btn quiet" onClick={() => setPlanEntry(d.date, { done: !s.done })}>
                {s.done ? 'Bỏ đánh dấu xong' : 'Đánh dấu xong cả ngày'}
              </button>
            </div>
          )}
          {isTest && (
            <div className="scores">
              <label>Nghe<input inputMode="numeric" maxLength={3} placeholder="—" value={s.l || ''} onChange={e => score('l', e.target.value)} aria-label={'Điểm Nghe ' + dm(d.date)} /></label>
              <label>Đọc<input inputMode="numeric" maxLength={3} placeholder="—" value={s.r || ''} onChange={e => score('r', e.target.value)} aria-label={'Điểm Đọc ' + dm(d.date)} /></label>
              {sum && <span className="sum">= {sum}</span>}
            </div>
          )}
          {d.tid && <PartBars parts={parts} want={want} markWorst={d.kind !== 'test'} />}
          {worst && <p className="hint-p">Ưu tiên Part {worst.n}: mới đúng {Math.round(worst.pc * 100)}%.</p>}
          {d.tid && !parts && d.kind !== 'test' && <p className="hint-p">Chưa có điểm từng Part của đề này. Đồng bộ từ study4 để biết Part nào sai nhiều nhất.</p>}
          {d.note && d.note !== 'Điểm đầu vào' && d.kind !== 'off' && <p className="day-note">{d.note}</p>}
        </div>
      )}
    </article>
  );
}

function Study4Sync() {
  const toast = useToast();
  const ref = useRef();
  useEffect(() => { if (ref.current) ref.current.setAttribute('href', bookmarkletHref(APP_URL)); }, []);
  const copy = async () => {
    try { await navigator.clipboard.writeText('javascript:' + bookmarkletCode(APP_URL)); toast('Đã sao chép. Tạo dấu trang mới trong Chrome, dán mã này vào ô URL.'); }
    catch (e) { toast('Trình duyệt không cho sao chép ở đây. Hãy kéo nút Đồng bộ TOEIC lên thanh dấu trang.'); }
  };
  return (
    <section className="sheet sheet-pad sync">
      <h2>Đồng bộ điểm từ study4</h2>
      <ol>
        <li>Trên máy tính, kéo nút Đồng bộ TOEIC lên thanh dấu trang của Chrome. Chỉ cần làm một lần.</li>
        <li>Làm đề trên study4 ở chế độ Làm full test và nộp bài.</li>
        <li>Ở trang bất kỳ của study4 (đã đăng nhập), bấm dấu trang đó. App mở ra với điểm Nghe, Đọc và số câu đúng từng Part đã điền sẵn.</li>
      </ol>
      <div className="opts">
        <a ref={ref} className="bm bm-desktop" href="#/plan" onClick={e => { e.preventDefault(); toast('Kéo nút này lên thanh dấu trang, đừng bấm ở đây.'); }}><Icon name="sync" size={18} />Đồng bộ TOEIC</a>
        <button className="btn quiet" type="button" onClick={copy}>Sao chép mã dấu trang</button>
        <a className="btn quiet" href="https://study4.com/tests/toeic/" target="_blank" rel="noopener noreferrer">Mở study4</a>
      </div>
    </section>
  );
}

export default function Plan() {
  const state = useStore(getPlanState);
  const today = todayISO();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [sel, setSel] = useState(() => currentWeekIndex(today));
  const [openDay, setOpenDay] = useState(today);
  const stats = useMemo(() => planStats(state), [state]);
  const w = weeks[sel];

  useEffect(() => {
    const p = params.get('s4');
    if (!p) return;
    navigate('/plan', { replace: true });
    const list = decodeS4(p);
    if (!list) { toast('Dữ liệu đồng bộ bị lỗi. Bấm lại dấu trang khi đang mở study4.'); return; }
    const r = mergeStudy4(getPlanState(), list);
    replacePlanState(r.state);
    toast(r.ok.length ? `Đã đồng bộ ${r.ok.length} đề: ${r.ok.join(', ')}.` + (r.skip ? ` Bỏ qua ${r.skip} đề không có trong lộ trình.` : '')
      : `Chưa có đề nào trong lộ trình được làm trên study4. Bỏ qua ${r.skip} đề khác.`);
    if (r.firstDate) {
      setSel(weekIndexOf(r.firstDate)); setOpenDay(r.firstDate);
      setTimeout(() => { const el = document.getElementById('d-' + r.firstDate); if (el) el.scrollIntoView({ block: 'center' }); }, 80);
    }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = d => {
    setSel(weekIndexOf(d.date)); setOpenDay(d.date);
    setTimeout(() => { const el = document.getElementById('d-' + d.date); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60);
  };
  const lead = today < PLAN_START ? `Còn ${daysBetween(today, PLAN_START)} ngày nữa là bắt đầu.` : '';
  const doneInWeek = w.days.filter(d => (state[d.date] || {}).done).length;

  return (
    <div className="wrap plan-page">
      <div className="page-head" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1>Lộ trình TOEIC 700</h1>
        <p className="sub">16/11/2026 đến 28/02/2027, dự phòng tới 07/03. Làm đề, chữa Reading, chữa Listening, lặp lại. {lead}</p>
      </div>
      <div className="tally">
        <div><b>{stats.done}<small>/{stats.work}</small></b><span>buổi đã xong</span></div>
        <div><b>{stats.testsDone}<small>/{stats.tests}</small></b><span>đề đã làm</span></div>
        <div className="dark"><b>{stats.best || '–'}</b><span>điểm cao nhất</span></div>
      </div>
      <div className="plan-duo">
        <section className="sheet sheet-pad">
          <div className="section-head"><h2>Điểm qua từng đề</h2><span style={{ fontSize: 12, color: 'var(--guide)' }}>Mục tiêu 700</span></div>
          {!stats.points.length && <p className="hint-p" style={{ marginTop: 6 }}>Nhập điểm Nghe và Đọc sau mỗi đề, đường điểm sẽ hiện ở đây.</p>}
          <ScoreChart points={stats.points} />
        </section>
        <section className="sheet sheet-pad">
          <div className="section-head" style={{ marginBottom: 10 }}><h2>Phiếu tô {DAYS.length} ngày</h2><span className="sub" style={{ fontSize: 12 }}>bấm một ô để mở ngày đó</span></div>
          <div className="omr-sheet">
            <span />
            {COLS.map(c => <span key={c} className="colh">{c}</span>)}
            {weeks.map((wk, wi) => (
              <WeekRow key={wk.key} wk={wk} sel={wi === sel} state={state} today={today} onPickWeek={() => setSel(wi)} onPick={pick} />
            ))}
          </div>
          <div className="key">
            <span className="k-test"><i />Làm đề</span><span className="k-fixr"><i />Chữa Reading</span><span className="k-fixl"><i />Chữa Listening</span>
            <span className="k-review"><i />Chủ nhật ôn tập</span><span><i className="ring" />Bỏ lỡ</span>
          </div>
        </section>
      </div>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-live="polite">
        <div className="week-head">
          <div><h2 style={{ fontSize: 20 }}>{weekName(w)}</h2><p className="sub">{dm(w.days[0].date)} – {dm(w.days[w.days.length - 1].date)}, {w.days[0].phase.toLowerCase()}, xong {doneInWeek}/{w.days.length} ngày</p></div>
          <div className="nav">
            <button type="button" className="icon-btn" aria-label="Tuần trước" disabled={sel === 0} onClick={() => setSel(sel - 1)}><Icon name="back" size={18} /></button>
            <button type="button" className="icon-btn" aria-label="Tuần sau" disabled={sel === weeks.length - 1} onClick={() => setSel(sel + 1)}><Icon name="next" size={18} /></button>
          </div>
        </div>
        {sel !== currentWeekIndex(today) && <button type="button" className="btn quiet" style={{ alignSelf: 'flex-start' }} onClick={() => setSel(currentWeekIndex(today))}>Về tuần này</button>}
        <div className="days">
          {w.days.map(d => (
            <DayCard key={d.date} d={d} s={state[d.date] || {}} today={today} open={openDay === d.date} onToggle={() => setOpenDay(o => (o === d.date ? null : d.date))} />
          ))}
        </div>
      </section>
      <Study4Sync />
    </div>
  );
}

function WeekRow({ wk, sel, state, today, onPickWeek, onPick }) {
  const byDow = Object.fromEntries(wk.days.map(d => [d.dow, d]));
  return (
    <>
      <button type="button" className={'wk' + (sel ? ' sel' : '')} onClick={onPickWeek}>{weekName(wk)}</button>
      {COLS.map(c => {
        const d = byDow[c];
        if (!d) return <span key={c} />;
        const st = cellState(d, state[d.date] || {}, today);
        return (
          <button key={c} type="button" className={`cell k-${d.kind} ${st}`} onClick={() => onPick(d)}
            aria-label={`${DOW[d.dow]} ${dm(d.date)}: ${d.title}${st === 'done' ? ', đã xong' : st === 'missed' ? ', bỏ lỡ' : ''}`}><i /></button>
        );
      })}
    </>
  );
}
