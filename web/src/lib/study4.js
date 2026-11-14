import { testDay } from './plan.js';

export const encodeS4 = list => btoa(unescape(encodeURIComponent(JSON.stringify(list))));
export function decodeS4(payload) {
  try { const v = JSON.parse(decodeURIComponent(escape(atob(payload)))); return Array.isArray(v) ? v : [v]; }
  catch (e) { return null; }
}

/** Merge study4 attempts into the plan state (pure). Newest attempt wins; a full test beats a part practice. */
export function mergeStudy4(planState, list) {
  const best = new Map();
  for (const o of list) {
    const cur = best.get(o.tid);
    if (!cur || (o.full && !cur.full) || (o.full === cur.full && o.rid > cur.rid)) best.set(o.tid, o);
  }
  const state = { ...planState };
  const ok = []; let skip = 0, firstDate = null;
  best.forEach(o => {
    const d = testDay(o.tid);
    if (!d) { skip++; return; }
    const s = state[d.date] = { ...(state[d.date] || {}), parts: o.parts };
    if (o.full) s.done = true;
    if (o.l) s.l = String(o.l);
    if (o.r) s.r = String(o.r);
    ok.push(d.test.replace('TOEIC LR ', '') + (o.l && o.r ? ` (${o.l + o.r})` : o.full ? '' : ' (luyện từng Part)'));
    if (!firstDate || d.date < firstDate) firstDate = d.date;
  });
  return { state, ok, skip, firstDate };
}

/* Runs on study4.com (bookmarklet). Reads every attempt in "Thống kê kết quả" and opens the plan with them. */
async function bmFn() {
  if (!/study4\.com$/.test(location.hostname)) { alert('Hãy bấm dấu trang này khi đang mở study4.com (đã đăng nhập).'); return; }
  const R = { 1: [1, 6], 2: [7, 31], 3: [32, 70], 4: [71, 100], 5: [101, 130], 6: [131, 146], 7: [147, 200] };
  const parse = (doc, url) => {
    const m = url.match(/\/tests\/(\d+)\/[^/]+\/results\/(\d+)/); if (!m) return null;
    const parts = {}; let n = 0;
    doc.querySelectorAll('.result-answers-item').forEach(it => {
      const x = it.textContent.replace(/\s+/g, ' ').match(/(\d{1,3})\s*([A-D])\s*:\s*([A-D]|chưa trả lời)/); if (!x) return;
      const q = +x[1]; n++;
      for (const p in R) { if (q >= R[p][0] && q <= R[p][1]) { parts[p] = parts[p] || [0, 0]; parts[p][1]++; if (x[2] === x[3]) parts[p][0]++; } }
    });
    const box = (doc.querySelector('.result-score-details') || doc.body).textContent.replace(/\s+/g, ' ');
    const g = r => { const y = box.match(r); return y ? +y[1] : null; };
    return { tid: +m[1], rid: +m[2], full: !doc.querySelector('.result-badge-practice'), l: g(/Listening[^\d]{0,80}?(\d{1,3})\s*\/\s*495/i), r: g(/Reading[^\d]{0,80}?(\d{1,3})\s*\/\s*495/i), n, parts };
  };
  const tip = document.createElement('div');
  tip.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;background:#1B2220;color:#fff;padding:12px 16px;border-radius:10px;font:14px sans-serif';
  tip.textContent = 'Đang đọc kết quả study4…'; document.body.appendChild(tip);
  try {
    const a = await fetch('/tests/analytics/?exam=1&qdays=all').then(r => r.text());
    const ad = new DOMParser().parseFromString(a, 'text/html');
    const links = [...new Set([...ad.querySelectorAll('a[href*="/results/"]')].map(x => x.getAttribute('href')))];
    if (/\/results\//.test(location.pathname) && !links.includes(location.pathname)) links.unshift(location.pathname);
    const out = [];
    for (const l of links) { tip.textContent = 'Đang đọc ' + (out.length + 1) + '/' + links.length + ' bài làm…'; const h = await fetch(l).then(r => r.text()); const o = parse(new DOMParser().parseFromString(h, 'text/html'), l); if (o && o.n) out.push(o); }
    tip.remove();
    if (!out.length) { alert('Chưa thấy bài làm TOEIC nào trong Thống kê kết quả của bạn.'); return; }
    window.open('__PLAN__#s4=' + btoa(unescape(encodeURIComponent(JSON.stringify(out)))), '_blank');
  } catch (e) { tip.textContent = 'Không đọc được kết quả: ' + e; setTimeout(() => tip.remove(), 5000); }
}
export const bookmarkletCode = planUrl => '(' + bmFn.toString().replace('__PLAN__', planUrl) + ')()';
export const bookmarkletHref = planUrl => 'javascript:' + encodeURIComponent(bookmarkletCode(planUrl));
