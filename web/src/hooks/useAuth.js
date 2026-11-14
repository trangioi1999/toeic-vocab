import { useSyncExternalStore } from 'react';
import { currentUser, onAuthChange, login, logout } from '../services/auth.js';

export function useAuth() {
  const user = useSyncExternalStore(onAuthChange, currentUser);
  return { user, login, logout };
}
