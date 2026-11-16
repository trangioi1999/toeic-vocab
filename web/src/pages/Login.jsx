import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { safeNext } from '../lib/roles.js';
import './Login.css';


function OmrStrip() {
  const rows = [['T2', 2], ['T3', 0], ['T4', -1]];
  return (
    <div className="omr" aria-hidden="true">
      <div className="omr-head"><span>Phiếu học hằng ngày</span><span>Tuần này</span></div>
      <div className="omr-grid">
        {rows.map(([q, fill]) => (
          <FragmentRow key={q} q={q} fill={fill} />
        ))}
      </div>
    </div>
  );
}
function FragmentRow({ q, fill }) {
  return (
    <>
      <span className="q">{q}</span>
      {['A', 'B', 'C', 'D'].map((l, i) => (
        i === fill ? <span key={l} className="omr-b fill" />
          : fill === -1 && i === 1 ? <span key={l} className="omr-b ask">?</span>
            : <span key={l} className="omr-b">{l}</span>
      ))}
    </>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async (e, p) => {
    setBusy(true); setError('');
    try {
      const u = await login(e, p);
      navigate(safeNext(params.get('next'), u.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  };
  const submit = e => { e.preventDefault(); go(email, password); };

  return (
    <div className="login">
      <div className="login-inner">
        <div className="brand-row"><span className="logo">T</span>Kho Từ TOEIC</div>
        <OmrStrip />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1>Mỗi ngày tô thêm một ô.</h1>
          <p className="sub" style={{ fontSize: 15 }}>Đăng nhập để học và ghi lại ngày học. Người kèm theo dõi tiến độ của bạn ở cùng một nơi.</p>
        </div>
        <form onSubmit={submit} noValidate>
          <label className="field">Email
            <input className="input" type="email" autoComplete="username" inputMode="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="ten@email.com" required />
          </label>
          <label className="field">Mật khẩu
            <span className="pw">
              <input className="input" type={show ? 'text' : 'password'} autoComplete="current-password" value={password}
                onChange={e => setPassword(e.target.value)} required />
              <button type="button" className="icon-btn bare" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={show}
                onClick={() => setShow(s => !s)}><Icon name={show ? 'eyeOff' : 'eye'} /></button>
            </span>
          </label>
          {error && <p className="form-error" role="alert">{error}. Kiểm tra lại rồi thử lần nữa.</p>}
          <button className="btn primary block" type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
          <p className="hint">Quên mật khẩu? Nhắn người quản lý để được đặt lại.</p>
        </form>
      </div>
    </div>
  );
}
