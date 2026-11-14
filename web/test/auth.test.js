import { describe, it, expect, beforeEach } from 'vitest';
import { login, logout, currentUser, onAuthChange } from '../src/services/auth.js';

beforeEach(() => { localStorage.clear(); });

describe('mock auth', () => {
  it('logs the student in and persists the session', async () => {
    const u = await login('hocvien@demo.vn', '123456');
    expect(u).toMatchObject({ uid: 'student-1', role: 'student', name: 'Học viên' });
    expect(currentUser()).toMatchObject({ uid: 'student-1' });
  });
  it('accepts the teacher with any email case and spaces', async () => {
    const u = await login('  Co@Demo.vn ', '123456');
    expect(u).toMatchObject({ uid: 'teacher-1', role: 'teacher', name: 'Cô giáo' });
  });
  it('rejects a wrong password with a Vietnamese message', async () => {
    await expect(login('hocvien@demo.vn', 'x')).rejects.toThrow('Sai email hoặc mật khẩu');
    expect(currentUser()).toBe(null);
  });
  it('notifies listeners and clears on logout', async () => {
    const seen = [];
    const off = onAuthChange(u => seen.push(u && u.role));
    await login('co@demo.vn', '123456');
    await logout();
    off();
    expect(seen).toEqual(['teacher', null]);
    expect(currentUser()).toBe(null);
  });
});
