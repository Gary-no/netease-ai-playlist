import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // 前端 /api 请求代理到后端 Express
      '/api': 'http://localhost:3000',
    },
  },
});
