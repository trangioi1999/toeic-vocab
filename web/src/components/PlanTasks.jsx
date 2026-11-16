import { useNavigate } from 'react-router-dom';
import { rewritePlanLinks } from '../lib/legacyHash.js';
import { ticksOf } from '../lib/progress.js';

const stripLinks = html => html.replace(/<\/?a\b[^>]*>/g, '');

/** The day's to-do list; each task is a bubble you fill in. */
export default function PlanTasks({ day, entry, onToggle, readOnly, noLinks }) {
  const ticks = ticksOf(day, entry);
  const navigate = useNavigate();
  // Task text is HTML; route its in-app links through the router instead of reloading the page.
  const onClick = e => {
    const a = e.target.closest && e.target.closest('a[data-inapp]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(a.getAttribute('href'));
  };
  return (
    <ul className="ptasks" onClick={onClick}>
      {day.tasks.map((t, i) => {
        const id = `t-${day.date}-${i}`;
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
