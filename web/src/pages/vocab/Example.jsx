import Icon from '../../components/Icon.jsx';
import { markTerm } from '../../lib/vocab.js';

/** The card's example sentence with the term marked, its Vietnamese meaning, and an optional "listen" button. */
export default function Example({ it, onSay, compact }) {
  if (!it || !it.ex) return null;
  const [en, vi] = it.ex;
  const parts = markTerm(en, it.c[0]);
  return (
    <div className={'ex' + (compact ? ' sm' : '')}>
      <p className="ex-en" lang="en">{parts.length === 3 ? <>{parts[0]}<mark>{parts[1]}</mark>{parts[2]}</> : en}</p>
      {vi && <p className="ex-vi">{vi}</p>}
      {onSay && (
        <button className="sbtn" type="button" data-say onClick={e => { e.stopPropagation(); onSay(en); }}>
          <Icon name="speaker" size={16} />Nghe câu
        </button>
      )}
    </div>
  );
}
