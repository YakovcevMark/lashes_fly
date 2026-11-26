import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '');
  if (
    process.env.PAGES_BASE_PATH &&
    env.VITE_API_BASE_URL &&
    new URL(env.VITE_API_BASE_URL).protocol !== 'https:'
  ) {
    throw new Error('GitHub Pages requires an absolute HTTPS VITE_API_BASE_URL.');
  }
  return {
    plugins: [react()],
    base: process.env.PAGES_BASE_PATH || '/',
    envDir: root,
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router'],
            material: ['@mui/material'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@src': fileURLToPath(new URL('./src', import.meta.url)),
        '@api': fileURLToPath(new URL('./src/api', import.meta.url)),
        '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
        '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: { '/api/v1': { target: `http://127.0.0.1:${env.PORT || 3000}` } },
    },
  };
});
