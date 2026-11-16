// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { LEARNER_KEYS } from '../src/services/cloudKv.js';

// No Firestore emulator here; this keeps the rules file in step with the paths the code uses.
const rules = fs.readFileSync(new URL('../../firebase/firestore.rules', import.meta.url), 'utf8');

describe('firestore.rules', () => {
  it('allows exactly the learner keys the app syncs', () => {
    const m = rules.match(/key in \[([^\]]+)\]/);
    expect(m[1].split(',').map(s => s.trim().replace(/'/g, ''))).toEqual(LEARNER_KEYS);
  });
  it('covers every collection the app and Worker use', () => {
    for (const c of ['/users/{uid}', '/learners/{learner}/data/{key}', '/userSettings/{uid}', '/pushTokens/{uid}', '/notifyLog/{uid}']) expect(rules).toContain(c);
  });
  it('never lets a client write a profile (roles are set by hand)', () => {
    expect(rules).toMatch(/match \/users\/\{uid\} \{[^}]*allow write: if false;/);
  });
});
