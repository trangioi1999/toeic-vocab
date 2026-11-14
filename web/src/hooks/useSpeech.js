import { useCallback } from 'react';
import { useToast } from '../components/Toast.jsx';
import { getPrefs } from '../services/store.js';
import { say as sayRaw, sayBoth as sayBothRaw, VI_HELP } from '../lib/speech.js';

export function useSpeech() {
  const toast = useToast();
  const say = useCallback((text, lang) => { if (!sayRaw(text, lang, getPrefs())) toast(VI_HELP); }, [toast]);
  const sayBoth = useCallback(it => { if (!sayBothRaw(it, getPrefs())) setTimeout(() => toast(VI_HELP), 300); }, [toast]);
  return { say, sayBoth };
}
