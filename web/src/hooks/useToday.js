import { useEffect, useState } from 'react';
import { todayISO } from '../lib/dates.js';

const msToMidnight = () => { const n = new Date(); const m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 1); return m - n; };

/** Local "today" that rolls over at midnight and when the app returns to the foreground. */
export function useToday() {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    let t;
    const refresh = () => { setToday(todayISO()); clearTimeout(t); t = setTimeout(refresh, msToMidnight()); };
    const onVis = () => { if (document.visibilityState !== 'hidden') refresh(); };
    t = setTimeout(refresh, msToMidnight());
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', refresh);
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', refresh); };
  }, []);
  return today;
}
