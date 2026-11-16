/** Account roles. The first React app stored "teacher"; it is read as "coach". */
export function normalizeRole(r) {
  if (r === 'student') return 'student';
  if (r === 'coach' || r === 'teacher') return 'coach';
  return null;
}

export const homeOf = role => (role === 'coach' ? '/coach' : '/today');

const NOT_TARGETS = ['/', '/login', '/signup', '/import'];

/** Where to go after login: the requested page if it is safe and belongs to the role, else home. */
export function safeNext(next, role) {
  const home = homeOf(role);
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return home;
  const path = next.split(/[?#]/)[0];
  if (NOT_TARGETS.includes(path)) return home;
  const coachArea = path === '/coach' || path.startsWith('/coach/');
  return coachArea === (role === 'coach') ? next : home;
}
