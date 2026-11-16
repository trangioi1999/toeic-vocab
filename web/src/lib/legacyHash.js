/** Old hash links → clean paths: the first single page (#set-ID, #g-ID, #s4=…) and the hash-router app (#/…). */
export function legacyToPath(hash) {
  if (!hash) return null;
  let m;
  if ((m = hash.match(/^#set-([\w-]+)$/))) return '/vocab/set/' + m[1];
  if ((m = hash.match(/^#g-([\w-]+)$/))) return '/vocab/g/' + m[1];
  if (hash.startsWith('#s4=')) return '/plan?s4=' + hash.slice(4);
  if (hash.startsWith('#/')) {
    const p = hash.slice(1);
    if (p === '/') return '/today';
    if (p === '/teacher' || p.startsWith('/teacher/')) return '/coach' + p.slice('/teacher'.length);
    return p;
  }
  return null;
}

const OLD = /<a href="https:\/\/trangioi1999\.github\.io\/toeic-vocab\/#(set|g)-([\w-]+)"[^>]*>/g;
/** Plan task HTML links to the old vocab page; point them at the in-app routes instead. */
export const rewritePlanLinks = html =>
  String(html).replace(OLD, (_, kind, id) => `<a href="/vocab/${kind === 'set' ? 'set' : 'g'}/${id}">`);
