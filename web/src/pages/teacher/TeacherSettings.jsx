import NotifyCard from '../../components/NotifyCard.jsx';
import { useStore } from '../../hooks/useStore.js';
import { getSettings, setSettings } from '../../services/store.js';
import { Switch, AccountCard } from '../student/Settings.jsx';
import '../student/student.css';

export default function TeacherSettings() {
  const s = useStore(() => getSettings('teacher'));
  return (
    <div className="wrap settings-page">
      <h1>Cài đặt</h1>
      <section className="sheet">
        <div className="set-row">
          <span className="tx"><b>Báo khi học viên hoàn thành</b><span>Kèm ghi chú học viên gửi</span></span>
          <Switch label="Báo khi học viên hoàn thành" checked={s.notifyDone} onChange={v => setSettings('teacher', { notifyDone: v })} />
        </div>
        <div className="set-row">
          <span className="tx"><b>Báo lúc 23:00 nếu hôm nay chưa học</b><span>Chỉ báo vào ngày có bài trong lộ trình</span></span>
          <Switch label="Báo lúc 23:00 nếu hôm nay chưa học" checked={s.notifyMissed} onChange={v => setSettings('teacher', { notifyMissed: v })} />
        </div>
      </section>
      <NotifyCard />
      <AccountCard />
    </div>
  );
}
