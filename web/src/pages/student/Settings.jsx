import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NotifyCard from '../../components/NotifyCard.jsx';
import { ThemePicker } from '../../components/ThemeControls.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useStore } from '../../hooks/useStore.js';
import { getSettings, setSettings } from '../../services/store.js';
import { kv } from '../../services/kv.js';
import { decodeData, mergeInto } from '../../lib/migrate.js';
import './student.css';

export function Switch({ checked, onChange, label }) {
  return <button type="button" role="switch" className="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />;
}

export function AccountCard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <section className="sheet who-card">
      <span className="av" aria-hidden="true">{user.name.charAt(0)}</span>
      <span className="tx"><b>{user.name}</b><span>{user.email}</span></span>
      <button type="button" className="btn danger" onClick={async () => { await logout(); navigate('/', { replace: true }); }}>Đăng xuất</button>
    </section>
  );
}

/** Paste the code from the old site's "Chuyển dữ liệu" page. Reloads so every screen reads the merged data. */
export function ImportBox({ after }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const run = e => {
    e.preventDefault();
    try {
      mergeInto(kv, decodeData(code));
      location.assign(after || location.pathname);
    } catch (err) { setError(err.message); }
  };
  return (
    <form className="sheet sheet-pad import-box" onSubmit={run}>
      <label className="field">Nhập dữ liệu từ bản cũ
        <span className="sub">Mở trang cũ, bấm “Sao chép mã” rồi dán vào đây. Tiến độ đang có không bị ghi đè.</span>
        <textarea className="input" rows={3} value={code} onChange={e => { setCode(e.target.value); setError(''); }}
          spellCheck={false} autoComplete="off" aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'import-error' : undefined} />
      </label>
      {error && <p className="form-error" id="import-error" role="alert">{error}. Kiểm tra đã dán đủ mã chưa.</p>}
      <button className="btn" type="submit" disabled={!code.trim()}>Nhập dữ liệu</button>
    </form>
  );
}

export default function Settings() {
  const s = useStore(() => getSettings('student'));
  return (
    <div className="wrap settings-page">
      <h1>Cài đặt</h1>
      <section className="sheet">
        <div className="set-row">
          <span className="tx"><b>Nhắc học mỗi ngày</b><span>Chỉ nhắc khi hôm đó bạn chưa hoàn thành</span></span>
          <Switch label="Nhắc học mỗi ngày" checked={s.reminder} onChange={v => setSettings('student', { reminder: v })} />
        </div>
        <label className="set-row" style={{ opacity: s.reminder ? 1 : 0.5 }}>
          <span className="tx"><b>Giờ nhắc</b></span>
          <input type="time" value={s.reminderTime} disabled={!s.reminder} onChange={e => e.target.value && setSettings('student', { reminderTime: e.target.value })} />
        </label>
      </section>
      <ThemePicker />
      <NotifyCard />
      <ImportBox />
      <AccountCard />
    </div>
  );
}
