/** Correct answers per Part. `want` limits the parts shown; the weakest gets the pink ink. */
export default function PartBars({ parts, want = [1, 2, 3, 4, 5, 6, 7], markWorst = true }) {
  const rows = want.filter(n => parts && parts[n]).map(n => ({ n, c: parts[n][0], t: parts[n][1], pc: parts[n][1] ? parts[n][0] / parts[n][1] : 0 }));
  if (!rows.length) return null;
  const worst = rows.reduce((a, b) => (b.pc < a.pc ? b : a));
  return (
    <div className="parts">
      {rows.map(r => (
        <div key={r.n} className={'pbar' + (r.n <= 4 ? ' lis' : '') + (markWorst && r === worst ? ' worst' : '')}>
          <span>Part {r.n}</span><span className="track"><i style={{ width: Math.round(r.pc * 100) + '%' }} /></span><b>{r.c}/{r.t}</b>
        </div>
      ))}
    </div>
  );
}
export function worstPart(parts, want = [1, 2, 3, 4, 5, 6, 7]) {
  const rows = want.filter(n => parts && parts[n] && parts[n][1]).map(n => ({ n, c: parts[n][0], t: parts[n][1], pc: parts[n][0] / parts[n][1] }));
  return rows.length ? rows.reduce((a, b) => (b.pc < a.pc ? b : a)) : null;
}
