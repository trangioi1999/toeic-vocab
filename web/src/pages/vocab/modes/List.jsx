import Icon from '../../../components/Icon.jsx';
import { useSpeech } from '../../../hooks/useSpeech.js';
import { setCardStatus } from '../../../services/store.js';
import { enVi, ipaOf } from '../../../lib/vocab.js';
import { useVocab } from '../../../hooks/useVocab.js';
import { ST_LABEL, ST_CLS } from './shared.js';

export default function List({ items, status, showFrom, empty }) {
  const { say } = useSpeech();
  const { data } = useVocab();
  if (!items.length) return <p className="empty">{empty}</p>;
  return (
    <div className="sheet vlist">
      {items.map(it => {
        const [en, vi] = enVi(it), st = status[it.key] || 0;
        return (
          <div className="vitem" key={it.key}>
            <button className="sdot" type="button" aria-label={`Trạng thái: ${ST_LABEL[st]}. Bấm để đổi`} title={ST_LABEL[st] + ', bấm để đổi'}
              onClick={() => setCardStatus(it.key, (st + 1) % 3)}><i className={ST_CLS[st]} /></button>
            <div>
              <div className="t">{en}</div>
              {it.c[2] && <div className="ipa sm">{ipaOf(it)}</div>}
              {showFrom && data && <span className="from">{data.setMap.get(it.sid) && data.setMap.get(it.sid).title}</span>}
            </div>
            <div className="m">{vi}</div>
            <div className="acts">
              <button className="icon-btn bare" type="button" aria-label="Nghe tiếng Anh" onClick={() => say(en, 'en')}><Icon name="speaker" size={18} /></button>
              <button className="icon-btn bare vi-btn" type="button" aria-label="Đọc tiếng Việt" onClick={() => say(vi, 'vi')}>VI</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
