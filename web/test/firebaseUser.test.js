import { describe, it, expect } from 'vitest';
import { toUser, authError, NOT_ALLOWED } from '../src/services/cloudKv.js';

describe('toUser', () => {
  it('builds a learner from the profile', () => {
    expect(toUser('u1', 'a@b.vn', { role: 'student', name: 'Giỏi' })).toEqual({ uid: 'u1', email: 'a@b.vn', name: 'Giỏi', role: 'student', learnerUid: 'u1' });
  });
  it('builds a coach linked to their learner', () => {
    expect(toUser('c1', 'c@b.vn', { role: 'coach', learnerUid: 'u1' })).toEqual({ uid: 'c1', email: 'c@b.vn', name: 'Người kèm', role: 'coach', learnerUid: 'u1' });
  });
  it('accepts the old role name "teacher"', () => {
    expect(toUser('c1', 'c@b.vn', { role: 'teacher', learnerUid: 'u1' }).role).toBe('coach');
  });
  it('refuses a missing profile, an unknown role, and a coach without a learner', () => {
    expect(() => toUser('u1', 'a@b.vn', null)).toThrow(NOT_ALLOWED);
    expect(() => toUser('u1', 'a@b.vn', { role: 'admin' })).toThrow(NOT_ALLOWED);
    expect(() => toUser('c1', 'c@b.vn', { role: 'coach' })).toThrow(NOT_ALLOWED);
  });
});

describe('authError', () => {
  it('maps Firebase codes to Vietnamese messages', () => {
    expect(authError('auth/invalid-credential')).toBe('Sai email hoặc mật khẩu');
    expect(authError('auth/network-request-failed')).toBe('Không có mạng. Kiểm tra kết nối rồi thử lại');
    expect(authError('auth/too-many-requests')).toMatch(/Thử lại sau/);
    expect(authError('auth/whatever')).toMatch(/Không đăng nhập được/);
  });
});
