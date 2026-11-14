import { enVi } from '../../../lib/vocab.js';
export const frontOf = (it, prefs) => { const [en, vi] = enVi(it); return prefs.front === 'vi' ? { t: vi, lang: 'vi' } : { t: en, lang: 'en' }; };
export const backOf = (it, prefs) => { const [en, vi] = enVi(it); return prefs.front === 'vi' ? { t: en, lang: 'en' } : { t: vi, lang: 'vi' }; };
export const lg = t => (String(t || '').length > 70 ? ' long' : '');
export const ST_LABEL = ['Chưa học', 'Đang học', 'Đã thuộc'];
export const ST_CLS = ['', 'l', 'k'];
