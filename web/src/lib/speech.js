import { isEn, enVi } from './vocab.js';

let voices = [];
const loadV = () => { try { voices = speechSynthesis.getVoices(); } catch (e) { /* unsupported */ } };
if (typeof window !== 'undefined' && 'speechSynthesis' in window) { loadV(); try { speechSynthesis.onvoiceschanged = loadV; } catch (e) { /* ignore */ } }
export const getVoices = () => { if (!voices.length) loadV(); return voices; };

const plat = typeof navigator === 'undefined' ? 'other'
  : /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios'
    : /Mac/.test(navigator.platform) ? 'mac' : /Android/.test(navigator.userAgent) ? 'android' : /Win/.test(navigator.platform) ? 'win' : 'other';
export const VI_HELP = {
  ios: 'Máy chưa có giọng tiếng Việt. Vào Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Việt → tải giọng Linh, rồi mở lại trang.',
  mac: 'Máy chưa có giọng tiếng Việt. Vào Cài đặt hệ thống → Trợ năng → Nội dung được đọc → Giọng hệ thống → Quản lý giọng… → Tiếng Việt → tải Linh, rồi tắt hẳn Chrome và mở lại.',
  android: 'Máy chưa có giọng tiếng Việt. Vào Cài đặt → Hỗ trợ tiếp cận → Chuyển văn bản thành giọng nói → Công cụ Google → tải dữ liệu Tiếng Việt.',
  win: 'Máy chưa có giọng tiếng Việt. Vào Settings → Time & language → Speech → Add voices → Vietnamese, rồi mở lại trình duyệt.',
  other: 'Máy chưa có giọng đọc tiếng Việt. Hãy cài giọng Vietnamese trong cài đặt hệ thống.',
}[plat];

export const vlist = lang => getVoices().filter(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(lang));
export const vscore = v => (/premium|natural|enhanced|neural|online/i.test(v.name) ? 3 : 0) + (/google/i.test(v.name) ? 2 : 0)
  + (/linh|samantha|ava|zoe|allison|aria|jenny|hoaimy|namminh/i.test(v.name) ? 1 : 0) + (/en-us/i.test(v.lang) ? 1 : 0);
export function pickVoice(lang, prefs) {
  const l = vlist(lang); if (!l.length) return null;
  const want = prefs['voice_' + lang];
  return l.find(v => v.name === want) || [...l].sort((a, b) => vscore(b) - vscore(a))[0];
}
const hasVi = s => /[À-ỹđĐ]/.test(s);
export function clean(t, lang) {
  t = String(t || '').replace(/\((n|v|adj|adv|prep|conj|n\/v|v\/n)\)/gi, ' ').replace(/\.{2,}|…/g, ' ');
  let parts = t.split(/\s*(?:=|#|\/|:|;|\(|\)|\n)\s*/).map(x => x.trim()).filter(Boolean);
  if (lang === 'vi') { const v = parts.filter(hasVi); if (v.length) parts = v; }
  else if (lang === 'en') { const e = parts.filter(x => !hasVi(x)); if (e.length) parts = e.slice(0, 4); }
  return parts.join(', ').replace(/\b(sb|sth|s\.o|smt|Vo|Ving|V-ing|V3\/ed|V3)\b/gi, ' ').replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();
}
function utter(text, lang, prefs) {
  const u = new SpeechSynthesisUtterance(clean(text, lang));
  u.lang = lang === 'en' ? 'en-US' : 'vi-VN';
  const v = pickVoice(lang, prefs); if (v) u.voice = v;
  u.rate = lang === 'en' ? (prefs.rateEn || 0.9) : (prefs.rateVi || 1);
  return u;
}
function speak(us) {
  const go = () => us.forEach(u => speechSynthesis.speak(u));
  if (speechSynthesis.speaking || speechSynthesis.pending) { speechSynthesis.cancel(); setTimeout(go, 60); } else go();
}
/** Speak text; returns false when Vietnamese was asked for but the device has no Vietnamese voice. */
export function say(text, lang, prefs) {
  try {
    if (!text) return true;
    lang = lang || (isEn(text) ? 'en' : 'vi');
    if (lang === 'vi' && getVoices().length && !pickVoice('vi', prefs)) return false;
    speak([utter(text, lang, prefs)]);
  } catch (e) { /* speech unsupported */ }
  return true;
}
export function sayBoth(it, prefs) {
  try {
    const [en, vi] = enVi(it);
    if (getVoices().length && !pickVoice('vi', prefs)) { say(en, 'en', prefs); return false; }
    speak([utter(en, 'en', prefs), utter(vi, 'vi', prefs)]);
  } catch (e) { /* ignore */ }
  return true;
}
