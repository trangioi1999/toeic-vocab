import { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { APP_NAME } from '../../brand.js';
import AuthDialog from './AuthDialog.jsx';
import './landing.css';

const WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function HeroVisual() {
  return (
    <div className="lp-visual" aria-hidden="true">
      <div className="lp-today">
        <span className="lp-today-date">Hôm nay · Thứ 4, 02/12</span>
        <div className="lp-today-head">
          <span className="lp-ring"><span>2/4</span></span>
          <b>Chữa Listening Test 6</b>
        </div>
        <ul>
          <li><i className="on" />Ôn 20 thẻ từ</li>
          <li><i className="on" />Nghe lại Part 3</li>
          <li><i />Chép chính tả Part 4</li>
          <li><i />Ghi chú cho người kèm</li>
        </ul>
        <span className="lp-today-btn">Hoàn thành hôm nay</span>
      </div>
      <div className="lp-week">
        <div className="lp-week-head"><span>Tuần này</span><span>6 ngày liền</span></div>
        <div className="lp-week-grid">
          {WEEK.map(d => <span key={d}>{d}</span>)}
          {['on', 'on', 'today', '', '', '', ''].map((c, i) => <i key={i} className={c} />)}
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    title: 'Kho từ theo chủ đề',
    text: '6.580 thẻ chia theo ETS, Economy, YBM, Part 1… Học bằng thẻ lật, trắc nghiệm, gõ lại từ và nghe phát âm.',
    art: (
      <div className="lp-flash">
        <b>invoice</b><span className="ipa">/ˈɪn.vɔɪs/</span><span className="vi">hoá đơn</span>
      </div>
    ),
  },
  {
    title: 'Lộ trình từng ngày',
    text: 'Mỗi ngày có sẵn việc cần làm: học thẻ, làm đề, chữa bài. Điểm từ study4 tự vẽ thành biểu đồ theo từng Part.',
    art: (
      <div className="lp-bars">
        {[['Part 1', 83, 'l'], ['Part 2', 72, 'l'], ['Part 5', 67, 'r'], ['Part 6', 62, 'r'], ['Part 7', 56, 'w']].map(([p, v, k]) => (
          <div key={p} className={k === 'w' ? 'worst' : ''}><span>{p}</span><i><b className={k} style={{ width: v + '%' }} /></i></div>
        ))}
      </div>
    ),
  },
  {
    title: 'Người kèm theo dõi',
    tag: 'Thông báo sắp có',
    text: 'Người kèm xem lịch học, điểm từng Part và ghi chú của bạn. Bạn học xong là họ biết ngay.',
    art: (
      <div className="lp-cal">
        {['on', 'on', 'on', 'miss', 'on', 'on', 'rest', 'on', 'on', 'today', '', '', '', ''].map((c, i) => <i key={i} className={c} />)}
      </div>
    ),
  },
];

const STEPS = [
  ['Mở app', 'Trang Hôm nay cho biết tối nay cần làm gì: ôn bao nhiêu thẻ, làm đề nào, chữa phần nào.'],
  ['Học và tích từng việc', 'Ôn thẻ, làm đề, chữa bài. Xong việc nào tô ô việc đó, điểm study4 đồng bộ vào lộ trình.'],
  ['Bấm Hoàn thành', 'Ô hôm nay được tô kín, chuỗi ngày học tăng thêm một. Người kèm thấy ngay trên lịch.'],
];

const FAQ = [
  ['Làm sao để có tài khoản?', 'Hiện app chỉ dành cho người được mời, tài khoản do người quản lý tạo. Đăng ký tự do sẽ mở sau.'],
  ['Dùng trên điện thoại được không?', 'Được. Mở bằng Safari hoặc Chrome, chọn "Thêm vào màn hình chính". App vẫn mở được khi mất mạng.'],
  ['App có mất phí không?', 'Không. App chạy trên gói miễn phí của Cloudflare và Firebase.'],
];

export default function Landing() {
  const { pathname } = useLocation();
  const mode = pathname === '/login' ? 'login' : pathname === '/signup' ? 'signup' : null;
  const opener = useRef(null);
  const remember = e => { opener.current = e.currentTarget; };

  return (
    <div className="lp">
      <div className="lp-page" {...(mode ? { inert: '', 'aria-hidden': 'true' } : {})}>
        <header className="lp-header">
          <div className="lp-wrap lp-header-in">
            <Link className="brand" to="/"><span className="logo">T</span>{APP_NAME}</Link>
            <nav className="lp-nav" aria-label="Trang">
              <a href="#tinh-nang">Tính năng</a>
              <a href="#cach-dung">Cách dùng</a>
              <a href="#hoi-dap">Hỏi đáp</a>
            </nav>
            <Link className="btn primary lp-login" to="/login" onClick={remember}>Đăng nhập</Link>
          </div>
        </header>

        <main>
          <section className="lp-wrap lp-hero">
            <div className="lp-hero-copy">
              <span className="lp-chip"><i />Lộ trình TOEIC 700+ trong 16 tuần</span>
              <h1>Mỗi ngày tô thêm một ô.</h1>
              <p className="lp-lead">Kho từ vựng TOEIC, việc cần làm cho từng ngày, và một người kèm luôn biết hôm nay bạn đã học xong chưa.</p>
              <div className="lp-cta">
                <Link className="btn primary lp-big" to="/login" onClick={remember}>Đăng nhập</Link>
                <a className="btn lp-big" href="#cach-dung">Xem cách dùng<Icon name="next" size={18} /></a>
              </div>
              <p className="lp-fine">Hiện dành cho người được mời. Đăng ký sẽ mở sau.</p>
            </div>
            <HeroVisual />
          </section>

          <section className="lp-wrap" aria-label="Con số">
            <dl className="lp-facts">
              <div><dt>6.580</dt><dd>thẻ từ vựng</dd></div>
              <div><dt>12</dt><dd>nhóm chủ đề</dd></div>
              <div><dt>112</dt><dd>ngày lộ trình</dd></div>
              <div><dt>0đ</dt><dd>miễn phí</dd></div>
            </dl>
          </section>

          <section id="tinh-nang" className="lp-wrap lp-sec">
            <span className="lp-eyebrow">Tính năng</span>
            <h2>Một app, đủ ba việc mỗi tối</h2>
            <div className="lp-features">
              {FEATURES.map(f => (
                <article key={f.title} className="lp-feature">
                  <div className="lp-art" aria-hidden="true">{f.art}</div>
                  <div className="lp-feature-tx">
                    <div className="lp-feature-h"><h3>{f.title}</h3>{f.tag && <span className="lp-soon">{f.tag}</span>}</div>
                    <p>{f.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="cach-dung" className="lp-wrap lp-sec">
            <span className="lp-eyebrow">Cách dùng</span>
            <h2>Ba bước mỗi tối</h2>
            <ol className="lp-steps">
              {STEPS.map(([t, d], i) => (
                <li key={t} className={i === 2 ? 'last' : ''}>
                  <span className="lp-step-n">{i + 1}</span>
                  <b>{t}</b>
                  <span>{d}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="lp-wrap lp-sec">
            <span className="lp-eyebrow">Hai vai trò</span>
            <h2>Một người học, một người kèm</h2>
            <div className="lp-roles">
              <div className="lp-role">
                <div className="lp-role-h"><span className="av s">H</span><h3>Người học</h3></div>
                <ul>
                  <li>Hôm nay: việc cần làm và nút Hoàn thành</li>
                  <li>Kho từ: học thẻ, ôn lại thẻ chưa thuộc</li>
                  <li>Lộ trình: 16 tuần, điểm từng đề, từng Part</li>
                  <li>Nhắc học lúc 20:00 nếu hôm đó chưa xong</li>
                </ul>
              </div>
              <div className="lp-role dark">
                <div className="lp-role-h"><span className="av c">N</span><h3>Người kèm</h3></div>
                <ul>
                  <li>Lịch tháng: ngày nào học, ngày nào bỏ</li>
                  <li>Chi tiết ngày: điểm, việc đã làm, ghi chú</li>
                  <li>Chỉ xem, không sửa được tiến độ</li>
                  <li>Báo tin khi người học hoàn thành</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="hoi-dap" className="lp-wrap lp-sec">
            <span className="lp-eyebrow">Hỏi đáp</span>
            <h2>Câu hỏi hay gặp</h2>
            <div className="lp-faq">
              {FAQ.map(([q, a], i) => (
                <details key={q} open={i === 0}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="lp-wrap lp-sec">
            <div className="lp-final">
              <div>
                <div className="lp-final-dots" aria-hidden="true"><i /><i /><i /><i className="today" /></div>
                <h2>Tối nay tô ô tiếp theo.</h2>
              </div>
              <Link className="btn lp-big lp-white" to="/login" onClick={remember}>Đăng nhập</Link>
            </div>
          </section>
        </main>

        <footer className="lp-wrap lp-footer">
          <span>© 2026 {APP_NAME}</span>
          <span className="lp-footer-links">
            <a href="#tinh-nang">Tính năng</a>
            <a href="#hoi-dap">Hỏi đáp</a>
            <Link to="/login" onClick={remember}>Đăng nhập</Link>
          </span>
        </footer>
      </div>
      {mode && <AuthDialog mode={mode} opener={opener} />}
    </div>
  );
}
