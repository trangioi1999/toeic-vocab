import { useState } from 'react';

const supported = () => typeof window !== 'undefined' && 'Notification' in window;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

async function showTest() {
  const title = 'Đã bật thông báo nhắc học';
  const opts = { body: 'Bạn sẽ nhận thông báo trên thiết bị này.', icon: './icon-192.png' };
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) { (await navigator.serviceWorker.ready).showNotification(title, opts); return; }
    new Notification(title, opts); // eslint-disable-line no-new
  } catch (e) { /* some mobile browsers only allow notifications from a service worker */ }
}

/** Device notification permission + iPhone install guide. Sending scheduled notifications comes in phase 2. */
export default function NotifyCard() {
  const [perm, setPerm] = useState(() => (supported() ? Notification.permission : 'unsupported'));
  const ask = async () => {
    try { const p = await Notification.requestPermission(); setPerm(p); if (p === 'granted') showTest(); } catch (e) { setPerm('unsupported'); }
  };
  const text = {
    granted: ['on', 'Thiết bị này đã bật thông báo'],
    denied: ['off', 'Thiết bị này đang chặn thông báo'],
    default: ['off', 'Thiết bị này chưa bật thông báo'],
    unsupported: ['off', 'Trình duyệt này chưa hỗ trợ thông báo'],
  }[perm];
  const ios = isIOS() && !standalone();
  return (
    <section className="sheet sheet-pad notify">
      <div className="notify-state"><span className={'state-dot ' + text[0]} aria-hidden="true" /><b>{text[1]}</b></div>
      {perm === 'default' && <button className="btn primary block" type="button" onClick={ask}>Bật thông báo</button>}
      {perm === 'granted' && <button className="btn quiet" type="button" onClick={showTest}>Gửi thử một thông báo</button>}
      {perm === 'denied' && <p className="sub">Mở cài đặt trang web của trình duyệt, cho phép Thông báo, rồi tải lại trang.</p>}
      {(ios || perm === 'unsupported') && (
        <div className="guide">
          <b>Dùng iPhone?</b>
          <ol>
            <li>Mở trang bằng Safari</li>
            <li>Bấm nút Chia sẻ, chọn "Thêm vào MH chính"</li>
            <li>Mở app từ màn hình chính rồi bấm Bật thông báo</li>
          </ol>
        </div>
      )}
      <p className="fine">Bản thử nghiệm: thông báo tự động hằng ngày sẽ chạy khi app được nối máy chủ ở bản sau.</p>
    </section>
  );
}
