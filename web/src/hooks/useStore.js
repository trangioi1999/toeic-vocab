import { useSyncExternalStore } from 'react';
import { subscribe } from '../services/store.js';

/** Re-render when the store changes. `read` must return a stable value (store getters do). */
export const useStore = read => useSyncExternalStore(subscribe, read);
