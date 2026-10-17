
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://localhost:7295',
        changeOrigin: true,
        secure: false,
      },
      // SignalR (התראות ומיקום בזמן אמת) - כולל WebSocket
      '/notificationHub': {
        target: 'https://localhost:7295',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // תמונות התרומות
      '/images': {
        target: 'https://localhost:7295',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
