import { dm } from '../lib/dates.js';

/** Score line over full tests; dashed pink line marks the 700 goal. */
export default function ScoreChart({ points }) {
  const W = 520, H = 170, L = 34, R = 14, T = 16, B = 24, lo = 300, hi = 990;
  const y = v => T + (H - T - B) * (1 - (Math.min(Math.max(v, lo), hi) - lo) / (hi - lo));
  const n = Math.max(points.length, 2), x = i => L + (i * (W - L - R)) / (n - 1);
  const line = points.map((p, i) => `${x(i)},${y(p.v)}`).join(' ');
  const last = points[points.length - 1];
  const label = points.length ? `Điểm ${points.length} đề: ${points.map(p => p.v).join(', ')}` : 'Chưa có điểm';
  return (
    <svg className="score-chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label}>
      {[400, 550, 700, 850].map(v => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className={v === 700 ? 'goal' : 'grid'} />
          <text x="0" y={y(v) + 4} className={v === 700 ? 'goal-t' : ''}>{v}</text>
        </g>
      ))}
      {points.length > 0 && (
        <>
          <polygon points={`${x(0)},${y(lo)} ${line} ${x(points.length - 1)},${y(lo)}`} className="area" />
          <polyline points={line} className="ln" />
          {points.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(p.v)} r={i === points.length - 1 ? 5 : 3.5} className={i === points.length - 1 ? 'pt last' : 'pt'} />)}
          <text x={x(points.length - 1)} y={y(last.v) - 11} textAnchor={points.length > 1 ? 'end' : 'middle'} className="val">{last.v}</text>
          <text x={x(0)} y={H - 6}>{dm(points[0].date)}</text>
          {points.length > 1 && <text x={x(points.length - 1)} y={H - 6} textAnchor="end">{dm(last.date)}</text>}
        </>
      )}
    </svg>
  );
}
