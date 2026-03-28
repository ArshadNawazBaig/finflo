import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['html5-qrcode', 'qrcode.react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'framer-motion'],
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
    ],
    hmr: true,
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
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        try {
          if (req.url) {
            decodeURI(req.url);
          }
          next();
        } catch (e) {
          if (e instanceof URIError) {
            console.warn('Malformed URI detected, redirecting to root:', req.url);
            req.url = '/';
            next();
          } else {
            next(e);
          }
        }
      });
    },
  },
});
