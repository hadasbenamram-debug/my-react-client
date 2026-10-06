import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    // תומך גם בקבצי .tsx בתיקיית src/pages (שהגיעו מפרויקט "secound")
    esbuild: {
        loader: 'tsx'
    },
    optimizeDeps: {
        esbuildOptions: {
            loader: { '.js': 'jsx' }
        }
    },
    server: {
        port: 5174,        
        strictPort: true,   
        proxy: {
            '/api': {
                target: 'https://localhost:7295', // עדכן לפורט הנכון שמופיע ב-Swagger
                changeOrigin: true,
                secure: false,
            }
        }
    }
});