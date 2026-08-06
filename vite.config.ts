import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  // Указываем Vite правильно собирать пути для папки вашего репозитория
  base: './', 
  
  plugins: [
    solidPlugin()
  ],
  
  server: {
    port: 3000,
    host: true
  },
  
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser'
  }
});
