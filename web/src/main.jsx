import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { legacyToPath } from './lib/legacyHash.js';
import './styles/tokens.css';
import './styles/base.css';

// Old links (#set-ID, #g-ID, #s4=…, #/…) become clean paths before the router starts.
const legacy = legacyToPath(location.hash);
if (legacy) history.replaceState(null, '', legacy);

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
