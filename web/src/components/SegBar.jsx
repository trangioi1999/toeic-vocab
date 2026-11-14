export default function SegBar({ c, thin }) {
  const t = c[0] + c[1] + c[2] || 1;
  return (
    <div className={'seg' + (thin ? ' thin' : '')} role="img" aria-label={`${c[2]} đã thuộc, ${c[1]} đang học, ${c[0]} chưa học`}>
      <i className="k" style={{ width: (c[2] / t) * 100 + '%' }} />
      <i className="l" style={{ width: (c[1] / t) * 100 + '%' }} />
    </div>
  );
}
