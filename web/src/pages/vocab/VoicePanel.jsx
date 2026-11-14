import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { setPrefs } from '../../services/store.js';
import { vlist, vscore, pickVoice, VI_HELP, getVoices } from '../../lib/speech.js';
import { useSpeech } from '../../hooks/useSpeech.js';

const SAMPLE = { en: 'Please submit the report by Friday.', vi: 'Vui lòng nộp báo cáo trước thứ Sáu.' };

export default function VoicePanel({ prefs }) {
  const [, tick] = useState(0);
  const { say } = useSpeech();
  useEffect(() => {
    getVoices();
    const t = setInterval(() => { if (getVoices().length) { tick(x => x + 1); clearInterval(t); } }, 300);
    return () => clearInterval(t);
  }, []);
  const row = (lang, label) => {
    const l = [...vlist(lang)].sort((a, b) => vscore(b) - vscore(a));
    const cur = pickVoice(lang, prefs);
    const rk = lang === 'en' ? 'rateEn' : 'rateVi';
    const rate = prefs[rk] || (lang === 'en' ? 0.9 : 1);
    return (
      <div className="vrow">
        <b>{label}</b>
        {l.length ? (
          <select aria-label={'Giọng ' + label.toLowerCase()} value={cur ? cur.name : ''}
            onChange={e => { setPrefs({ ['voice_' + lang]: e.target.value }); setTimeout(() => say(SAMPLE[lang], lang), 50); }}>
            {l.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
          </select>
        ) : <p className="vnote warn">{lang === 'vi' ? VI_HELP : 'Máy chưa có giọng tiếng Anh.'}</p>}
        <label className="vrate">Tốc độ
          <input type="range" min="0.6" max="1.3" step="0.1" value={rate} onChange={e => setPrefs({ [rk]: +e.target.value })} />
          <span>{(+rate).toFixed(1)}×</span>
        </label>
        <button className="sbtn" type="button" onClick={() => say(SAMPLE[lang], lang)}><Icon name="speaker" size={16} />Nghe thử</button>
      </div>
    );
  };
  return (
    <div className="sheet vpanel">
      {row('en', 'Tiếng Anh')}
      {row('vi', 'Tiếng Việt')}
      <p className="vnote">Giọng có chữ Enhanced, Premium, Natural hoặc Google thường nghe tự nhiên nhất.</p>
    </div>
  );
}
