import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from '@/context/ThemeContext';

// NOTE: canonical-domain enforcement (www ↔ apex) must happen at the
// hosting/CDN layer, not here. A client-side window.location.replace from
// www → apex collides with any hosting-layer redirect going the other
// direction and creates an infinite refresh loop. Configure the canonical
// in Vercel/Cloudflare/etc. and let the platform 301 once.

// Stale-chunk recovery: after a new deploy, old hashed chunk URLs 404 and the
// server returns index.html, so dynamic imports fail with a MIME-type error
// ("'text/html' is not a valid JavaScript MIME type"). Reload once — guarded
// against loops, and sharing its key with ErrorBoundary so we never double-reload.
const reloadOnceForStaleChunk = () => {
  try {
    const KEY = 'chunk-reload-at';
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    }
  } catch {
    window.location.reload();
  }
};

const isStaleChunkMessage = (msg = '') =>
  /Loading chunk|CSS chunk|dynamically imported module|Importing a module script failed|valid JavaScript MIME type/i.test(
    msg || '',
  );

// Vite emits this when a dynamically-imported module fails to preload/load.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  reloadOnceForStaleChunk();
});

window.addEventListener(
  'error',
  (e) => {
    if (isStaleChunkMessage(e.message)) reloadOnceForStaleChunk();
  },
  true,
);

// Global Unhandled Rejection Handler for silent startup crashes
window.addEventListener('unhandledrejection', (event) => {
  if (isStaleChunkMessage(event.reason?.message)) {
    reloadOnceForStaleChunk();
    return;
  }
  console.error('🔥 CRITICAL: Unhandled Promise Rejection:', event.reason);
  if (import.meta.env.DEV) {
    console.warn('Startup might be stuck due to above error.');
  }
});

// Service Worker Registration Handler
const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  const isCapacitor =
    !!window.Capacitor ||
    (window.webkit &&
      window.webkit.messageHandlers &&
      window.webkit.messageHandlers.bridge);

  const isProd = import.meta.env.PROD;

  if (isProd && !isCapacitor) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('✅ PWA: Service Worker Active', reg.scope))
        .catch((err) => console.error('❌ PWA: Service Worker Failed', err));
    });
  } else {
    // Unregister in Dev or Capacitor to prevent cache conflicts
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
        console.log('🔧 SW: Unregistered to avoid environment conflicts');
      });
    });
  }
};

registerServiceWorker();

import { GoogleOAuthProvider } from '@react-oauth/google';
import { HelmetProvider } from 'react-helmet-async';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <GoogleOAuthProvider
        clientId={import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || ''}
      >
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          <App />
        </ThemeProvider>
      </GoogleOAuthProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
