import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { legacyToRoute } from './lib/legacyHash.js';
import './styles/tokens.css';
import './styles/base.css';

// Old links (#set-ID, #g-ID, #s4=…) still work: translate them before the router reads the hash.
const fixLegacyHash = () => {
  const legacy = legacyToRoute(location.hash);
  if (legacy) history.replaceState(null, '', location.pathname + location.search + '#' + legacy);
};
fixLegacyHash();
// The router listens to popstate; capture-phase listeners on window run before it.
window.addEventListener('popstate', fixLegacyHash, true);
window.addEventListener('hashchange', fixLegacyHash, true);

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
