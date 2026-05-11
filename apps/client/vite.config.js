import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom plugin to handle malformed URIs
function uriSanitizer() {
  return {
    name: 'uri-sanitizer',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        try {
          if (req.url) {
            decodeURI(req.url);
          }
          next();
        } catch (e) {
          if (e.name === 'URIError' || e instanceof URIError) {
            console.warn('[Vite] Malformed URI detected:', req.url);

            // Sanitize the URL: replace lone % with %25 if not part of a valid hex sequence
            const sanitizedUrl = req.url.replace(/%(?![0-9a-fA-F]{2})/g, '%25');

            if (sanitizedUrl !== req.url) {
              console.warn(`[Vite] Sanitized URI to: ${sanitizedUrl}`);
              req.url = sanitizedUrl;
              if (req.originalUrl) req.originalUrl = sanitizedUrl;
              next();
            } else {
              // Fallback for other malformed URI edge cases
              console.warn('[Vite] Sanitization failed, redirecting to root');
              req.url = '/';
              if (req.originalUrl) req.originalUrl = '/';
              next();
            }
          } else {
            next(e);
          }
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), uriSanitizer()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['html5-qrcode', 'qrcode.react'],
    exclude: ['Dockerfile'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — always needed
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI primitives loaded on most pages
          'vendor-ui': ['lucide-react', '@headlessui/react'],
          // Radix primitives
          'vendor-radix': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-tooltip',
          ],
          // Animation — only dashboard/landing
          'vendor-motion': ['framer-motion'],
          // Charts — only Reports/Dashboard
          'vendor-charts': ['recharts'],
          // PDF export — only triggered on demand
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          // 3D / Three.js — only landing page scenes
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          // Realtime — only chat/notifications
          'vendor-socket': ['socket.io-client'],
          // Form utilities
          'vendor-forms': ['react-hook-form'],
          // Date utilities
          'vendor-dates': ['date-fns', 'react-day-picker'],
          // State management
          'vendor-state': ['jotai'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5174,
    host: true,
    allowedHosts: [
      'client-production-aea57.up.railway.app',
      'finflo-production.up.railway.app',
      'app.finflo.org',
      'finflo.org',
      'www.finflo.org',
    ],
    hmr: true,
    fs: {
      // Deny access to non-source files to prevent Vite from parsing them
      deny: ['Dockerfile', 'nginx.conf', '.env', '.env.*'],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
        ws: true, // proxy WebSocket connections for Socket.io
      },
      '/downloads': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
