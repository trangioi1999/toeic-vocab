import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Splash from './components/Splash.jsx';
import { legacyToPath } from './lib/legacyHash.js';
import { loadConfig } from './services/config.js';
import './styles/tokens.css';
import './styles/base.css';

// Old links (#set-ID, #g-ID, #s4=…, #/…) become clean paths before the router starts.
const legacy = legacyToPath(location.hash);
if (legacy) history.replaceState(null, '', legacy);

const root = createRoot(document.getElementById('root'));
root.render(<Splash />);

// Pick the backend before the app renders: mock (no Firebase variables) or Firebase.
async function boot() {
  const cfg = await loadConfig();
  if (cfg.firebase) {
    const fb = await import('./services/firebase.js');
    await fb.start(cfg);
  }
}
boot().then(
  () => root.render(<React.StrictMode><App /></React.StrictMode>),
  () => root.render(<Splash error="Không mở được app. Kiểm tra mạng rồi thử lại." onRetry={() => location.reload()} />),
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
