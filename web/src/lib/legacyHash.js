/** Old single-page hashes (#set-ID, #g-ID, #s4=…) → routes of the new app. */
export function legacyToRoute(hash) {
  if (!hash || hash.startsWith('#/')) return null;
  let m;
  if ((m = hash.match(/^#set-([\w-]+)$/))) return '/vocab/set/' + m[1];
  if ((m = hash.match(/^#g-([\w-]+)$/))) return '/vocab/g/' + m[1];
  if (hash.startsWith('#s4=')) return '/plan?s4=' + hash.slice(4);
  return null;
}

const OLD = /<a href="https:\/\/trangioi1999\.github\.io\/toeic-vocab\/#(set|g)-([\w-]+)"[^>]*>/g;
/** Plan task HTML links to the old vocab page; point them at the in-app routes instead. */
export const rewritePlanLinks = html =>
  String(html).replace(OLD, (_, kind, id) => `<a href="#/vocab/${kind === 'set' ? 'set' : 'g'}/${id}">`);
