import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 5213, strictPort: true },
  preview: { host: '0.0.0.0', port: 4213, strictPort: true },
});
