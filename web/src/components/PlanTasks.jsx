import { rewritePlanLinks } from '../lib/legacyHash.js';

const stripLinks = html => html.replace(/<\/?a\b[^>]*>/g, '');

/** The day's to-do list; each task is a bubble you fill in. */
export default function PlanTasks({ day, entry, onToggle, readOnly, noLinks }) {
  const ticks = day.tasks.map((_, i) => (entry && entry.tasks ? !!entry.tasks[i] : !!(entry && entry.done)));
  return (
    <ul className="ptasks">
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
