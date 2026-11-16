import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { THEMES, THEME_LABEL, getTheme, setTheme, nextTheme, onTheme } from '../lib/theme.js';

function useTheme() {
  const [t, setT] = useState(getTheme);
  useEffect(() => onTheme(setT), []);
  return t;
}

const ICON = { system: 'auto', light: 'sun', dark: 'moon' };

/** Header button: one tap moves Theo máy → Sáng → Tối. */
export function ThemeButton({ className = '' }) {
  const t = useTheme();
  const next = nextTheme(t);
  return (
    <button type="button" className={'icon-btn bare theme-btn ' + className}
      aria-label={`Giao diện: ${THEME_LABEL[t]}. Bấm để chuyển sang ${THEME_LABEL[next]}`}
      title={`Giao diện: ${THEME_LABEL[t]}`} onClick={() => setTheme(next)}>
      <Icon name={ICON[t]} />
    </button>
  );
}

/** Settings row with all three choices visible. */
export function ThemePicker() {
  const t = useTheme();
  return (
    <section className="sheet">
      <div className="set-row theme-row">
        <span className="tx"><b id="theme-label">Giao diện</b><span>Chỉ áp dụng trên máy này</span></span>
        <div className="theme-seg" role="radiogroup" aria-labelledby="theme-label">
          {THEMES.map(x => (
            <button key={x} type="button" role="radio" aria-checked={t === x} onClick={() => setTheme(x)}>
              <Icon name={ICON[x]} size={16} />{THEME_LABEL[x]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
