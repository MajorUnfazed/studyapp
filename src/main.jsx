import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);

// PWA registration
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true, onRegisteredSW: () => {}, onNeedRefresh: () => {}, onOfflineReady: () => {} });
  }).catch(() => {});
}
