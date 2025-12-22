import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  root: path.resolve(__dirname, '.'),
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/functions': {
        target: 'https://jqbauulslmeozqqlmjjc.supabase.co',
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
});
