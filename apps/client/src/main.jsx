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

// Handle ChunkLoadError (common after deployment when old assets are removed)
window.addEventListener(
  'error',
  (e) => {
    if (
      e.message?.includes('Loading chunk') ||
      e.message?.includes('CSS chunk')
    ) {
      const lastReload = sessionStorage.getItem('last-chunk-reload');
      const now = Date.now();
      // Only reload if we haven't reloaded in the last 10 seconds (prevent loops)
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem('last-chunk-reload', now.toString());
        window.location.reload();
      }
    }
  },
  true,
);

// Global Unhandled Rejection Handler for silent startup crashes
window.addEventListener('unhandledrejection', (event) => {
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
