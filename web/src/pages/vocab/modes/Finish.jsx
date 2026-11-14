import { useState } from 'react';
import { setCardStatus } from '../../../services/store.js';

export default function Finish({ S, again }) {
  const [marked, setMarked] = useState(false);
  return (
    <div className="sheet qcard result">
      <span className="sub">Kết quả</span>
      <div className="big">{S.g}/{S.o.length}</div>
      <p className="sub" style={{ maxWidth: '46ch' }}>{S.r ? 'Các câu sai đã được chuyển sang Đang học để bạn ôn lại.' : 'Bạn trả lời đúng tất cả các câu.'}</p>
      <div className="qact" style={{ justifyContent: 'center' }}>
        <button className="btn" type="button" onClick={again}>Làm lại</button>
        {S.right.length > 0 && (
          <button className="btn primary" type="button" disabled={marked} onClick={() => { S.right.forEach(it => setCardStatus(it.key, 2)); setMarked(true); }}>
            {marked ? 'Đã đánh dấu' : `Đánh dấu ${S.right.length} câu đúng là đã thuộc`}
          </button>
        )}
      </div>
    </div>
  );
}
