import { APP_NAME } from '../brand.js';

/** Shown while the app picks its backend and restores the session, or when that fails. */
export default function Splash({ error, onRetry }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--paper)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', maxWidth: 360 }}>
        <span className="logo" style={{ width: 48, height: 48, fontSize: 20 }} aria-hidden="true">T</span>
        <b style={{ font: '600 18px var(--display)' }}>{APP_NAME}</b>
        {error ? (
          <>
            <p className="form-error" role="alert" style={{ color: 'var(--guide-strong)', background: 'var(--guide-tint)', borderRadius: 12, padding: '10px 12px' }}>{error}</p>
            <button className="btn primary" type="button" onClick={onRetry}>Thử lại</button>
          </>
        ) : <p className="sub" role="status">Đang mở…</p>}
      </div>
    </div>
  );
}
