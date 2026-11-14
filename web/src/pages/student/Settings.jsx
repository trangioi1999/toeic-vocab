import { useNavigate } from 'react-router-dom';
import NotifyCard from '../../components/NotifyCard.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useStore } from '../../hooks/useStore.js';
import { getSettings, setSettings } from '../../services/store.js';
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
      <button type="button" className="btn danger" onClick={async () => { await logout(); navigate('/login', { replace: true }); }}>Đăng xuất</button>
    </section>
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
      <NotifyCard />
      <AccountCard />
    </div>
  );
}
