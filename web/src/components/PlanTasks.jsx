import { Link, useNavigate } from 'react-router-dom';
import { rewritePlanLinks } from '../lib/legacyHash.js';
import { ticksOf, dayProgress } from '../lib/progress.js';
import { recallNeeded } from '../lib/recall.js';
import { todayISO, dm } from '../lib/dates.js';

const stripLinks = html => html.replace(/<\/?a\b[^>]*>/g, '');
/** The old task text said "+ ôn thẻ hôm trước"; that part is its own task now. */
const dropRecall = html => html.replace(/\s*\+\s*ôn thẻ hôm trước/, '');

/** First task on days that check the previous study day's cards; it fills itself once the check is passed. */
function RecallTask({ day, entry, readOnly, noLinks }) {
  const { recall, recallOk } = dayProgress(day, entry);
  const rec = entry && entry.recall;
  const live = !readOnly && !noLinks && day.date === todayISO();
  const need = rec ? recallNeeded(rec.total) : null;
  const wrong = (rec && rec.wrong) || [];
  return (
    <li className={'recall-task' + (recallOk ? ' on' : '')}>
      <span className={'bubble' + (recallOk ? ' filled' : '')} role="img" aria-label={recallOk ? 'Đã đạt' : 'Chưa đạt'} />
      <div className="rt">
        <span className="lbl">Kiểm tra bài cũ: {recall.sets.map(s => s.name).join(', ')} của ngày {dm(recall.from)}, đúng từ 80% trở lên</span>
        {rec && <span className={'rs' + (recallOk ? ' ok' : '')}>{recallOk ? `Đạt ${rec.right}/${rec.total}` : `Chưa đạt: ${rec.right}/${rec.total}, cần ${need}`}{rec.tries > 1 ? ` (làm ${rec.tries} lần)` : ''}</span>}
        {live && (
          <span className="ra">
            {!recallOk && wrong.length > 0 && <Link className="btn sm primary" to="/vocab/session" state={{ title: 'Ôn từ sai của bài cũ', keys: wrong, back: '/today', backLabel: 'Hôm nay' }}>Ôn {wrong.length} từ sai</Link>}
            <Link className={'btn sm' + (!rec ? ' primary' : '')} to="/recall">{rec ? 'Làm lại' : 'Làm bài kiểm tra'}</Link>
          </span>
        )}
      </div>
    </li>
  );
}

/** The day's to-do list; each task is a bubble you fill in. */
export default function PlanTasks({ day, entry, onToggle, readOnly, noLinks }) {
  const ticks = ticksOf(day, entry);
  const navigate = useNavigate();
  const hasRecall = !!dayProgress(day, entry).recall;
  // Task text is HTML; route its in-app links through the router instead of reloading the page.
  const onClick = e => {
    const a = e.target.closest && e.target.closest('a[data-inapp]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(a.getAttribute('href'));
  };
  return (
    <ul className="ptasks" onClick={onClick}>
      {hasRecall && <RecallTask day={day} entry={entry} readOnly={readOnly} noLinks={noLinks} />}
      {day.tasks.map((t0, i) => {
        const id = `t-${day.date}-${i}`;
        const t = hasRecall ? dropRecall(t0) : t0;
        return (
          <li key={i} className={ticks[i] ? 'on' : ''}>
            {readOnly
              ? <span className={'bubble' + (ticks[i] ? ' filled' : '')} role="img" aria-label={ticks[i] ? 'Đã làm' : 'Chưa làm'} />
              : <input id={id} type="checkbox" className="bubble-check" checked={ticks[i]} onChange={e => onToggle(i, e.target.checked)} />}
            <label htmlFor={readOnly ? undefined : id} dangerouslySetInnerHTML={{ __html: noLinks ? stripLinks(t) : rewritePlanLinks(t) }} />
          </li>
        );
      })}
    </ul>
  );
}
