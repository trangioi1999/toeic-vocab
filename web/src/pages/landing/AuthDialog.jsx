import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { safeNext } from '../../lib/roles.js';
import { SIGNUP_OPEN } from '../../brand.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Nhập email và mật khẩu'); return; }
    setBusy(true); setError('');
    try {
      const u = await login(email, password);
      navigate(safeNext(params.get('next'), u.role), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="ad-form" onSubmit={submit} noValidate>
      <label className="field">Email
        <input className="input" type="email" autoComplete="username" inputMode="email" value={email} data-autofocus=""
          onChange={e => setEmail(e.target.value)} placeholder="ten@email.com" aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'ad-error' : undefined} />
      </label>
      <div className="field">
        <span className="ad-pw-label">
          <label htmlFor="ad-pw">Mật khẩu</label>
          <button type="button" className="ad-link" onClick={() => toast('Nhắn người quản lý để đặt lại mật khẩu.')}>Quên mật khẩu?</button>
        </span>
        <span className="pw">
          <input id="ad-pw" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" value={password}
            onChange={e => setPassword(e.target.value)} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'ad-error' : undefined} />
          <button type="button" className="icon-btn bare" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={show}
            onClick={() => setShow(s => !s)}><Icon name={show ? 'eyeOff' : 'eye'} /></button>
        </span>
      </div>
      {error && <p className="form-error" id="ad-error" role="alert">{error}. Kiểm tra lại rồi thử lần nữa.</p>}
      <button className="btn primary block" type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form>
  );
}

function SignupForm() {
  const locked = !SIGNUP_OPEN;
  return (
    <div className="ad-form">
      {locked && (
        <div className="ad-locked" role="status">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          <span><b>Đăng ký chưa mở</b>Hiện app chỉ dành cho người được mời. Nếu bạn đã có tài khoản, hãy đăng nhập.</span>
        </div>
      )}
      <fieldset className="ad-fields" disabled={locked}>
        <label className="field">Tên của bạn<input className="input" type="text" autoComplete="name" /></label>
        <label className="field">Email<input className="input" type="email" autoComplete="email" inputMode="email" /></label>
        <label className="field">Mật khẩu (ít nhất 8 ký tự)<input className="input" type="password" autoComplete="new-password" /></label>
        <button className="btn primary block" type="button">Tạo tài khoản</button>
      </fieldset>
      <Link className="ad-switch" to="/login" replace data-autofocus="">Đã có tài khoản? Đăng nhập</Link>
    </div>
  );
}

export default function AuthDialog({ mode, opener }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const box = useRef(null);
  const qs = params.toString() ? '?' + params.toString() : '';
  const close = () => navigate('/', { replace: true });

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const back = opener && opener.current;
    return () => {
      document.body.style.overflow = prevOverflow;
      if (back && document.contains(back)) back.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const first = box.current.querySelector('[data-autofocus]') || box.current.querySelector(FOCUSABLE);
    if (first) first.focus({ preventScroll: true });
  }, [mode]);

  const onKeyDown = e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = [...box.current.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const title = mode === 'login' ? 'Chào bạn quay lại' : 'Tạo tài khoản';
  const sub = mode === 'login' ? 'Đăng nhập xong, app tự mở đúng trang của bạn.' : 'Tài khoản mới là người học. Vai trò người kèm do người quản lý cấp.';

  return (
    <div className="ad-layer" onKeyDown={onKeyDown}>
      <div className="ad-backdrop" onClick={close} aria-hidden="true" />
      <div className="ad-box" role="dialog" aria-modal="true" aria-labelledby="ad-title" aria-describedby="ad-sub" ref={box}>
        <span className="ad-handle" aria-hidden="true" />
        <div className="ad-head">
          <div>
            <h2 id="ad-title">{title}</h2>
            <p id="ad-sub">{sub}</p>
          </div>
          <button type="button" className="icon-btn bare ad-close" aria-label="Đóng" onClick={close}><Icon name="close" /></button>
        </div>
        <nav className="ad-tabs" aria-label="Đăng nhập hoặc đăng ký">
          <Link to={'/login' + qs} replace aria-current={mode === 'login' ? 'page' : undefined}>Đăng nhập</Link>
          <Link to={'/signup' + qs} replace aria-current={mode === 'signup' ? 'page' : undefined}>Đăng ký</Link>
        </nav>
        {mode === 'login' ? <LoginForm /> : <SignupForm />}
      </div>
    </div>
  );
}
