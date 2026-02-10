import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from '@/context/ThemeContext';

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
