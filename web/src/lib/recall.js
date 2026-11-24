import { DAYS, dayOf } from './plan.js';

/** Share of right answers needed to pass the check on the previous study day's cards. */
export const RECALL_PASS = 0.8;

const LINK = /<a href="[^"]*#set-([\w-]+)"[^>]*>(.*?)<\/a>/g;
/** Card sets a plan day assigns, from the links in its task text: [{ id, name }]. */
export const setsOf = day => (day ? [...day.tasks.join(' ').matchAll(LINK)].map(m => ({ id: m[1], name: m[2].replace(/<[^>]+>/g, '') })) : []);

/**
 * The check due on a date: the sets of the last plan day before it that assigned sets
 * (Sunday and rest days assign none, so Monday checks Saturday). Null when the date assigns no sets itself
 * or nothing came before it.
 */
export function recallFor(iso) {
  const day = dayOf(iso);
  if (!setsOf(day).length) return null;
  for (let i = DAYS.indexOf(day) - 1; i >= 0; i--) {
    const sets = setsOf(DAYS[i]);
    if (sets.length) return { from: DAYS[i].date, sets };
  }
  return null;
}

export const recallNeeded = total => Math.ceil(total * RECALL_PASS);
export const recallPassed = r => !!r && r.total > 0 && r.right >= recallNeeded(r.total);

/** Keep the best attempt of the day (ties go to the newer one) and count every try. */
export function bestRecall(prev, next) {
  const tries = ((prev && prev.tries) || 0) + 1;
  const score = r => r.right / r.total;
  const keep = prev && prev.total > 0 && score(prev) > score(next) ? prev : next;
  return { ...keep, tries };
}
