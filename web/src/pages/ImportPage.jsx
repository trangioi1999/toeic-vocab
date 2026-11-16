import { useEffect, useRef, useState } from 'react';
import { APP_NAME } from '../brand.js';
import { kv } from '../services/kv.js';
import { decodeData, mergeInto } from '../lib/migrate.js';
import { ImportBox } from './student/Settings.jsx';
import './landing/landing.css';

/** /import#d=CODE — receives progress from the old site, merges it, then sends the user into the app. */
export default function ImportPage() {
  const [state, setState] = useState({ step: 'work' });
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return; // merge once, even when StrictMode replays effects
    ran.current = true;
    const hash = location.hash;
    history.replaceState(null, '', '/import');
    if (!hash.startsWith('#d=')) { setState({ step: 'paste' }); return; }
    try {
      const { added } = mergeInto(kv, decodeData(hash));
      setState({ step: 'done', added });
    } catch (e) {
      setState({ step: 'error', message: e.message });
    }
  }, []);

  return (
    <div className="lp">
      <div className="lp-wrap" style={{ maxWidth: 560, paddingTop: 48, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <a className="brand" href="/"><span className="logo">T</span>{APP_NAME}</a>
        <h1>Chuyển dữ liệu sang app mới</h1>
        {state.step === 'work' && <p className="sub" role="status">Đang chuyển dữ liệu…</p>}
        {state.step === 'done' && (
          <section className="sheet sheet-pad" role="status" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <b style={{ font: '600 17px var(--display)' }}>Đã chuyển xong{state.added ? ` ${state.added.toLocaleString('vi-VN')} mục` : ''}.</b>
            <span className="sub">{state.added ? 'Tiến độ học cũ đã có trong app mới. Những gì đã có sẵn ở đây được giữ nguyên.' : 'Không có gì mới để thêm: app mới đã có đủ dữ liệu này.'}</span>
            <a className="btn primary block" href="/today">Vào app</a>
          </section>
        )}
        {state.step === 'error' && <p className="form-error" role="alert">{state.message}. Thử dán mã bằng tay bên dưới.</p>}
        {(state.step === 'error' || state.step === 'paste') && <ImportBox after="/today" />}
      </div>
    </div>
  );
}
