export const GROUPS = [
  { id: 'tu-vung-toeic', name: 'Từ vựng TOEIC theo thẻ', desc: 'Bộ thẻ 1 – 74, mỗi thẻ 20 từ', test: t => /^T[ỪU]\s*V[ỰƯU]NG\s*TOEIC/iu.test(t) || /^thẻ\s*\d+$/iu.test(t) },
  { id: 'listening', name: 'Từ vựng Listening', desc: 'Danh sách từ vựng phần nghe', test: t => /^LIST\s/i.test(t) },
  { id: 'luyen-nghe', name: 'Luyện nghe', desc: 'Part 1 và Part 4 theo đề', test: t => /^LUYỆN NGHE/iu.test(t) },
  { id: 'part-1', name: 'Part 1 theo chủ đề', desc: 'Văn phòng, nhà hàng, giao thông…', test: t => /NGHE PHẦN 1/iu.test(t) },
  { id: 'co-ban', name: 'Từ vựng cơ bản', desc: 'Danh từ, động từ, tính từ', test: t => /^Lesson/i.test(t) },
  { id: '600', name: 'TOEIC 600 từ', desc: 'Bộ 600 từ kinh điển', test: t => /600/.test(t) },
  { id: 'dong-nghia', name: 'Từ đồng nghĩa nâng cao', desc: 'Các cặp từ thay thế hay gặp', test: t => /ĐỒNG NGHĨA/iu.test(t) },
  { id: 'ets', name: 'ETS', desc: 'Từ vựng theo đề ETS 2017 – 2024', test: t => /^ETS/i.test(t), sub: t => { const m = t.match(/ETS\s*(\d{4})/i); return m ? 'ETS ' + m[1] : 'ETS'; } },
  { id: 'economy', name: 'Economy', desc: 'Từ vựng theo đề Economy', test: t => /ECONOMY/i.test(t), sub: t => { const m = t.match(/TEST\s*(\d+)/i); return m ? 'Test ' + m[1] : 'Khác'; } },
  { id: 'ybm', name: 'YBM', desc: 'Từ vựng theo đề YBM', test: t => /^YBM/i.test(t) },
  { id: 'tnc', name: 'TNC', desc: 'Part 5, 6, 7 theo đề TNC', test: t => /^TNC/i.test(t) },
  { id: 'ngu-phap', name: 'Ngữ pháp & mẹo làm bài', desc: 'Ngữ pháp cơ bản, mẹo Part 7', test: t => /NGỮ PHÁP|CÁCH XỬ LÝ/iu.test(t) },
  { id: 'khac', name: 'Học phần khác', desc: 'Các học phần lẻ', test: () => true },
];

export const deacc = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
export const sortKey = t => deacc(t).replace(/cuoi/g, '9999').replace(/[^a-z0-9]+/g, '').replace(/^the(?=\d)/, 'tuvungtoeicthe').replace(/\d+/g, d => d.padStart(5, '0'));
export const norm = s => deacc(String(s)).replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const isEn = s => !!s && /^[\x00-\x7F’‘–—…]*$/.test(s.replace(/\s/g, ''));
export const enVi = it => (isEn(it.c[0]) || !isEn(it.c[1]) ? [it.c[0], it.c[1]] : [it.c[1], it.c[0]]);
export const ipaOf = it => (it.c[2] ? `/${it.c[2]}/` : '');
export const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

/** Shape vocab.json: sets with items keyed "setId:index" (same keys as the old page's progress). */
export function prepare(raw) {
  const sets = raw.filter(s => s.cards && s.cards.length).map(s => {
    const id = String(s.id);
    return { id, title: s.title, k: sortKey(s.title), group: GROUPS.find(g => g.test(s.title)), items: s.cards.map((c, i) => ({ c, sid: id, i, key: id + ':' + i })) };
  });
  const setMap = new Map(sets.map(s => [s.id, s]));
  const groups = new Map();
  for (const g of GROUPS) {
    const gs = sets.filter(s => s.group === g).sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
    if (gs.length) groups.set(g.id, { ...g, sets: gs, items: gs.flatMap(s => s.items) });
  }
  sets.forEach(s => { s.group = groups.get(s.group.id); });
  const all = sets.flatMap(s => s.items);
  const itemMap = new Map(all.map(it => [it.key, it]));
  return { sets, setMap, groups, all, itemMap };
}

export function counts(items, status) {
  const c = [0, 0, 0];
  for (const it of items) c[status[it.key] || 0]++;
  return c;
}
export function searchItems(all, q, limit = 300) {
  const n = norm(q);
  if (!n) return [];
  return all.filter(it => norm(it.c[0]).includes(n) || norm(it.c[1]).includes(n)).slice(0, limit);
}

let promise = null;
export function loadVocab() {
  if (!promise) {
    promise = fetch('../vocab.json').then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(prepare);
    promise.catch(() => { promise = null; });
  }
  return promise;
}
