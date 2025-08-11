import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://192.168.199.11:8554',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/download'),
      },
    },
  },
});